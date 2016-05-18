circular.use('config', function() {
  return {
    notes: {
      range: {
        begin: 15, // min 0
        end: 64 // max 88 (excluded)
      }
    },
    audio: {
      bufferSize: 1024
    },
    pitchTracker: {
      nHarmonics: 3 // need nHarmonics = 2^n-1
    }
    ui: {
      width: window.innerWidth - 10,
      height: 300,
      nDisplayedArrays: 5
    }
  };
});
