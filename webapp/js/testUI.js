circular.use('testUI', ['bus', 'config'], function TestUI(bus, config) {
  var bufferSize = config.audio.bufferSize;
  var view = {};
  //view.signal = new ArrayView('signal', bufferSize, { min: -1, max: 1, height: 200 });
  //view.ifft = new ArrayView('ifft', bufferSize, { min: -0.001, max: 0.001, height: 100 });
  //view.cep = new ArrayView('cep', bufferSize, { min: -0.1, max: 0.2, height: 200 });
  view.cep2 = new ArrayView('cep2', bufferSize, { min: -0.1, max: 0.2, height: 200 });
  //view.fcep = new ArrayView('fcep', bufferSize, { min: -0.1, max: 0.2, height: 200 });
  //view.fft = new ArrayView('fft', bufferSize / 2, { min: 0, max: 0.05, height: 100 });
  view.hps = new ArrayView('hps', bufferSize / 2, { min: 0, max: 0.00001, height: 200 });

  var data = {};
  var needStop = false;

  function startDraw() {
    needStop = false;
    window.requestAnimationFrame(draw);
  }

  function stopDraw() {
    needStop = true;
  }

  function updateData(_data) {
    for (var key in _data) {
      if (view[key]) {
        data[key] = _data[key];
      }
    }
  }

  function draw() {
    if (needStop) {
      needStop = false;
      return;
    }
    for (var key in data) {
      view[key].draw(data[key]);
    }
    data = {};
    window.requestAnimationFrame(draw);
  }


  document.getElementById('start').onclick = function() {
    bus.pub('ui.start');
  };

  document.getElementById('stop').onclick = function() {
    bus.pub('ui.stop');
  };

  bus.sub('audio.start', startDraw);
  bus.sub('audio.stop', stopDraw);
  bus.sub('audio.data', updateData);
});
