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
      noteCepBuffer, // TODO
      noteHpsBuffer, // TODO
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
    hps = dsp.HPS(fftBufferSize);
    hpsBufferSize = hps.destLength;

    adaptedBuffer = new Float32Array(adaptedBufferSize);
    fftBuffer = new Float32Array(fftBufferSize);
    cepBuffer = new Float32Array(cepBufferSize);
    hpsBuffer = new Float32Array(hpsBufferSize);
    noteCepIndexMap = new Uint16Array(nNotes);
    noteHpsIndexMap = new Uint16Array(nNotes);
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
    }

    bus.sub('audio.data', processAudioData);
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
    var mag, minMag = 10000, maxMag = -10000, rangeMag, i;
    for (i = 0; i < nNotes; ++i) {
      mag = cepBuffer[noteCepIndexMap[i]] * hpsBuffer[noteHpsIndexMap[i]];
      noteScoreBuffer[i] = mag;
      if (mag < minMag) { minMag = mag; }
      if (mag > maxMag) { maxMag = mag; }
    }
    rangeMag = maxMag - minMag;
    for (i = 0; i < nNotes; ++i) {
      noteScoreBuffer[i] = (noteScoreBuffer[i] - minMag) / rangeMag;
    }
    bus.pub('pitch.data', [noteScoreBuffer]);
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
