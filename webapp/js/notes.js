circular.use('notes', ['config'], function Notes(config) {
  var notes = {};

  // note freq = 440 * r^n
  // where r = pow(2, 1/12) (factor between 2 semitones)
  // n : number of semitones between the note and A4

  // in standard representation i = 1 for A0 -> i = 88 for C8
  // here i goes from 0 to 87 (so i = 48 for A4)
  // so  note freq = 440 * pow(2, (i - 48) / 12)
  notes.baseNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  notes.names = [];
  notes.begin = config.notes.range.begin;
  notes.end = config.notes.range.end;
  notes.nNotes = notes.end - notes.begin;
  notes.F = new Float32Array(notes.nNotes);
  notes.T = new Float32Array(notes.nNotes);
  notes.df = Math.pow(2, 1 / 12);
  var baseNote, octave, note, f;
  for (var i = 0; i < notes.nNotes; ++i) {
    note = notes.begin + i;
    baseNote = (note - 3) % 12; // because the octave starts at C and not A :P
    if (baseNote < 0) {
      baseNote += 12;
    }
    octave = 1 + Math.floor((note - 3) / 12);
    notes.names.push(notes.baseNames[baseNote] + octave);
    f = 440 * Math.pow(df, (note - 48));
    notes.F[i] = f;
    notes.T[i] = 1 / f;
  }
  return notes;
});
