circular.use('pitchTracker', ['bus', 'dsp', 'config'], function PitchTracker(bus, dsp, config) {
  // algo idea: cepstrum biased harmonic product spectrum
  // - apply hamming window
  // - pad to get semi tone def & enough space in fft for hps
  // - fft
  // - hps
  // - cepstrum : fft(log(fft))
  // - fic (frequency indexed cepstrum)
  // - hps * fic
  // - loop:
  //   - find max (+trick if one octave too high)
  //   - "remove" max & harmonics
  // - end loop

  var ctx; // web audio context

  // constants
  var beginNote, endNote, nNotes,
    F, // note frequencies
    T, // note periods
    df, // F[i+1] = F[i] * df
    bufferSize, fftSize, cepSize;

  // signal & spectrum buffers
  var S, // input signal
      WS, // windowed signal (Hamming)
      FFT,
      WAF, // weighted autocorrelation function
      FWAF, // WAF indexed by frequency
      HPS, // harmonic product spectrum
      CEP, // cepstrum
      FCEP, // CEP index by frequency
      FCBHPS; // cepstrum biased harmonic product spectrum indexed by frequency

  // note buffers (<=> spectrum buffers scaled to notes, ie bands of "2*df")
  var FFTn, FWAFn, HPSn, FCEPn, FCBHPSn;

  // init constants and buffers
  function init() {
    beginNote = config.notes.range.begin;
    endNote = config.notes.range.end;
    nNotes = endNote - beginNote;
    nPeaks = config.pitchTracker.nNotes;
    bufferSize = config.pitchTracker.bufferSize;
    fftSize = bufferSize / 2;
    cepSize = fftSize / 2;
    F = new Float32Array(88);
    T = new Float32Array(88);
    df = Math.pow(2, 1 / 12);
    for (var i = 0; i < 88; ++i) {
      F[i] = 440 * Math.pow(df, (i - 48));
      T[i] = 1 / F[i];
    }
  }

  // buffers
  S = new Float32Array();

  // computes waf (weighted autocorrelation function)
  // real waf: waf(T) = acf(T) / (amdf(T) + k)
  // my waf: k = 1 & myWaf(T) = (waf(T) + 1)/2 -> becaus waf(T) in [-1, 1] & I want in [0, 1]
  // acf: auto correlation function
  // acf(T) = 1/N * sum(n, 0, N-1) { S(n) * S(n+T) }
  // where N: frame size & S(): the signal
  // amdf: average magnitude difference function
  // amdf(T) = 1/N * sum(n, 0, N-1) { | S(n) - S(n+T) | }
  // so to get better result pick N >= 2 * T

  // floorT & factT used to avoid taking S(n + math.round(T))
  // we consider S(n + T) = factT * S(n + floorT) + (1 - factT) * S(n + floorT + 1)
  var floorT = new Uint16Array(nNotes);
  var factT = new Float32Array(nNotes);
  // same idea for floorIFFT & factIFFT (to get corresponding index in fft array)
  var floorIFFT = new Uint16Array(nNotes);
  var factIFFT = new Float32Array(nNotes);
  var fftNotes = new Float32Array(nNotes);
  var N = new Uint16Array(nNotes);
  var waf = new Float32Array(nNotes);
  var scores = new Float32Array(nNotes);
  (function buildT() {
    var Ti, floorTi;
    for (var note = beginNote; note < endNote; ++note) {
      Ti = sampleRate / frequencies[note];
      floorTi = Math.floor(Ti);
      floorT[note - beginNote] = floorTi;
      factT[note - beginNote] = 1 - (Ti - floorTi);
    }
  })();

  (function buildN() {
    for (var i = 0; i < nNotes; ++i) {
      N[i] = Math.max(bufferSize - (floorT[i] + 1), 0);
    }
  })();

  (function buildIFFT() {
    var Fi, floorFi;
    for (var note = beginNote; note < endNote; ++note) {
      Fi = frequencies[note] * fftSize / sampleRate;
      floorFi = Math.floor(Fi);
      floorIFFT[note - beginNote] = floorFi;
      factIFFT[note - beginNote] = 1 - (Fi - floorFi);
    }
  })();

  var i, j, n, Ni, Ti, factTi, acfi, amdfi, wafi, ffti, S, sn, snt; // sn: S(n), snt: S(n + T)
  var maxWAF, maxFFT, averageWAF, varianceWAF, thresholdWAF, averageFFT, varianceFFT, thresholdFFT;
  var score, peaks, iPeaks, minPeak, maxPeak, p, objPeaks;
  function onAudioProcess(event) {

    // WAF
    S = event.inputBuffer.getChannelData(0);
    maxWAF = 0;
    averageWAF = 0;
    varianceWAF = 0;
    for (i = 0; i < nNotes; ++i) {
      acfi = 0;
      amdfi = 0;
      Ni = N[i];
      Ti = floorT[i];
      factTi = factT[i];
      for (n = 0; n < Ni; ++n) {
        sn = S[n];
        snt = factTi * S[n + Ti] + (1 - factTi) * S[n + Ti + 1];
        acfi += sn * snt;
        amdfi += Math.abs(sn - snt);
      }
      acfi /= Ni;
      amdfi /= Ni;
      wafi = acfi / (amdfi + 1);
      waf[i] = wafi;

      averageWAF += wafi;
      varianceWAF += wafi * wafi;
      if (wafi > maxWAF) {
        maxWAF = wafi;
      }
    }
    averageWAF /= nNotes;
    varianceWAF /= nNotes;
    varianceWAF -= averageWAF * averageWAF;
    thresholdWAF = averageWAF + Math.sqrt(varianceWAF);

    // FFT
    analyser.getByteFrequencyData(fft);
    maxFFT = 0;
    var maxFFTi = 0;
    averageFFT = 0;
    varianceFFT = 0;
    for (i = 0; i < nNotes; ++i) {
      j = floorIFFT[i];
      if (j >= bufferSize) {
        ffti = 0;
      } else if (j == bufferSize - 1) {
        ffti = fft[j];
      } else {
        ffti = factIFFT[i] * fft[j] + (1 - factIFFT[i]) * fft[j + 1];
      }
      ffti /= 255;
      fftNotes[i] = ffti;

      averageFFT += ffti;
      varianceFFT += ffti * ffti;
      if (ffti > maxFFT) {
        maxFFT = ffti;
        maxFFTi = i;
      }
    }
    averageFFT /= nNotes;
    varianceFFT /= nNotes;
    varianceFFT -= averageFFT * averageFFT;
    thresholdFFT = averageFFT + Math.sqrt(varianceFFT);
    var res = {};
    res[beginNote + maxFFTi] = maxFFT ? thresholdFFT : 0;
    bus.pub('pitch', res, averageWAF, averageFFT);
  }
    // return if we only have noise
    /*if (averageWAF < 0.0002) {
      bus.pub('pitch', {}, averageWAF, averageFFT);
      return;
    }*/

    // remove values below threshold
    /*for (i = 0; i < nNotes; ++i) {
      if (waf[i] < mean) {
        waf[i] = 0;
      }
    }*/

    // add first harmonic to fondamental value
    /*for (i = 0; i < nNotes - 12; ++i) {
      waf[i] += waf[i + 12];
    }*/

    // find peaks
    /*peaks = []; // sorted by max first
    iPeaks = [];
    peaks.push(0);
    iPeaks.push(-1);
    minPeak = -1;
    for (i = 0; i < nNotes; ++i) {
      score = scores[i];
      if (score > minPeak) {
        for (p = 0; p < peaks.length; ++p) {
          if (score > peaks[p]) {
            peaks.splice(p, 0, score);
            iPeaks.splice(p, 0, i);
            break;
          }
        }
        if (peaks.length > nPeaks) {
          peaks.pop();
          iPeaks.pop();
        }
        minPeak = peaks[peaks.length - 1];
      }
    }

    // normalize peaks & * averageFFT * averageWAF
    maxPeak = peaks[0];
    for (p = 0; p < nPeaks; ++p) {
      peaks[p] /= maxPeak;
    }

    objPeaks = {};
    for (p = 0; p < nPeaks; ++p) {
      objPeaks[beginNote + iPeaks[p]] = peaks[p];
    }*/
    /*objPeaks = {};
    for (i = 0; i < nNotes; ++i) {
      wafi = waf[i];
      ffti = fftNotes[i];
      if (wafi > thresholdWAF) {
        objPeaks[beginNote + i] = ffti * wafi / maxWAF;
      }
    }*/

    /*
      idee algo:
        - refacto to start from sampleRate/bufferSize -> not from notes
        - extract peaks from fft
        - wcf and not waf (ie correlation) with some sum (k*sin(n*fPeak + p)) extracted from fft
        - pick best results
     */

    //bus.pub('pitch', objPeaks, averageWAF, averageFFT);
  /*}

  function onGetUserMediaSuccess(stream) {
    var mic = ctx.createMediaStreamSource(stream);
    // bandpass to remove some noise
    var lowpass = ctx.createBiquadFilter();
    var lpCutFreq = Math.min(frequencies[endNote - 1] * 2, 10000);
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(lpCutFreq, 0);
    var highpass = ctx.createBiquadFilter();
    var hpCutFreq = Math.max(frequencies[beginNote] / 2, 20);
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(hpCutFreq, 0);
    analyser = ctx.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = 0.5;
    var processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    processor.onaudioprocess = onAudioProcess;
    var mute = ctx.createGain();
    mute.gain.setValueAtTime(0, 0);
    mic.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(analyser);
    analyser.connect(processor);
    processor.connect(mute);
    mute.connect(ctx.destination);
  }

  function onGetUserMediaError(err) {
    console.log(err);
  }

  navigator.webkitGetUserMedia({ audio: true, video: false }, onGetUserMediaSuccess, onGetUserMediaError);*/
});
