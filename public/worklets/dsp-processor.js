/**
 * PulseJam DSP Processor (Stage 1 + Stage 2)
 *
 * Runs 100% client-side inside the WebAudio AudioWorklet execution context.
 * Performs RMS dB computation, Onset Peak Detection, YIN Monophonic Pitch Detection,
 * EMA smoothing, dual-threshold tier classification, hysteresis, and latency instrumentation.
 */

class PulseJamDSPProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Default Calibration Thresholds (in dB / count)
    this.calibration = {
      quietDb: -38,
      normalDb: -22,
      loudDb: -12,
      onsetThreshold: 3.5,
    };

    // Modes: 'LIVE', 'CALIBRATING', 'OVERRIDE'
    this.mode = 'LIVE';
    this.manualOverrideTier = null;

    // EMA Smoothing Coefficients
    this.alphaRms = 0.15;
    this.alphaOnset = 0.18;

    // Smoothed values
    this.smoothedRmsDb = -80;
    this.smoothedOnsetDensity = 0;

    // Onset Detection Parameters
    this.onsetWindowSeconds = 1.0;
    this.onsetHistory = [];
    this.lastPeakTime = 0;
    this.peakThreshold = 0.03;
    this.minRefractoryMs = 45;

    // State Machine & Hysteresis
    this.activeTier = 'chill';
    this.candidateTier = 'chill';
    this.candidateStartTime = 0;
    this.dwellTimeSec = 0.35;
    this.lowVolumeStartTime = 0;
    this.chillVolumeRequirementSec = 2.0;

    // Latency Instrumentation
    this.lastSpikeTime = null;

    // Control frame throttling
    this.samplesProcessedSincePost = 0;
    this.postIntervalSamples = 882; // ~20ms at 44.1kHz

    // Stage 2: YIN Pitch Detection Buffer
    this.pitchBufferSize = 1024;
    this.pitchRingBuffer = new Float32Array(this.pitchBufferSize);
    this.pitchBufferIndex = 0;
    this.currentPitch = null;
    this.currentFrequency = null;
    this.pitchConfidence = 0;

    // Monophonic Note Event Tracker
    this.activeNote = null; // { pitch, velocity, startTime }
    this.recentNoteEvents = [];

    // Message Handler
    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  handleMessage(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'SET_CALIBRATION':
        if (data.payload) {
          this.calibration = { ...this.calibration, ...data.payload };
        }
        break;

      case 'SET_MODE':
        if (data.payload) {
          this.mode = data.payload.mode || 'LIVE';
          this.manualOverrideTier = data.payload.overrideTier || null;
          if (this.mode === 'OVERRIDE' && this.manualOverrideTier) {
            this.setTier(this.manualOverrideTier, 0);
          }
        }
        break;

      case 'CLEAR_PITCH_BUFFER':
        this.recentNoteEvents = [];
        this.activeNote = null;
        break;
    }
  }

  setTier(newTier, deltaMs) {
    if (this.activeTier !== newTier) {
      const prevTier = this.activeTier;
      this.activeTier = newTier;

      this.port.postMessage({
        type: 'TIER_CHANGE',
        payload: {
          previousTier: prevTier,
          newTier: newTier,
          deltaMs: Math.max(1, Math.round(deltaMs)),
          timestamp: currentTime,
        },
      });
    }
  }

  /**
   * YIN Monophonic Pitch Detection Algorithm
   * Computes fundamental frequency f0, clarity/confidence, and MIDI note number.
   */
  computeYINPitch(buffer, sampleRate) {
    const W = Math.floor(buffer.length / 2);
    const yinBuffer = new Float32Array(W);
    const threshold = 0.15; // YIN dip threshold

    // Step 1: Difference Function
    for (let tau = 0; tau < W; tau++) {
      let sum = 0;
      for (let j = 0; j < W; j++) {
        const delta = buffer[j] - buffer[j + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }

    // Step 2: Cumulative Mean Normalized Difference
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < W; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] = (yinBuffer[tau] * tau) / runningSum;
    }

    // Step 3: Absolute Threshold Search
    let tauEstimate = -1;
    for (let tau = 2; tau < W; tau++) {
      if (yinBuffer[tau] < threshold) {
        while (tau + 1 < W && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) {
      // Find global minimum if no point fell below threshold
      let minVal = 1.0;
      for (let tau = 2; tau < W; tau++) {
        if (yinBuffer[tau] < minVal) {
          minVal = yinBuffer[tau];
          tauEstimate = tau;
        }
      }
      if (minVal > 0.45) return null; // Low clarity / noisy audio
    }

    // Step 4: Parabolic Interpolation for Sub-sample Accuracy
    let betterTau = tauEstimate;
    if (tauEstimate > 0 && tauEstimate < W - 1) {
      const s0 = yinBuffer[tauEstimate - 1];
      const s1 = yinBuffer[tauEstimate];
      const s2 = yinBuffer[tauEstimate + 1];
      const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
      if (Math.abs(adjustment) < 1.0) {
        betterTau += adjustment;
      }
    }

    const freq = sampleRate / betterTau;
    // Human voice / instrument monophonic bounds (approx 65Hz to 1100Hz -> C2 to C6)
    if (freq < 60 || freq > 1200) return null;

    const midiNote = Math.round(69 + 12 * Math.log2(freq / 440));
    const confidence = 1 - Math.min(1, yinBuffer[tauEstimate]);

    return {
      pitch: Math.max(0, Math.min(127, midiNote)),
      frequency: freq,
      confidence,
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const channelData = input[0];
    const bufferSize = channelData.length;
    const nowSec = currentTime;

    // 1. RMS Calculation
    let sumSquares = 0;
    let maxAbs = 0;

    for (let i = 0; i < bufferSize; i++) {
      const sample = channelData[i];
      const absSample = Math.abs(sample);
      sumSquares += sample * sample;
      if (absSample > maxAbs) maxAbs = absSample;

      // Fill YIN ring buffer
      this.pitchRingBuffer[this.pitchBufferIndex] = sample;
      this.pitchBufferIndex = (this.pitchBufferIndex + 1) % this.pitchBufferSize;
    }

    const rms = Math.sqrt(sumSquares / bufferSize);
    const rawRmsDb = rms > 0.00001 ? 20 * Math.log10(rms) : -80;

    // 2. Onset / Attack Detection
    const refractorySec = this.minRefractoryMs / 1000;
    if (maxAbs > this.peakThreshold && nowSec - this.lastPeakTime >= refractorySec) {
      this.lastPeakTime = nowSec;
      this.onsetHistory.push(nowSec);
    }

    const cutoff = nowSec - this.onsetWindowSeconds;
    while (this.onsetHistory.length > 0 && this.onsetHistory[0] < cutoff) {
      this.onsetHistory.shift();
    }
    const rawOnsetDensity = this.onsetHistory.length;

    // 3. EMA Smoothing
    this.smoothedRmsDb = this.alphaRms * rawRmsDb + (1 - this.alphaRms) * this.smoothedRmsDb;
    this.smoothedOnsetDensity =
      this.alphaOnset * rawOnsetDensity + (1 - this.alphaOnset) * this.smoothedOnsetDensity;

    // 4. YIN Monophonic Pitch Extraction & Note Event Tracker
    if (rawRmsDb > this.calibration.quietDb - 5) {
      const pitchResult = this.computeYINPitch(this.pitchRingBuffer, sampleRate);
      if (pitchResult && pitchResult.confidence > 0.4) {
        this.currentPitch = pitchResult.pitch;
        this.currentFrequency = pitchResult.frequency;
        this.pitchConfidence = pitchResult.confidence;

        // Monophonic Note Event Segmentation
        const normalizedVel = Math.min(1, Math.max(0.1, (rawRmsDb + 60) / 60));
        if (!this.activeNote) {
          this.activeNote = {
            pitch: pitchResult.pitch,
            velocity: normalizedVel,
            startTime: nowSec,
          };
        } else if (Math.abs(this.activeNote.pitch - pitchResult.pitch) >= 1) {
          // Pitch changed -> finalize previous note and start new note
          const duration = Math.max(0.05, nowSec - this.activeNote.startTime);
          const completedNote = {
            pitch: this.activeNote.pitch,
            velocity: this.activeNote.velocity,
            startTime: this.activeNote.startTime,
            duration: duration,
          };
          this.recentNoteEvents.push(completedNote);
          this.port.postMessage({ type: 'NOTE_EVENT', payload: completedNote });

          this.activeNote = {
            pitch: pitchResult.pitch,
            velocity: normalizedVel,
            startTime: nowSec,
          };
        }
      } else {
        this.finalizeActiveNote(nowSec);
      }
    } else {
      this.finalizeActiveNote(nowSec);
      this.currentPitch = null;
      this.currentFrequency = null;
      this.pitchConfidence = 0;
    }

    // Keep rolling note event list pruned to last 2 bars (~4 seconds)
    const noteCutoff = nowSec - 4.0;
    while (this.recentNoteEvents.length > 0 && this.recentNoteEvents[0].startTime < noteCutoff) {
      this.recentNoteEvents.shift();
    }

    // 5. Reactive State Machine Logic
    if (this.mode === 'LIVE') {
      const { quietDb, loudDb, onsetThreshold } = this.calibration;

      if (this.smoothedRmsDb < quietDb) {
        if (this.lowVolumeStartTime === 0) this.lowVolumeStartTime = nowSec;
      } else {
        this.lowVolumeStartTime = 0;
      }

      const lowVolumeDuration = this.lowVolumeStartTime > 0 ? nowSec - this.lowVolumeStartTime : 0;
      let targetTier = 'groove';

      if (this.smoothedRmsDb >= loudDb || this.smoothedOnsetDensity >= onsetThreshold) {
        targetTier = 'peak';
      } else if (lowVolumeDuration >= this.chillVolumeRequirementSec && this.smoothedOnsetDensity < onsetThreshold * 0.7) {
        targetTier = 'chill';
      } else if (this.smoothedRmsDb < quietDb) {
        targetTier = this.activeTier === 'chill' ? 'chill' : 'groove';
      }

      if (targetTier !== this.activeTier) {
        if (this.candidateTier !== targetTier) {
          this.candidateTier = targetTier;
          this.candidateStartTime = nowSec;
          this.lastSpikeTime = nowSec;
        } else {
          const dwellSec = nowSec - this.candidateStartTime;
          if (dwellSec >= this.dwellTimeSec) {
            const spikeTime = this.lastSpikeTime || this.candidateStartTime;
            const deltaMs = (nowSec - spikeTime) * 1000;
            this.setTier(this.candidateTier, deltaMs);
            this.lastSpikeTime = null;
          }
        }
      } else {
        this.candidateTier = this.activeTier;
        this.lastSpikeTime = null;
      }
    } else if (this.mode === 'OVERRIDE' && this.manualOverrideTier) {
      if (this.activeTier !== this.manualOverrideTier) {
        this.setTier(this.manualOverrideTier, 0);
      }
    }

    // 6. Post periodic metrics to main thread (~50Hz)
    this.samplesProcessedSincePost += bufferSize;
    if (this.samplesProcessedSincePost >= this.postIntervalSamples) {
      this.samplesProcessedSincePost = 0;

      this.port.postMessage({
        type: 'DSP_METRICS',
        payload: {
          rawRmsDb,
          smoothedRmsDb: this.smoothedRmsDb,
          rawOnsetDensity,
          smoothedOnsetDensity: this.smoothedOnsetDensity,
          activeTier: this.activeTier,
          candidateTier: this.candidateTier,
          mode: this.mode,
          calibration: this.calibration,
          timestamp: nowSec,
          peakAmplitude: maxAbs,
          currentPitch: this.currentPitch,
          currentFrequency: this.currentFrequency,
          pitchConfidence: this.pitchConfidence,
          bufferedNotes: this.recentNoteEvents,
        },
      });
    }

    return true;
  }

  finalizeActiveNote(nowSec) {
    if (this.activeNote) {
      const duration = Math.max(0.05, nowSec - this.activeNote.startTime);
      const completedNote = {
        pitch: this.activeNote.pitch,
        velocity: this.activeNote.velocity,
        startTime: this.activeNote.startTime,
        duration: duration,
      };
      this.recentNoteEvents.push(completedNote);
      this.port.postMessage({ type: 'NOTE_EVENT', payload: completedNote });
      this.activeNote = null;
    }
  }
}

registerProcessor('pulsejam-dsp-processor', PulseJamDSPProcessor);
