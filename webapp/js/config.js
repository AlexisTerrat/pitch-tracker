circular.use('config', function() {
  return {
    notes: {
      range: {
        begin: 28, // min 0
        end: 65 // max 88 (excluded)
      }
    },
    audio: {
      bufferSize: 1024
    },
    pitchTracker: {
      nHarmonics: 3,
      maxUpSamplingFactor: 10
    }
    ui: {
      width: window.innerWidth - 10,
      height: 300,
      nDisplayedArrays: 5
    }
  };
});
