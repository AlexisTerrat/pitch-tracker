/**
 * this is mostly stolen from Corban Brook's work
 * github of his lib: https://github.com/corbanbrook/dsp.js
 */

circular.use('dsp', function DSP() {
  var TWO_PI = 2 * Math.PI;

  // downsampler (*d with d < 1)
  function DownSampler(srcLength, d) {
    var destLength = Math.floor(srcLength * d);
    // dest[i] = tFact[i] * src[tSrc[i]] + (1 - tFact[i]) * src[tSrc[i] + 1]
    var iCeilSrc = new Uint16Array(destLength);
    var factors = new Float32Array(destLength);
    var factor;
    var iDest, iSrc;
    for (iDest = 0; iDest < destLength; ++iDest) {
      iSrc = iDest / d;
      iCeilSrc[iDest] = Math.ceil(iSrc);
      if (iCeilSrc[iDest] >= srcLength) {
        iCeilSrc[iDest] = srcLength - 1;
      }
      factors[iDest] = iCeilSrc[iDest] - iSrc;
    }

    function run(src, dest) {
      dest[0] = src[0];
      for (iDest = 1; iDest < destLength; ++iDest) {
        iSrc = iCeilSrc[iDest];
        factor = factors[iDest];
        dest[iDest] = factor * src[iSrc - 1] + (1 - factor) * src[iSrc];
      }
    }

    return {
      destLength: destLength,
      run: run
    };
  }

  function Hamming(srcLength) {
    var i, factor = new Float32Array(srcLength);
    for (i = 0; i < srcLength; ++i) {
      factor[i] = 0.54 - 0.46 * Math.cos(TWO_PI * i / (srcLength - 1));
    }

    function run(src, dest) {
      for (i = 0; i < srcLength; ++i) {
        dest[i] = factor[i] * src[i];
      }
    }

    return {
      run: run
    };
  }

  // srcLength must be a power of 2
  function FFT(srcLength) {
    var x = new Float32Array(srcLength); // a.k.a trans

    function _reverseBinPermute(_src, _dest) {
      var halfSize    = srcLength >>> 1,
          nm1         = srcLength - 1,
          i = 1, r = 0, h;

      _dest[0] = _src[0];

      do {
        r += halfSize;
        _dest[i] = _src[r];
        _dest[r] = _src[i];

        i++;

        h = halfSize << 1;
        while (h = h >> 1, !((r ^= h) & h));

        if (r >= i) {
          _dest[i]     = _src[r];
          _dest[r]     = _src[i];

          _dest[nm1-i] = _src[nm1-r];
          _dest[nm1-r] = _src[nm1-i];
        }
        i++;
      } while (i < halfSize);
      _dest[nm1] = _src[nm1];
    }

    function run(src, dest) {
      var n         = srcLength,
          i         = n >>> 1,
          bSi       = 2 / n,
          n2, n4, n8, nn,
          t1, t2, t3, t4,
          i1, i2, i3, i4, i5, i6, i7, i8,
          st1, cc1, ss1, cc3, ss3,
          e,
          a,
          rval, ival, mag;

      _reverseBinPermute(src, x);

      /*
      var reverseTable = this.reverseTable;

      for (var k = 0, len = reverseTable.length; k < len; k++) {
        x[k] = src[reverseTable[k]];
      }
      */

      for (var ix = 0, id = 4; ix < n; id *= 4) {
        for (var i0 = ix; i0 < n; i0 += id) {
          //sumdiff(x[i0], x[i0+1]); // {a, b}  <--| {a+b, a-b}
          st1 = x[i0] - x[i0+1];
          x[i0] += x[i0+1];
          x[i0+1] = st1;
        }
        ix = 2*(id-1);
      }

      n2 = 2;
      nn = n >>> 1;

      while((nn = nn >>> 1)) {
        ix = 0;
        n2 = n2 << 1;
        id = n2 << 1;
        n4 = n2 >>> 2;
        n8 = n2 >>> 3;
        do {
          if(n4 !== 1) {
            for(i0 = ix; i0 < n; i0 += id) {
              i1 = i0;
              i2 = i1 + n4;
              i3 = i2 + n4;
              i4 = i3 + n4;

              //diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
              t1 = x[i3] + x[i4];
              x[i4] -= x[i3];
              //sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
              x[i3] = x[i1] - t1;
              x[i1] += t1;

              i1 += n8;
              i2 += n8;
              i3 += n8;
              i4 += n8;

              //sumdiff(x[i3], x[i4], t1, t2); // {s, d}  <--| {a+b, a-b}
              t1 = x[i3] + x[i4];
              t2 = x[i3] - x[i4];

              t1 = -t1 * Math.SQRT1_2;
              t2 *= Math.SQRT1_2;

              // sumdiff(t1, x[i2], x[i4], x[i3]); // {s, d}  <--| {a+b, a-b}
              st1 = x[i2];
              x[i4] = t1 + st1;
              x[i3] = t1 - st1;

              //sumdiff3(x[i1], t2, x[i2]); // {a, b, d} <--| {a+b, b, a-b}
              x[i2] = x[i1] - t2;
              x[i1] += t2;
            }
          } else {
            for(i0 = ix; i0 < n; i0 += id) {
              i1 = i0;
              i2 = i1 + n4;
              i3 = i2 + n4;
              i4 = i3 + n4;

              //diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
              t1 = x[i3] + x[i4];
              x[i4] -= x[i3];

              //sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
              x[i3] = x[i1] - t1;
              x[i1] += t1;
            }
          }

          ix = (id << 1) - n2;
          id = id << 2;
        } while (ix < n);

        e = TWO_PI / n2;

        for (var j = 1; j < n8; j++) {
          a = j * e;
          ss1 = Math.sin(a);
          cc1 = Math.cos(a);

          //ss3 = sin(3*a); cc3 = cos(3*a);
          cc3 = 4*cc1*(cc1*cc1-0.75);
          ss3 = 4*ss1*(0.75-ss1*ss1);

          ix = 0; id = n2 << 1;
          do {
            for (i0 = ix; i0 < n; i0 += id) {
              i1 = i0 + j;
              i2 = i1 + n4;
              i3 = i2 + n4;
              i4 = i3 + n4;

              i5 = i0 + n4 - j;
              i6 = i5 + n4;
              i7 = i6 + n4;
              i8 = i7 + n4;

              //cmult(c, s, x, y, &u, &v)
              //cmult(cc1, ss1, x[i7], x[i3], t2, t1); // {u,v} <--| {x*c-y*s, x*s+y*c}
              t2 = x[i7]*cc1 - x[i3]*ss1;
              t1 = x[i7]*ss1 + x[i3]*cc1;

              //cmult(cc3, ss3, x[i8], x[i4], t4, t3);
              t4 = x[i8]*cc3 - x[i4]*ss3;
              t3 = x[i8]*ss3 + x[i4]*cc3;

              //sumdiff(t2, t4);   // {a, b} <--| {a+b, a-b}
              st1 = t2 - t4;
              t2 += t4;
              t4 = st1;

              //sumdiff(t2, x[i6], x[i8], x[i3]); // {s, d}  <--| {a+b, a-b}
              //st1 = x[i6]; x[i8] = t2 + st1; x[i3] = t2 - st1;
              x[i8] = t2 + x[i6];
              x[i3] = t2 - x[i6];

              //sumdiff_r(t1, t3); // {a, b} <--| {a+b, b-a}
              st1 = t3 - t1;
              t1 += t3;
              t3 = st1;

              //sumdiff(t3, x[i2], x[i4], x[i7]); // {s, d}  <--| {a+b, a-b}
              //st1 = x[i2]; x[i4] = t3 + st1; x[i7] = t3 - st1;
              x[i4] = t3 + x[i2];
              x[i7] = t3 - x[i2];

              //sumdiff3(x[i1], t1, x[i6]);   // {a, b, d} <--| {a+b, b, a-b}
              x[i6] = x[i1] - t1;
              x[i1] += t1;

              //diffsum3_r(t4, x[i5], x[i2]); // {a, b, s} <--| {a, b-a, a+b}
              x[i2] = t4 + x[i5];
              x[i5] -= t4;
            }

            ix = (id << 1) - n2;
            id = id << 2;

          } while (ix < n);
        }
      }

      while (--i) {
        rval = x[i];
        ival = x[n-i-1];
        mag = bSi * Math.sqrt(rval * rval + ival * ival);
        dest[i] = mag;
      }

      dest[0] = bSi * x[0];
    }

    return {
      run: run
    };
  }

  function Cepstrum(srcLength) {
    var rval,
        ival,
        halfSize,
        phaseShiftStepReal,
        phaseShiftStepImag,
        currentPhaseShiftReal,
        currentPhaseShiftImag,
        off,
        tr,
        ti,
        tmpReal,
        fftStep,
        i;

    var real = new Float64Array(srcLength);
    var imag = new Float64Array(srcLength);
    var revReal = new Float64Array(srcLength);
    var revImag = new Float64Array(srcLength);

    var reverseTable = new Uint32Array(srcLength);
    var bSi = 2 / srcLength;
    var limit = 1;
    var bit = srcLength >> 1;
    while (limit < srcLength) {
      for (i = 0; i < limit; i++) {
        reverseTable[i + limit] = reverseTable[i] + bit;
      }
      limit = limit << 1;
      bit = bit >> 1;
    }

    var sinTable = new Float64Array(srcLength);
    var cosTable = new Float64Array(srcLength);
    for (i = 0; i < srcLength; i++) {
      sinTable[i] = Math.sin(-Math.PI/i);
      cosTable[i] = Math.cos(-Math.PI/i);
    }

    function run(src, dest) {

      /**
       * FFT
       */
      halfSize = 1;
      for (i = 0; i < srcLength; i++) {
        real[i] = src[reverseTable[i]];
        imag[i] = 0;
      }

      while (halfSize < srcLength) {
        phaseShiftStepReal = cosTable[halfSize];
        phaseShiftStepImag = sinTable[halfSize];

        currentPhaseShiftReal = 1;
        currentPhaseShiftImag = 0;

        for (fftStep = 0; fftStep < halfSize; fftStep++) {
          i = fftStep;

          while (i < srcLength) {
            off = i + halfSize;
            tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
            ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

            real[off] = real[i] - tr;
            imag[off] = imag[i] - ti;
            real[i] += tr;
            imag[i] += ti;

            i += halfSize << 1;
          }

          tmpReal = currentPhaseShiftReal;
          currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
          currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
        }

        halfSize = halfSize << 1;
      }

      /**
       * LOG
       */
      for (i = 0; i < srcLength; i++) {
        rval = real[i];
        ival = imag[i];
        real[i] = Math.log(bSi * Math.sqrt(rval * rval + ival * ival));
        imag[i] = 0;
      }

      /**
       * INVERSE FFT
       */
      halfSize = 1;
      /*for (i = 0; i < srcLength; i++) {
        imag[i] *= -1;
      }*/

      for (i = 0; i < real.length; i++) {
        revReal[i] = real[reverseTable[i]];
        //revImag[i] = imag[reverseTable[i]];
      }

      real = revReal;
      //imag = revImag;

      while (halfSize < srcLength) {
        phaseShiftStepReal = cosTable[halfSize];
        phaseShiftStepImag = sinTable[halfSize];
        currentPhaseShiftReal = 1;
        currentPhaseShiftImag = 0;

        for (fftStep = 0; fftStep < halfSize; fftStep++) {
          i = fftStep;

          while (i < srcLength) {
            off = i + halfSize;
            tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
            ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

            real[off] = real[i] - tr;
            imag[off] = imag[i] - ti;
            real[i] += tr;
            imag[i] += ti;

            i += halfSize << 1;
          }

          tmpReal = currentPhaseShiftReal;
          currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
          currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
        }

        halfSize = halfSize << 1;
      }

      for (i = 0; i < srcLength; i++) {
        dest[i] = real[i] / srcLength;
      }
    }


    return {
      run: run
    };
  }

  // we assume destLength = srcLength / nHarmonics
  function HPS(srcLength, nHarmonics) {
    var destLength = Math.floor(srcLength / nHarmonics);

    function run(src, dest) {
      var i, h, hps;
      for (i = 0; i < destLength; ++i) {
        hps = src[i];
        for (h = 2; h <= nHarmonics; ++h) {
          hps *= src[h * i];
        }
        dest[i] = hps;
      }
    }

    return {
      destLength: destLength,
      run: run
    };
  }

  return {
    DownSampler: DownSampler,
    Hamming: Hamming,
    FFT: FFT,
    Cepstrum: Cepstrum,
    HPS: HPS
  };
});
