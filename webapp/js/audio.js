circular.use('audio', ['bus', 'notes', 'config'], function Audio(bus, notes, config) {
  var audio = {};
  audio.bufferSize = config.audio.bufferSize;
  audio.fHighPass = Math.max(notes.F[0], 20);
  audio.fLowPass = Math.min(notes.F[notes.nNotes - 1] * config.pitchTracker.nHarmonics, 20000);

  function onAudioProcess(audioDataEvent) {
    bus.pub('audio.data', audioDataEvent.inputBuffer.getChannelData(0));
  }

  function onGetUserMediaSuccess(stream) {
    if (audio.context) {
      destroyContext(false).then(onGetUserMediaSuccess.bind(null, stream, pubEvent));
      return;
    }

    audio.context = new AudioContext();
    audio.stream = stream;
    audio.nodes = {};
    audio.nodes.mic = audio.context.createMediaStreamSource(stream);
    audio.nodes.lowpass = audio.context.createBiquadFilter();
    audio.nodes.lowpass.type = 'lowpass';
    audio.nodes.lowpass.frequency.setValueAtTime(audio.fLowPass, 0);
    audio.nodes.highpass = audio.context.createBiquadFilter();
    audio.nodes.highpass.type = 'highpass';
    audio.nodes.highpass.frequency.setValueAtTime(audio.fHighPass, 0);
    audio.nodes.processor = audio.context.createScriptProcessor(audio.bufferSize, 1, 1);
    audio.nodes.processor.onaudioprocess = onAudioProcess;
    audio.nodes.mute = audio.context.createGain();
    audio.nodes.mute.gain.setValueAtTime(0, 0);

    audio.nodes.mic.connect(audio.nodes.lowpass);
    audio.nodes.lowpass.connect(audio.nodes.highpass);
    audio.nodes.highpass.connect(audio.nodes.processor);
    audio.nodes.processor.connect(audio.nodes.mute);
    audio.nodes.mute.connect(audio.context.destination);

    bus.pub('audio.start');
  }

  function onGetUserMediaError(err) {
    console.log(err);
  }

  function destroyContext(pubEvent) {
    audio.nodes.mic.disconnect();
    audio.nodes.lowpass.disconnect();
    audio.nodes.highpass.disconnect();
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
