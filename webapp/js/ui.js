circular.use('ui', ['bus', 'config'], function(bus, config) {
  // useful constants
  var w = config.render.width;
  var h = config.render.height;
  var nAmplitudes = config.render.nAmplitudes;
  var noteNames = config.notes.names;
  var beginNote = config.notes.range.begin;
  var endNote = config.notes.range.end; // excluded
  var nNotes = endNote - beginNote;
  var wNote = Math.floor((w - 1) / nNotes); // incl right border
  var hNoteName = wNote;
  var hAmp = wNote;
  var hNoteStatic = h - hNoteName - nAmplitudes * hAmp;
  var hBlackNotes = Math.floor(2 * (hNoteStatic - 2) / 3);

  // setup canvas
  var ctx = document.getElementById('render').getContext('2d');
  ctx.canvas.width = w;
  ctx.canvas.height = h;

  function drawContourNotes() {
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    ctx.strokeRect(0, 0, nNotes * wNote, h - hNoteName);
    for (var i = 1; i < nNotes; ++i) {
      ctx.moveTo(i * wNote, 1);
      ctx.lineTo(i * wNote, h - hNoteName - 1);
    }
    for (var i = 0; i < nAmplitudes; ++i) {
      ctx.moveTo(1, hNoteStatic + i * hAmp);
      ctx.lineTo(nNotes * wNote - 1, hNoteStatic + i * hAmp);
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
        ctx.fillRect(i * wNote + 1, 1, wNote - 2, hBlackNotes - 2);
      }
    }
  }

  // return a color between white & red
  // amplitude == 0 => white
  // amplitude == 1 => red
  function amplitudeColor(amplitude) {
    var gb = 255 - Math.floor(255 * amplitude);
    return 'rgb(255,' + gb + ',' + gb + ')';
  }

  // amplitudes must have values between 0 and 1
  var amplitudes;
  var needStop;
  function startDraw() {
    needStop = false;
    window.requestAnimationFrame(drawAmplitudes);
  }

  function stopDraw() {
    needStop = true;
  }

  function drawAmplitudes() {
    if (needStop) {
      return;
    }
    if (amplitudes) {
      for (var i = 0; i < nAmplitudes; ++i) {
        for (var j = 0; j < nNotes; ++j) {
          ctx.fillStyle = amplitudeColor(amplitudes[i][j]);
          ctx.fillRect(j * wNote + 2, hNoteStatic + i * hAmp + 2, wNote - 4, hAmp - 4);
        }
      }
    }
    window.requestAnimationFrame(drawAmplitudes);
  }

  function drawNoteNames() {
    ctx.font = Math.floor((wNote - 1) / 2) + 'px courier';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black';
    var x0 = 1 + Math.floor((wNote - 1) / 2);
    var y = h - Math.floor(hNoteName / 2) + 1;
    for (var note = beginNote; note < endNote; ++note) {
      ctx.fillText(noteNames[note], x0 + wNote * (note - beginNote), y);
    }
  }

  // full static draw
  drawContourNotes();
  drawBlackNotes();
  drawNoteNames();

  function draw(_amplitudes) {
    amplitudes = _amplitudes;
  }

  document.getElementById('start').onclick = function() {
    // test
    amplitudes = [];
    for (var i = 0; i < nAmplitudes; ++i) {
      var _amplitudes = [];
      for (var j = 0; j < nNotes; ++j) {
        _amplitudes.push(Math.random());
      }
      amplitudes.push(_amplitudes);
    }

    bus.pub('start');
  };

  document.getElementById('stop').onclick = function() {
    bus.pub('stop');
  };

  bus.sub('start', startDraw);
  bus.sub('stop', stopDraw);
  bus.sub('pitch', draw);
});
