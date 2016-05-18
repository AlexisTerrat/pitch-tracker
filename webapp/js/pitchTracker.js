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

  // bufferSize power of 2
  // paddedBufferSize power of 2
  // fftSize = paddedBufferSize / 2
  // need fMax in fft = fMax (interested in) * (nHarmonics + 1)
  // cepSize = fftSize/2
  // hpsSize = fftSize/(nHarmonics + 1) -> maybe interpolate fft to get cepSize == hpsSize and avoid really big padding (later)
  // need df (in cep & hps) <= 1 semitone (for min interesting frequency)
  // need also fMax in hps & cep >= fMax(endNote - 1)

  // relation between spectrum buffer index & frequency:
  // F[i] = i * sampleRate / fftSize (with fftSize = 2 * fftBufferSize)
  // and max frequency = fNyquist = sampleRate / 2

  // constants
  var inSampleRate, processSampleRate, downSamplingFactor; // defined at start
  var inBufferSize = config.audio.bufferSize;
  var nHarmonics = config.pitchTracker.nHarmonics;
  var F = notes.F, T = notes.T;
  var df = notes.df; // F[i+1] = F[i] * df
  var fMax = notes.F[notes.nNotes - 1];
  var fMin = notes.F[0];
  var fRes = fMin * (df - 1); // resolution needed in hps & cepstrum
  var nNotes = notes.nNotes;

  // buffers
  var adaptedBuffer, adaptedBufferSize, // downsampled, windowed & padded
      fftBuffer, fftBufferSize,
      cepBuffer, cepBufferSize,
      hpsBuffer, hpsBufferSize,
      noteCepBuffer, noteHpsBuffer, noteScoreBuffer; // cep, hps & cbhps (score) indexed by note

  // processors
  var downSampler, hamming, fft, cepstrum, hps;

  function startPitchTracker() {
    inSampleRate = audio.context.sampleRate;
    // TODO
    hpsBufferSize = inBufferSize / 2;
    fftBufferSize = nHarmonics * hpsBuffersize;
    cepBufferSize = fftBufferSize / 2;
    paddedBufferSize = 2 * fftBufferSize;
    bus.sub('audio.data', processAudioData);
  }

  function stopPitchTracker() {
    bus.unsub('audio.data', processAudioData);
  }

  function processAudioData(audioData) {

    bus.pub('pitch.data', TODO);
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
