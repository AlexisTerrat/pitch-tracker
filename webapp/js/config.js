circular.use('config', function() {
  return {
    notes: {
      range: {
        begin: 27, // min 0
        end: 64 // max 88 (excluded)
      }
    },
    audio: {
      bufferSize: 1024
    },
    pitchTracker: {
      nHarmonics: 3 // make sure that nHarmonics * f(notes.range.end) < sampleRate / 2
    },
    ui: {
      width: window.innerWidth - 10,
      height: 300,
      nDisplayedArrays: 1
    }
  };
});
