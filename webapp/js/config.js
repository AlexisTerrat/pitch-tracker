circular.use('config', function() {
  // note freq = 440 * r^n
  // where r = pow(2, 1/12) (factor between 2 semitones)
  // n : number of semitones between the note and A4

  // in standard representation i = 1 for A0 -> i = 88 for C8
  // here i goes from 0 to 87 (so i = 48 for A4)
  // so  note freq = 440 * pow(2, (i - 48) / 12)
  var baseNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var names = [];
  var frequencies = [];
  var baseNote, octave;
  for (var i = 0; i < 88; ++i) {
    baseNote = (i - 3) % 12; // because the octave starts at C and not A :P
    if (baseNote < 0) {
      baseNote += 12;
    }
    octave = 1 + Math.floor((i - 3) / 12);
    names.push(baseNames[baseNote] + octave);
    frequencies.push(440 * Math.pow(2, (i - 48) / 12));
  }

  return {
    notes: {
      baseNames: baseNames,
      frequencies: frequencies,
      names: names,
      range: {
        begin: 15,
        end: 64
        //begin: 0,
        //end: 88
      }
    },
    pitchTracker: {
      nPeriods: 2, // better >= 2, decrease to lower latency (need > 1),
      nNotes: 10
    },
    render: {
      width: window.innerWidth,
      height: 200
    }
  };
});
