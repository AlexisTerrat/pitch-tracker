circular.use('pitchTracker', ['bus', 'dsp', 'notes', 'audio', 'config'], function PitchTracker(bus, dsp, notes, audio, config) {
  // algo idea: cepstrum biased harmonic product spectrum
  // - resample to get new sampleRate = 2 * fMax * nHarmonics to avoid wasted computation in fft & cepstrum
  // - apply hamming window
  // - pad to get semi tone precision in hps & cepstrum
  // - fft
  // - hps
  // - cepstrum <=> fft(log(fft))
  // - fic (frequency indexed cepstrum)
  // - score = hps * fic
  // - loop:
  //   - find max (maybe +trick if one octave too high)
  //   - "remove" max & its harmonics
  // - end loop

  // relation between spectrum buffer index & frequency:
  // F[i] = i * sampleRate / fftSize (with fftSize = 2 * fftBufferSize)
  // and max frequency = fNyquist = sampleRate / 2

  // constants
  var inSampleRate, processSampleRate, downSamplingFactor; // defined at start
  var inBufferSize = config.audio.bufferSize;
  var nHarmonics = config.pitchTracker.nHarmonics;
  var F = notes.F, T = notes.T;
  var df = notes.df; // F[i+1] = F[i] * df
  var fMax = notes.F[notes.nNotes - 1] * df; // excluded
  var fMin = notes.F[0];
  var fRes = fMin * (df - 1); // frequency resolution needed for hps
  var nNotes = notes.nNotes;

  // buffers
  var adaptedBuffer, windowSize, adaptedBufferSize, // downsampled, windowed & padded
      fftBuffer, fftBufferSize,
      cepBuffer, cepBufferSize,
      hpsBuffer, hpsBufferSize,
      noteCepIndexMap, // map note index to cepBuffer index
      noteHpsIndexMap, // map note index to cepBuffer index
      noteCepBuffer,
      noteHpsBuffer,
      noteScoreBuffer; // cep, hps & cbhps (score) indexed by note

  // processors
  var downSampler, hamming, fft, cepstrum, hps;

  function startPitchTracker() {
    inSampleRate = audio.context.sampleRate;
    downSamplingFactor = 2 * nHarmonics * fMax / inSampleRate;
    processSampleRate = downSamplingFactor * inSampleRate;
    downSampler = dsp.DownSampler(inBufferSize, downSamplingFactor);
    windowSize = downSampler.destLength;
    hamming = dsp.Hamming(windowSize);
    fftBufferSize = ceilPow2(processSampleRate / (2 * fRes));
    adaptedBufferSize = 2 * fftBufferSize;
    fft = dsp.FFT(adaptedBufferSize);
    cepBufferSize = adaptedBufferSize;
    cepstrum = dsp.Cepstrum(fftBufferSize);
    hps = dsp.HPS(fftBufferSize, nHarmonics);
    hpsBufferSize = hps.destLength;

    adaptedBuffer = new Float32Array(adaptedBufferSize);
    fftBuffer = new Float32Array(fftBufferSize);
    cepBuffer = new Float32Array(cepBufferSize);
    hpsBuffer = new Float32Array(hpsBufferSize);
    noteFftBuffer = new Float32Array(nNotes); // (uses map index from hps)
    noteCepIndexMap = new Uint16Array(nNotes);
    noteCepBuffer = new Float32Array(nNotes);
    noteHpsIndexMap = new Uint16Array(nNotes);
    noteHpsBuffer = new Float32Array(nNotes);
    noteScoreBuffer = new Float32Array(nNotes);

    var iHps, iCep, f, t;
    for (var iNote = 0; iNote < nNotes; ++iNote) {
      f = F[iNote];
      iHps = Math.round((2 * fftBufferSize / processSampleRate) * f);
      if (iHps >= hpsBufferSize) { iHps = hpsBufferSize - 1; } // probably useless
      noteHpsIndexMap[iNote] = iHps;

      t = T[iNote];
      iCep = Math.round(processSampleRate * t);
      if (iCep >= cepBufferSize) { iCep = cepBufferSize - 1; } // probably useless
      noteCepIndexMap[iNote] = iCep;
    }

    bus.sub('audio.data', processAudioData);
    console.log('pitchTracker started');
    console.log('   input sample rate :', inSampleRate);
    console.log(' process sample rate :', processSampleRate);
    console.log(' downSampling factor :', downSamplingFactor);
    console.log('            freq min :', fMin);
    console.log('            freq max :', fMax);
    console.log('    freq resuolution :', fRes);
    console.log('         n harmonics :', nHarmonics);
    console.log('             n notes :', nNotes);
    console.log('   input buffer size :', inBufferSize);
    console.log('         window size :', windowSize);
    console.log('  padded buffer size :', adaptedBufferSize);
    console.log('     fft buffer size :', fftBufferSize);
    console.log('cepstrum buffer size :', cepBufferSize);
    console.log('     hps buffer size :', hpsBufferSize);
  }

  function stopPitchTracker() {
    bus.unsub('audio.data', processAudioData);
  }

  function processAudioData(inBuffer) {
    downSampler.run(inBuffer, adaptedBuffer);
    hamming.run(adaptedBuffer, adaptedBuffer);
    fft.run(adaptedBuffer, fftBuffer);
    hps.run(fftBuffer, hpsBuffer);

    // TODO cepstrum from spectrum and not from sample
    // ie fftBuffer : log -> ifft -> cepBuffer
    // and with a size matching hpsBufferSize ?
    cepstrum.run(adaptedBuffer, cepBuffer);

    // compute score and normalize
    var i,
        fftMag, minFft = 10000, maxFft = -10000, rangeFft,
        hpsMag, minHps = 10000, maxHps = -10000, rangeHps,
        cepMag, minCep = 10000, maxCep = -10000, rangeCep,
        score, minScore = 10000, maxScore = -10000, rangeScore;
    for (i = 0; i < nNotes; ++i) {
      fftMag = fftBuffer[noteHpsIndexMap[i]];
      noteFftBuffer[i] = fftMag;
      if (fftMag < minFft) { minFft = fftMag; }
      if (fftMag > maxFft) { maxFft = fftMag; }

      hpsMag = hpsBuffer[noteHpsIndexMap[i]];
      noteHpsBuffer[i] = hpsMag;
      if (hpsMag < minHps) { minHps = hpsMag; }
      if (hpsMag > maxHps) { maxHps = hpsMag; }

      cepMag = cepBuffer[noteCepIndexMap[i]];
      noteCepBuffer[i] = cepMag;
      if (cepMag < minCep) { minCep = cepMag; }
      if (cepMag > maxCep) { maxCep = cepMag; }

      score = cepMag * hpsMag;
      noteScoreBuffer[i] = score;
      if (score < minScore) { minScore = score; }
      if (score > maxScore) { maxScore = score; }
    }
    rangeFft = maxFft - minFft;
    rangeHps = maxHps - minHps;
    rangeCep = maxCep - minCep;
    rangeScore = maxScore - minScore;
    for (i = 0; i < nNotes; ++i) {
      noteFftBuffer[i] = Math.min(1, Math.max(0, (noteFftBuffer[i] - minFft) / rangeFft));
      noteHpsBuffer[i] = Math.min(1, Math.max(0, (noteHpsBuffer[i] - minHps) / rangeHps));
      noteCepBuffer[i] = Math.min(1, Math.max(0, (noteCepBuffer[i] - minCep) / rangeCep));
      noteScoreBuffer[i] = Math.min(1, Math.max(0, (noteScoreBuffer[i] - minScore) / rangeScore));
    }
    bus.pub('pitch.data', [noteFftBuffer, noteHpsBuffer, noteCepBuffer, noteScoreBuffer], {
      minFft: minFft,
      maxFft: maxFft,
      minHps: minHps,
      maxHps: maxHps,
      minCep: minCep,
      maxCep: maxCep,
      minScore: minScore,
      maxScore: maxScore
    });
  }

  bus.sub('audio.start', startPitchTracker);
  bus.sub('audio.stop', stopPitchTracker);

  /******************\
  |* UTIL FUNCTIONS *|
  \******************/

   // return the lowest power of 2 bigger than x
   function ceilPow2(x) {
     return Math.pow(2, Math.ceil(Math.log(x) / Math.LN2));
   }

   // u got the idea
   function floorPow2(x) {
     return Math.pow(2, Math.floor(Math.log(x) / Math.LN2));
   }
});
