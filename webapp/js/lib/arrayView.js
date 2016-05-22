function ArrayView(divId, size, options) {
  var eContainer = document.getElementById(divId);
  var eTitle = document.createElement('h4');
  eTitle.innerHTML = divId;
  var eCanvas = document.createElement('canvas');
  var eMin = document.createElement('span');
  var eMax = document.createElement('span');
  eContainer.appendChild(eTitle);
  eContainer.appendChild(eCanvas);
  eContainer.appendChild(eMin);
  eContainer.appendChild(eMax);

  var ctx = eCanvas.getContext('2d');
  var w = 2 * (size + 1);
  var h = options.height;
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  var min = 100000;
  var max = -100000;
  var minDraw = options.min;
  var maxDraw = options.max;
  var range = maxDraw - minDraw;
  var y0 = Math.ceil(h * maxDraw/range) - 1;

  ctx.strokeStyle = 'black';
  ctx.moveTo(0,0);
  ctx.lineTo(0, h - 1);
  ctx.moveTo(0, y0);
  ctx.lineTo(w - 1, y0);
  ctx.stroke();
  eMin.innerHTML = '</br>min: ' + min;
  eMax.innerHTML = '</br>max: ' + max;

  function draw(array) {
    var arrayLength = array.length;
    var val, x, y;
    ctx.fillStyle = 'white';
    ctx.fillRect(1, 0, w - 1, y0 - 1);
    ctx.fillRect(1, y0 + 1, w - 1, h - 1 - y0);
    ctx.fillStyle = 'red';
    for (var i = 0; i < size; ++i) {
      if (i >= arrayLength) {
        continue;
      }
      val = array[i];
      if (val < min) {
        min = val;
        val = minDraw;
        eMin.innerHTML = '</br>min: ' + min;
      }
      if (val > max) {
        max = val;
        val = maxDraw;
        eMax.innerHTML = '</br>max: ' + max;
      }
      x = 2 * (i + 1);
      y = Math.abs(Math.floor(h * val / range));
      if (val > 0) {
        ctx.fillRect(x, y0 - 1 - y, 2, y);
      } else if (val < 0) {
        ctx.fillRect(x, y0 + 1, 2, y);
      }
    }
  }

  return {
    draw: draw
  };
}
