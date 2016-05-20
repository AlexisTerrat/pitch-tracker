circular.use('config', function() {
  return {
    notes: {
      range: {
        begin: 17, // min 0
        end: 64 // max 88 (excluded)
      }
    },
    audio: {
      bufferSize: 2048
    },
    pitchTracker: {
      nHarmonics: 5 // make sure that nHarmonics * f(notes.range.end) < sampleRate / 2
    },
    ui: {
      width: window.innerWidth - 10,
      height: 500,
      nDisplayedArrays: 4
    }
  };
});
