circular.use('audio', ['bus', 'dsp', 'config'], function Audio(bus, dsp, config) {
  var audio = {};
  audio.bufferSize = config.audio.bufferSize;
  var data,
      fftProcessor,
      ifftProcessor,
      hpsProcessor,
      cepProcessor,
      cepAux;

  // TODO :
  // review algo for inverse fft, (how to do ifft without imaginary part & half of real part...)
  // maybe search for another lib
  // note: with ifft => central symetry in result
  // study more precisely resampling & padding & hps range

  function onAudioProcess(audioDataEvent) {
    data.signal = audioDataEvent.inputBuffer.getChannelData(0);
    fftProcessor.run(data.signal, data.fft);
    ifftProcessor.run(data.fft, data.ifft);
    hpsProcessor.run(data.fft, data.hps);

    for (var i = 0; i < audio.bufferSize / 2; ++i) {
      cepAux[i] = Math.log(data.fft[i]);
    }
    ifftProcessor.run(cepAux, data.cep);
    cepProcessor.run(data.signal, data.cep2);
    // i = 0 -> no sense, and i = 1 out of bound
    for (var i = 2; i < audio.bufferSize / 2; ++i) {
      data.fcep[i] = data.cep2[Math.round(audio.bufferSize / i)];
    }

    bus.pub('audio.data', data);
  }

  function onGetUserMediaSuccess(stream) {
    if (audio.context) {
      destroyContext(false).then(onGetUserMediaSuccess.bind(null, stream));
      return;
    }

    audio.context = new AudioContext();
    audio.stream = stream;
    audio.nodes = {};
    audio.nodes.mic = audio.context.createMediaStreamSource(stream);
    audio.nodes.processor = audio.context.createScriptProcessor(audio.bufferSize, 1, 1);
    audio.nodes.processor.onaudioprocess = onAudioProcess;
    audio.nodes.mute = audio.context.createGain();
    audio.nodes.mute.gain.setValueAtTime(0, 0);

    audio.nodes.mic.connect(audio.nodes.processor);
    audio.nodes.processor.connect(audio.nodes.mute);
    audio.nodes.mute.connect(audio.context.destination);

    data = {};
    cepAux = new Float32Array(audio.bufferSize / 2);
    data.fft = new Float32Array(audio.bufferSize / 2);
    data.ifft = new Float32Array(audio.bufferSize);
    data.cep = new Float32Array(audio.bufferSize);
    data.cep2 = new Float32Array(audio.bufferSize);
    data.fcep = new Float32Array(audio.bufferSize / 2);
    data.hps = new Float32Array(audio.bufferSize / (2 * config.pitchTracker.nHarmonics));
    fftProcessor = dsp.FFT(audio.bufferSize);
    ifftProcessor = dsp.IFFT(audio.bufferSize / 2);
    hpsProcessor = dsp.HPS(audio.bufferSize / 2, config.pitchTracker.nHarmonics);
    cepProcessor = dsp.Cepstrum(audio.bufferSize);
    bus.pub('audio.start');
  }

  function onGetUserMediaError(err) {
    console.log(err);
  }

  function destroyContext(pubEvent) {
    if (!audio.context) {
      return;
    }
    audio.nodes.mic.disconnect();
    audio.nodes.processor.disconnect();
    audio.nodes.mute.disconnect();
    delete audio.nodes;

    var micStreamTracks = audio.stream.getTracks();
    for (var i = 0; i < micStreamTracks.length; ++i) {
      micStreamTracks[i].stop();
    }
    delete audio.stream;

    return audio.context.close()
      .catch(function(err) {
        console.log(err);
        return Promise.resolve();
      })
      .then(function() {
        delete audio.context;
        if (pubEvent) {
          bus.pub('audio.stop');
        }
      });
  }



  function startAudio() {
    navigator.webkitGetUserMedia({ audio: true, video: false }, onGetUserMediaSuccess, onGetUserMediaError);
  }

  function stopAudio() {
    destroyContext(true);
  }

  bus.sub('ui.start', startAudio);
  bus.sub('ui.stop', stopAudio);

  return audio;
});
