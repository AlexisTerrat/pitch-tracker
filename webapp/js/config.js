circular.use('config', function() {
  return {
    notes: {
      range: {
        begin: 3, // min 0
        end: 52 // max 88 (excluded)
      }
    },
    audio: {
      bufferSize: 1024
    },
    pitchTracker: {
      nHarmonics: 4 // make sure that nHarmonics * f(notes.range.end) < sampleRate / 2
    },
    ui: {
      width: window.innerWidth - 10,
      height: 500,
      nDisplayedArrays: 4
    }
  };
});
