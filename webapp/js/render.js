circular.use('render', ['bus', 'config'], function(bus, config) {
  // useful constants
  var w = config.render.width;
  var h = config.render.height;
  var noteNames = config.notes.names;
  var beginNote = config.notes.range.begin;
  var endNote = config.notes.range.end; // excluded
  var nNotes = endNote - beginNote;
  var wNote = Math.floor((w - 1) / nNotes); // incl right border
  var hNoteName = wNote;
  var hNotePressed = wNote;
  var hNoteStatic = h - hNoteName - hNotePressed;
  var hBlackNotes = Math.floor(2 * (hNoteStatic - 2) / 3);

  // setup canvas
  var ctx = document.getElementById('render').getContext('2d');
  ctx.canvas.width = w;
  ctx.canvas.height = h;

  function drawContourNotes() {
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    ctx.strokeRect(0, 0, nNotes * wNote, hNoteStatic + hNotePressed);
    ctx.moveTo(0, hNoteStatic);
    ctx.lineTo(nNotes * wNote - 1, hNoteStatic);
    for (var i = 1; i < nNotes; ++i) {
      ctx.moveTo(i * wNote, 0);
      ctx.lineTo(i * wNote, hNoteStatic + hNotePressed - 1);
    }
    ctx.stroke();
  }

  function isBlack(note) {
    var name = noteNames[note];
    return name[name.length - 2] == '#';
  }

  function drawBlackNotes() {
    ctx.fillStyle = 'black';
    for (var i = 1; i < nNotes; ++i) {
      if (isBlack(beginNote + i)) {
        ctx.fillRect(i * wNote + 1, 1, wNote - 2, hBlackNotes);
      }
    }
  }

  // return a color between white & red
  // amplitude == 0 => white
  // amplitude == 1 => red
  function pressedColor(amplitude) {
    var gb = 255 - Math.floor(255 * amplitude);
    return 'rgb(255,' + gb + ',' + gb + ')';
  }

  // amplitudes must have values between 0 and 1
  function drawPressedNotes(amplitudes) {
    for (var i = 0; i < nNotes; ++i) {
      ctx.fillStyle = 'white';
      ctx.fillRect(i * wNote + 1, hNoteStatic + 1, wNote - 2, hNotePressed - 2);
    }
    for (var note in amplitudes) {
      if (note >= beginNote && note < endNote) {
        ctx.fillStyle = pressedColor(amplitudes[note]);
        ctx.fillRect((note - beginNote) * wNote + 1, hNoteStatic + 1, wNote - 2, hNotePressed - 2);
      }
    }
  }

  function drawNoteNames() {
    ctx.font = Math.floor((wNote - 1) / 2) + 'px courier';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black';
    var x0 = 1 + Math.floor((wNote - 1) / 2);
    var y = hNoteStatic + hNotePressed + Math.floor(hNoteName / 2) - 1;
    for (var note = beginNote; note < endNote; ++note) {
      ctx.fillText(noteNames[note], x0 + wNote * (note - beginNote), y);
    }
  }

  // full static draw
  drawContourNotes();
  drawBlackNotes();
  drawNoteNames();

  divAvWAF = document.getElementById('averageWAF');
  divAvFFT = document.getElementById('averageFFT');
  divPeaks = document.getElementById('peaks');
  function draw(notes, averageWAF, averageFFT) {
    drawPressedNotes(notes);
    divAvWAF.innerHTML = 'averageWAF: ' + averageWAF;
    divAvFFT.innerHTML = 'averageFFT: ' + averageFFT;
    divPeaks.innerHTML = 'peaks:</br>';
    for (var note in notes) {
      divPeaks.innerHTML += noteNames[note] + ': ' + notes[note] + '</br>';
    }
  }

  bus.sub('pitch', draw);
});
