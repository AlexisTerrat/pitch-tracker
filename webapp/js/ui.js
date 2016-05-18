circular.use('ui', ['bus', 'notes', 'config'], function(bus, notes, config) {
  // useful constants
  var w = config.ui.width;
  var h = config.ui.height;
  var nArrays = config.ui.nDisplayedArrays;
  var noteNames = notes.names;
  var beginNote = notes.begin;
  var endNote = notes.end; // excluded
  var nNotes = notes.nNotes;
  var wNote = Math.floor((w - 1) / nNotes); // incl right border
  var hNoteName = wNote;
  var hArray = wNote;
  var hNoteStatic = h - hNoteName - nArrays * hArray;
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
    for (var i = 0; i < nArrays; ++i) {
      ctx.moveTo(1, hNoteStatic + i * hArray);
      ctx.lineTo(nNotes * wNote - 1, hNoteStatic + i * hArray);
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
  // magnitude == 0 => white
  // magnitude == 1 => red
  function magnitudeColor(magnitude) {
    var gb = 255 - Math.floor(255 * magnitude);
    return 'rgb(255,' + gb + ',' + gb + ')';
  }

  // amplitudes must have values between 0 and 1
  var arrays;
  var needStop;
  function startDraw() {
    needStop = false;
    window.requestAnimationFrame(drawAmplitudes);
  }

  function stopDraw() {
    needStop = true;
  }

  function drawArrays() {
    if (needStop) {
      return;
    }
    if (arrays) {
      var array, arrayLength;
      for (var i = 0; i < Math.min(arrays.length, nArrays); ++i) {
        array = arrays[i];
        arrayLength = array.length;
        for (var j = 0; j < nNotes; ++j) {
          ctx.fillStyle = j < arrayLength ? magnitudeColor(array[j]) : 'white';
          ctx.fillRect(j * wNote + 2, hNoteStatic + i * hArray + 2, wNote - 4, hArray - 4);
        }
      }
    }
    window.requestAnimationFrame(drawArrays);
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

  function draw(data) {
    arrays = data;
  }

  document.getElementById('start').onclick = function() {
    bus.pub('ui.start');
  };

  document.getElementById('stop').onclick = function() {
    bus.pub('ui.stop');
  };

  bus.sub('audio.start', startDraw);
  bus.sub('audio.stop', stopDraw);
  bus.sub('pitch.data', draw);
});
