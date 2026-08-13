'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { CalibrationData, DSPMetrics } from '@/lib/audio/types';
import { useAudioSettingsStore } from '@/lib/state/audioSettingsStore';
import { useCalibrationStore } from '@/lib/state/calibrationStore';
import { saveToneSample } from '@/lib/audio/toneSampleStorage';

interface RefinedCalibrationModalProps {
  isOpen: boolean;
  audioEngine: AudioEngine | null;
  onComplete: (calibration: CalibrationData) => void;
  onSkip?: () => void;
  onOpenSettings?: () => void;
}

export type CalibrationStep = 'intro' | 'quiet' | 'loud' | 'phrase' | 'feedback' | 'success';

// Helper to convert monophonic MIDI note number to note name string (e.g. 60 -> C4)
function midiToNoteName(midi: number | null): string {
  if (midi === null || midi === undefined || midi <= 0) return '--';
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const name = notes[midi % 12];
  return `${name}${octave}`;
}

export function RefinedCalibrationModal({
  isOpen,
  audioEngine,
  onComplete,
  onSkip,
  onOpenSettings,
}: RefinedCalibrationModalProps) {
  const [step, setStep] = useState<CalibrationStep>('intro');
  const [countdown, setCountdown] = useState(5);
  const [currentRmsDb, setCurrentRmsDb] = useState(-80);
  const [livePitchConfidence, setLivePitchConfidence] = useState<number>(0);
  const [liveDetectedNote, setLiveDetectedNote] = useState<number | null>(null);

  // Real-time signal activity & fallback state (distinct from pass/fail scoring)
  const [smoothedRmsDb, setSmoothedRmsDb] = useState<number>(-80);
  const [isSignalActive, setIsSignalActive] = useState<boolean>(false);
  const [noInputDetected, setNoInputDetected] = useState<boolean>(false);

  const smoothedRmsRef = useRef<number>(-80);
  const lastMetricTimeRef = useRef<number>(Date.now());
  const stepStartTimeRef = useRef<number>(Date.now());
  const rmsHistoryRef = useRef<number[]>([]);

  // Calibration metric aggregators
  const initialGainRef = useRef<number>(12);
  const quietSamplesRef = useRef<number[]>([]);
  const loudSamplesRef = useRef<number[]>([]);
  const phrasePitchFramesRef = useRef<{ pitch: number; confidence: number }[]>([]);
  const phraseNoteEventsRef = useRef<number[]>([]);

  // Computed results state
  const [quietDbResult, setQuietDbResult] = useState<number>(-38);
  const [loudDbResult, setLoudDbResult] = useState<number>(-12);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [detectedNotesCount, setDetectedNotesCount] = useState<number>(0);
  const [pitchRangeLowResult, setPitchRangeLowResult] = useState<number>(60);
  const [pitchRangeHighResult, setPitchRangeHighResult] = useState<number>(60);
  const [isVerifiedGateResult, setIsVerifiedGateResult] = useState<boolean>(false);

  // Ensure microphone is active when calibration modal opens
  useEffect(() => {
    if (isOpen && audioEngine && !audioEngine.getStatus().isMicActive) {
      audioEngine.startMicrophone();
    }
  }, [isOpen, audioEngine]);

  // Subscribe to live audio engine DSP telemetry
  useEffect(() => {
    if (!isOpen || !audioEngine) return;


    const unsubscribe = audioEngine.subscribeMetrics((metrics: DSPMetrics) => {
      const now = Date.now();
      lastMetricTimeRef.current = now;

      // Exponential smoothing for fluid ~50Hz visual updates without UI jank
      smoothedRmsRef.current = smoothedRmsRef.current * 0.7 + metrics.rawRmsDb * 0.3;
      setSmoothedRmsDb(smoothedRmsRef.current);

      setCurrentRmsDb(metrics.rawRmsDb);
      setLivePitchConfidence(metrics.pitchConfidence || 0);
      setLiveDetectedNote(metrics.currentPitch || null);

      // Baseline signal activity detection (rawRmsDb > -55dB indicates active mic audio input)
      const active = metrics.rawRmsDb > -55;
      setIsSignalActive(active);

      // Track rolling RMS history for silence floor & flatline variance detection
      rmsHistoryRef.current.push(metrics.rawRmsDb);
      if (rmsHistoryRef.current.length > 30) {
        rmsHistoryRef.current.shift();
      }

      if (step === 'quiet') {
        quietSamplesRef.current.push(metrics.rawRmsDb);
      } else if (step === 'loud') {
        loudSamplesRef.current.push(metrics.rawRmsDb);
      } else if (step === 'phrase') {
        if (metrics.currentPitch && (metrics.pitchConfidence || 0) > 0.4) {
          phrasePitchFramesRef.current.push({
            pitch: metrics.currentPitch,
            confidence: metrics.pitchConfidence || 0,
          });
          phraseNoteEventsRef.current.push(metrics.currentPitch);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, audioEngine, step]);

  // Step Reset & Input Health Monitoring
  useEffect(() => {
    if (!isOpen) return;
    setStep('intro');
    setCountdown(5);
    stepStartTimeRef.current = Date.now();
    lastMetricTimeRef.current = Date.now();
    rmsHistoryRef.current = [];
    setNoInputDetected(false);
    initialGainRef.current = useAudioSettingsStore.getState().inputGainDb;
    quietSamplesRef.current = [];
    loudSamplesRef.current = [];
    phrasePitchFramesRef.current = [];
    phraseNoteEventsRef.current = [];
  }, [isOpen]);

  // Track step start timestamp when transitioning steps
  useEffect(() => {
    if (!isOpen) return;
    stepStartTimeRef.current = Date.now();
    lastMetricTimeRef.current = Date.now();
    rmsHistoryRef.current = [];
    setNoInputDetected(false);
  }, [isOpen, step]);

  // Input Health Check Timer (Distinguishes quiet room from no audio input signal)
  useEffect(() => {
    if (!isOpen || step === 'intro' || step === 'feedback' || step === 'success') return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceStart = now - stepStartTimeRef.current;
      const timeSinceMetric = now - lastMetricTimeRef.current;

      // 1. No DSP_METRICS messages arriving at all within 1.5s of step start
      if (timeSinceStart > 1500 && timeSinceMetric > 1500) {
        setNoInputDetected(true);
      } else if (timeSinceStart > 1500 && rmsHistoryRef.current.length >= 10) {
        // 2. Metrics arriving but pinned at absolute silence floor (<= -85dBFS or 0 variance)
        const minRms = Math.min(...rmsHistoryRef.current);
        const maxRms = Math.max(...rmsHistoryRef.current);
        const variance = maxRms - minRms;

        if (maxRms <= -85 || (variance === 0 && maxRms <= -75)) {
          setNoInputDetected(true);
        } else {
          setNoInputDetected(false);
        }
      } else {
        setNoInputDetected(false);
      }
    }, 250);

    return () => clearInterval(checkInterval);
  }, [isOpen, step]);

  // Start Calibration handler from Intro screen
  const handleStartCalibrationSequence = () => {
    initialGainRef.current = useAudioSettingsStore.getState().inputGainDb;
    quietSamplesRef.current = [];
    loudSamplesRef.current = [];
    phrasePitchFramesRef.current = [];
    phraseNoteEventsRef.current = [];
    stepStartTimeRef.current = Date.now();
    lastMetricTimeRef.current = Date.now();
    rmsHistoryRef.current = [];
    setNoInputDetected(false);
    setCountdown(5);
    setStep('quiet');
  };

  // Countdown timer per active step
  useEffect(() => {
    if (!isOpen || step === 'intro' || step === 'feedback' || step === 'success') return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (step === 'quiet') {
            setStep('loud');
            return 5;
          } else if (step === 'loud') {
            setStep('phrase');
            phrasePitchFramesRef.current = [];
            phraseNoteEventsRef.current = [];
            return 5;
          } else if (step === 'phrase') {
            clearInterval(interval);
            evaluatePhrasePitchDetection();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, step]);

  // Evaluates Pitch Detection Confidence Threshold (Hard Gate)
  const evaluatePhrasePitchDetection = () => {
    const quietAvg =
      quietSamplesRef.current.length > 0
        ? quietSamplesRef.current.reduce((a, b) => a + b, 0) / quietSamplesRef.current.length
        : -38;
    const loudAvg =
      loudSamplesRef.current.length > 0
        ? loudSamplesRef.current.reduce((a, b) => a + b, 0) / loudSamplesRef.current.length
        : -12;

    const qDb = Math.min(-20, Math.max(-60, Math.round(quietAvg)));
    const lDb = Math.max(-15, Math.min(-2, Math.round(loudAvg)));
    setQuietDbResult(qDb);
    setLoudDbResult(lDb);

    const pitches = phraseNoteEventsRef.current;
    const uniquePitches = new Set(pitches);
    const noteCount = uniquePitches.size;
    setDetectedNotesCount(noteCount);

    const pitchLow = pitches.length > 0 ? Math.min(...pitches) : 60;
    const pitchHigh = pitches.length > 0 ? Math.max(...pitches) : 60;
    setPitchRangeLowResult(pitchLow);
    setPitchRangeHighResult(pitchHigh);

    const validFrames = phrasePitchFramesRef.current;
    const avgClarity =
      validFrames.length > 0
        ? validFrames.reduce((acc, f) => acc + f.confidence, 0) / validFrames.length
        : 0;

    const snrMargin = lDb - qDb;

    const noteCountScore = Math.min(40, noteCount * 20);
    const clarityScore = Math.min(40, Math.round(avgClarity * 50));
    const snrScore = Math.min(20, Math.max(0, Math.round((snrMargin - 3) * 2.5)));

    const totalScore = Math.min(100, Math.max(0, noteCountScore + clarityScore + snrScore));
    setConfidenceScore(totalScore);

    const passedGate = totalScore >= 60 && noteCount >= 2;
    setIsVerifiedGateResult(passedGate);

    if (passedGate) {
      setStep('success');
    } else {
      setStep('feedback');
    }
  };

  const handleRetryPhraseStep = () => {
    phrasePitchFramesRef.current = [];
    phraseNoteEventsRef.current = [];
    setCountdown(5);
    setStep('phrase');
  };

  const handleFinishCalibration = async () => {
    const normalDb = Math.round((quietDbResult + loudDbResult) / 2);
    let toneSampleKey: string | null = null;

    if (audioEngine) {
      try {
        const snapshot = await audioEngine.getAudioSnapshot();
        if (snapshot && snapshot.length > 0) {
          toneSampleKey = `tone_sample_${Date.now()}`;
          await saveToneSample(toneSampleKey, snapshot, 44100);
        }
      } catch (err) {
        console.warn('Could not capture tone sample snapshot:', err);
      }
    }

    const conditioningMode: 'midi+audio' | 'audio-only' = isVerifiedGateResult
      ? 'midi+audio'
      : 'audio-only';

    const finalCalibration: CalibrationData = {
      quietDb: quietDbResult,
      normalDb,
      loudDb: loudDbResult,
      onsetThreshold: 3.5,
      pitchConfidenceScore: confidenceScore,
      isPitchVerified: isVerifiedGateResult,
      calibratedAtGainDb: initialGainRef.current,
      pitchRangeLow: pitchRangeLowResult,
      pitchRangeHigh: pitchRangeHighResult,
      toneSampleRef: toneSampleKey,
      conditioningMode,
    };

    // 1. Save numeric calibration data in Zustand localStorage store
    useCalibrationStore.getState().setCalibration(finalCalibration);

    // 2. Pass calibration to AudioEngine
    if (audioEngine) {
      audioEngine.setCalibration(finalCalibration);
    }

    onComplete(finalCalibration);
  };

  if (!isOpen) return null;

  // Visual meter calculations driven by exponentially smoothed RMS
  const fillPercent = Math.min(100, Math.max(0, ((smoothedRmsDb + 60) / 60) * 100));
  const circleDashOffset = 283 - (283 * (5 - countdown)) / 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-[#0d0e0f]/85 backdrop-blur-md animate-fade-in selection:bg-[#f2ca50] selection:text-[#3c2f00]">
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f2ca50] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#b4b2b2] rounded-full blur-[100px]" />
      </div>

      {/* Uniform Modal Container across ALL 6 screens */}
      <main className="relative z-10 w-full max-w-2xl min-h-[580px] h-[580px] bg-[#1e2020]/95 backdrop-blur-xl border border-[#f2ca50]/30 rounded-xl p-8 flex flex-col justify-between items-center text-center shadow-[0_16px_48px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Subtle top border highlight */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#f2ca50] to-transparent opacity-60" />

        {/* SCREEN 1: CALIBRATION INSTRUMENT (INTRO OVERVIEW) */}
        {step === 'intro' && (
          <div className="w-full flex flex-col justify-between h-full">
            {/* Header */}
            <div className="flex justify-between items-start w-full">
              <div className="text-left">
                <span className="font-mono text-xs text-[#f2ca50] uppercase tracking-widest block mb-1 font-bold">
                  AI Engine Calibration
                </span>
                <h1 className="font-serif text-2xl md:text-3xl text-[#e3e2e2] font-semibold">
                  Preparing Your Studio
                </h1>
              </div>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-2 rounded-full hover:bg-[#343535] cursor-pointer"
                  title="Close Calibration"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Intro Text */}
            <p className="text-sm md:text-base text-[#d0c5af] text-left my-4 leading-relaxed">
              To ensure the AI Engine accurately tracks your instrument's pitch and dynamics for the optimal performance experience, we need to calibrate your input signal. Please follow the three steps below.
            </p>

            {/* 3 Milled Steps Preview */}
            <div className="flex flex-col gap-3 my-auto w-full">
              {/* Step 1 Preview */}
              <div className="bg-[#0a0a0a] border border-[#1a1c1c] rounded-lg p-3.5 flex items-center gap-4 text-left shadow-inner">
                <div className="w-10 h-10 rounded-full bg-[#1e2020] flex items-center justify-center text-[#f2ca50] font-mono text-xs font-bold shrink-0">
                  01
                </div>
                <div>
                  <h3 className="font-mono text-xs text-[#e3e2e2] uppercase tracking-wider font-bold mb-0.5">Quiet</h3>
                  <p className="text-xs text-[#d0c5af]">Establishing the baseline noise floor of your environment.</p>
                </div>
              </div>

              {/* Step 2 Preview */}
              <div className="bg-[#0a0a0a] border border-[#1a1c1c] rounded-lg p-3.5 flex items-center gap-4 text-left shadow-inner">
                <div className="w-10 h-10 rounded-full bg-[#1e2020] flex items-center justify-center text-[#f2ca50] font-mono text-xs font-bold shrink-0">
                  02
                </div>
                <div>
                  <h3 className="font-mono text-xs text-[#e3e2e2] uppercase tracking-wider font-bold mb-0.5">Loud</h3>
                  <p className="text-xs text-[#d0c5af]">Setting peak performance levels to prevent clipping.</p>
                </div>
              </div>

              {/* Step 3 Preview */}
              <div className="bg-[#0a0a0a] border border-[#1a1c1c] rounded-lg p-3.5 flex items-center gap-4 text-left shadow-inner">
                <div className="w-10 h-10 rounded-full bg-[#1e2020] flex items-center justify-center text-[#f2ca50] font-mono text-xs font-bold shrink-0">
                  03
                </div>
                <div>
                  <h3 className="font-mono text-xs text-[#e3e2e2] uppercase tracking-wider font-bold mb-0.5">Phrase</h3>
                  <p className="text-xs text-[#d0c5af]">Confirming precise pitch detection across your instrument's range.</p>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="pt-4 w-full flex justify-center border-t border-[#4d4635]/30">
              <button
                onClick={handleStartCalibrationSequence}
                className="w-full md:w-auto bg-gradient-to-b from-[#f2ca50] to-[#d4af37] text-[#3c2f00] font-mono text-xs uppercase tracking-widest font-bold py-3.5 px-10 rounded shadow-[0_0_16px_rgba(212,175,55,0.3)] hover:shadow-[0_0_24px_rgba(212,175,55,0.5)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3v18M6 8v8M18 6v12M3 11v2M21 9v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span>Start Calibration</span>
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: STEP 1 - QUIET */}
        {step === 'quiet' && (
          <div className="w-full flex flex-col justify-between h-full">
            {/* Step Header & Live Activity Badge */}
            <div className="w-full flex justify-between items-center mb-2">
              <span className="font-mono text-xs text-[#f2ca50] tracking-widest border border-[#f2ca50]/30 px-3 py-1 rounded bg-[#121414]/50 font-bold">
                STEP 01/03
              </span>

              {/* Live Signal Activity Badge */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {noInputDetected ? (
                  <span className="text-[#ffb4ab] bg-[#93000a]/30 border border-[#ffb4ab]/40 px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" />
                    NO INPUT DETECTED
                  </span>
                ) : isSignalActive ? (
                  <span className="text-[#81c784] bg-[#1b5e20]/30 border border-[#81c784]/40 px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#81c784] shadow-[0_0_8px_rgba(129,199,132,0.8)]" />
                    SIGNAL ACTIVE
                  </span>
                ) : (
                  <span className="text-[#f2ca50] bg-[#121414]/50 border border-[#f2ca50]/30 px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50] opacity-80" />
                    LISTENING (QUIET ROOM)
                  </span>
                )}
              </div>

              {onSkip && (
                <button onClick={onSkip} className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-1 rounded-full cursor-pointer">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Header */}
            <div>
              <h1 className="font-serif text-2xl md:text-3xl text-[#e3e2e2] font-semibold mb-2">Play something quiet</h1>
              <p className="text-sm text-[#d0c5af] max-w-md mx-auto">Establishing noise floor. Please strum or sing softly for 5 seconds.</p>
            </div>

            {/* No Input Warning Overlay */}
            {noInputDetected && (
              <div className="w-full max-w-md mx-auto my-2 p-3 bg-[#93000a]/30 border border-[#ffb4ab]/50 rounded-lg flex items-center justify-between text-left animate-fade-in z-20 shadow-lg">
                <div className="flex items-center gap-2 text-xs text-[#ffdad6] font-mono">
                  <svg className="w-4 h-4 text-[#ffb4ab] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>No input detected — check your microphone selection in Settings.</span>
                </div>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="px-2.5 py-1 bg-[#3c2f00] border border-[#f2ca50]/50 text-[#f2ca50] hover:bg-[#f2ca50] hover:text-[#3c2f00] text-[10px] font-mono font-bold uppercase tracking-wider rounded transition-all shrink-0 ml-2 cursor-pointer"
                  >
                    Settings
                  </button>
                )}
              </div>
            )}

            {/* Progress Ring & Timer */}
            <div className="relative w-32 h-32 my-auto mx-auto flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1c1c" strokeWidth="4" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#f2ca50"
                  strokeWidth="4"
                  strokeDasharray="283"
                  strokeDashoffset={circleDashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                />
              </svg>
              <div className="font-serif text-3xl font-bold text-[#f2ca50]">0{countdown}s</div>
            </div>

            {/* Level Meter (Driven by exponentially smoothed RMS) */}
            <div className="w-full max-w-md mx-auto mb-4 flex flex-col items-center">
              <span className="font-mono text-[10px] text-[#f2ca50]/80 tracking-widest uppercase mb-1 font-bold">INPUT LEVEL</span>
              <div className="w-full h-4 bg-[#0d0e0f] rounded border border-[#4d4635]/50 overflow-hidden relative shadow-inner">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#343535] via-[#f2ca50] to-[#ffb4ab] transition-all duration-100 ease-out shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
              <div className="w-full flex justify-between px-1 mt-1 font-mono text-[10px] text-[#d0c5af]/60">
                <span>-60</span>
                <span>-40</span>
                <span>-20</span>
                <span>0 dBFS</span>
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-3 w-full flex justify-center border-t border-[#4d4635]/30">
              {onSkip && (
                <button onClick={onSkip} className="font-mono text-xs text-[#d0c5af] hover:text-[#f2ca50] transition-colors flex items-center gap-1 cursor-pointer">
                  <span>Skip Calibration</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 4 15 12 5 20 5 4" />
                    <line x1="19" y1="5" x2="19" y2="19" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 3: STEP 2 - LOUD */}
        {step === 'loud' && (
          <div className="w-full flex flex-col justify-between h-full">
            {/* Step Header & Live Activity Badge */}
            <div className="w-full flex justify-between items-center mb-2">
              <span className="font-mono text-xs text-[#f2ca50] tracking-widest border border-[#f2ca50]/30 px-3 py-1 rounded bg-[#121414]/50 font-bold">
                STEP 02/03
              </span>

              {/* Live Signal Activity Badge */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {noInputDetected ? (
                  <span className="text-[#ffb4ab] bg-[#93000a]/30 border border-[#ffb4ab]/40 px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" />
                    NO INPUT DETECTED
                  </span>
                ) : isSignalActive ? (
                  <span className="text-[#81c784] bg-[#1b5e20]/30 border border-[#81c784]/40 px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#81c784] shadow-[0_0_8px_rgba(129,199,132,0.8)]" />
                    SIGNAL ACTIVE
                  </span>
                ) : (
                  <span className="text-[#f2ca50] bg-[#121414]/50 border border-[#f2ca50]/30 px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50] opacity-80" />
                    LISTENING (QUIET ROOM)
                  </span>
                )}
              </div>

              {onSkip && (
                <button onClick={onSkip} className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-1 rounded-full cursor-pointer">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Header */}
            <div>
              <h1 className="font-serif text-2xl md:text-3xl text-[#e3e2e2] font-semibold mb-2">Play something loud</h1>
              <p className="text-sm text-[#d0c5af] max-w-md mx-auto">Setting peak levels. Play your instrument at full performance volume for 5 seconds.</p>
            </div>

            {/* No Input Warning Overlay */}
            {noInputDetected && (
              <div className="w-full max-w-md mx-auto my-2 p-3 bg-[#93000a]/30 border border-[#ffb4ab]/50 rounded-lg flex items-center justify-between text-left animate-fade-in z-20 shadow-lg">
                <div className="flex items-center gap-2 text-xs text-[#ffdad6] font-mono">
                  <svg className="w-4 h-4 text-[#ffb4ab] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>No input detected — check your microphone selection in Settings.</span>
                </div>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="px-2.5 py-1 bg-[#3c2f00] border border-[#f2ca50]/50 text-[#f2ca50] hover:bg-[#f2ca50] hover:text-[#3c2f00] text-[10px] font-mono font-bold uppercase tracking-wider rounded transition-all shrink-0 ml-2 cursor-pointer"
                  >
                    Settings
                  </button>
                )}
              </div>
            )}

            {/* Progress Ring & Timer */}
            <div className="relative w-32 h-32 my-auto mx-auto flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1c1c" strokeWidth="4" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#f2ca50"
                  strokeWidth="4"
                  strokeDasharray="283"
                  strokeDashoffset={circleDashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                />
              </svg>
              <div className="font-serif text-3xl font-bold text-[#f2ca50]">0{countdown}s</div>
            </div>

            {/* Level Meter (Driven by exponentially smoothed RMS) */}
            <div className="w-full max-w-md mx-auto mb-4 flex flex-col items-center">
              <span className="font-mono text-[10px] text-[#f2ca50]/80 tracking-widest uppercase mb-1 font-bold">PEAK DYNAMIC LEVEL</span>
              <div className="w-full h-4 bg-[#0d0e0f] rounded border border-[#4d4635]/50 overflow-hidden relative shadow-inner">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#343535] via-[#d4af37] to-[#ff5252] transition-all duration-100 ease-out shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
              <div className="w-full flex justify-between px-1 mt-1 font-mono text-[10px] text-[#d0c5af]/60">
                <span>-60</span>
                <span>-40</span>
                <span>-20</span>
                <span>0 dBFS</span>
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-3 w-full flex justify-center border-t border-[#4d4635]/30">
              {onSkip && (
                <button onClick={onSkip} className="font-mono text-xs text-[#d0c5af] hover:text-[#f2ca50] transition-colors flex items-center gap-1 cursor-pointer">
                  <span>Skip Calibration</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 4 15 12 5 20 5 4" />
                    <line x1="19" y1="5" x2="19" y2="19" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 4: STEP 3 - PHRASE */}
        {step === 'phrase' && (
          <div className="w-full flex flex-col justify-between h-full">
            {/* Step Header & Live Activity Badge */}
            <div className="w-full flex justify-between items-center mb-2">
              <span className="font-mono text-xs text-[#f2ca50] tracking-widest border border-[#f2ca50]/30 px-3 py-1 rounded bg-[#121414]/50 font-bold">
                STEP 03/03
              </span>

              {/* Live Signal Activity Badge */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {noInputDetected ? (
                  <span className="text-[#ffb4ab] bg-[#93000a]/30 border border-[#ffb4ab]/40 px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" />
                    NO INPUT DETECTED
                  </span>
                ) : isSignalActive ? (
                  <span className="text-[#81c784] bg-[#1b5e20]/30 border border-[#81c784]/40 px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#81c784] shadow-[0_0_8px_rgba(129,199,132,0.8)]" />
                    SIGNAL ACTIVE
                  </span>
                ) : (
                  <span className="text-[#f2ca50] bg-[#121414]/50 border border-[#f2ca50]/30 px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50] opacity-80" />
                    LISTENING...
                  </span>
                )}
              </div>
            </div>

            {/* Header */}
            <div>
              <h1 className="font-serif text-2xl md:text-3xl text-[#e3e2e2] font-semibold mb-1">Play a Phrase</h1>
              <p className="text-sm text-[#d0c5af] max-w-md mx-auto">Confirmation check. Play a short phrase so we can confirm pitch detection.</p>
            </div>

            {/* No Input Warning Overlay */}
            {noInputDetected && (
              <div className="w-full max-w-md mx-auto my-2 p-3 bg-[#93000a]/30 border border-[#ffb4ab]/50 rounded-lg flex items-center justify-between text-left animate-fade-in z-20 shadow-lg">
                <div className="flex items-center gap-2 text-xs text-[#ffdad6] font-mono">
                  <svg className="w-4 h-4 text-[#ffb4ab] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>No input detected — check your microphone selection in Settings.</span>
                </div>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="px-2.5 py-1 bg-[#3c2f00] border border-[#f2ca50]/50 text-[#f2ca50] hover:bg-[#f2ca50] hover:text-[#3c2f00] text-[10px] font-mono font-bold uppercase tracking-wider rounded transition-all shrink-0 ml-2 cursor-pointer"
                  >
                    Settings
                  </button>
                )}
              </div>
            )}

            {/* Waveform & Detected Pitch Box (Driven by smoothed RMS & live metrics) */}
            <div className="w-full max-w-md mx-auto my-auto bg-[#0a0a0a] border border-[#4d4635]/40 rounded-lg p-4 flex flex-col justify-between relative shadow-inner h-44">
              <div className="flex justify-between items-center font-mono text-xs z-10">
                <span className="text-[#d0c5af]/70 font-bold">DETECTED PITCH</span>
                <span className="text-[#f2ca50] font-bold text-lg tracking-widest">
                  {midiToNoteName(liveDetectedNote)} {livePitchConfidence > 0 ? `(${Math.round(livePitchConfidence * 100)}%)` : ''}
                </span>
              </div>

              {/* Animated Wave Bars (Driven by smoothed RMS & live activity) */}
              <div className="flex items-center justify-center gap-1.5 h-20 my-auto">
                {[40, 65, 30, 85, 50, 95, 70, 90, 45, 60, 80, 35, 75].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-[#f2ca50] rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(242,202,80,0.5)]"
                    style={{
                      height: livePitchConfidence > 0.3 || fillPercent > 10 ? `${Math.max(10, Math.min(64, (h * fillPercent) / 100))}px` : '8px',
                      opacity: isSignalActive || livePitchConfidence > 0.3 ? 0.95 : 0.3,
                    }}
                  />
                ))}
              </div>

              {/* Input Level Bar */}
              <div className="w-full h-1.5 bg-[#1e2020] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#343535] via-[#f2ca50] to-[#ffb4ab] transition-all duration-100 ease-out"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 w-full flex justify-between items-center border-t border-[#4d4635]/30">
              <button
                onClick={handleRetryPhraseStep}
                className="font-mono text-xs text-[#d0c5af] hover:text-[#f2ca50] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Reset Step</span>
              </button>

              <button
                onClick={evaluatePhrasePitchDetection}
                className="bg-[#f2ca50] text-[#3c2f00] font-mono text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded shadow-[0_0_12px_rgba(242,202,80,0.3)] hover:shadow-[0_0_20px_rgba(242,202,80,0.5)] transition-all cursor-pointer active:scale-95"
              >
                Finish Setup
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 5: FEEDBACK (HARD GATE BLOCKED) */}
        {step === 'feedback' && (
          <div className="w-full flex flex-col justify-between h-full">
            {/* Badge */}
            <div className="w-full flex justify-center mb-2">
              <span className="font-mono text-xs text-[#ffb4ab] tracking-widest border border-[#ffb4ab]/40 px-3 py-1 rounded bg-[#93000a]/20 font-bold uppercase">
                HARD GATE BLOCKED
              </span>
            </div>

            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-[#93000a]/20 border border-[#ffb4ab]/30 flex items-center justify-center mx-auto my-2 text-[#ffb4ab] shadow-[0_0_24px_rgba(255,180,171,0.2)]">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            {/* Header */}
            <div>
              <h1 className="font-serif text-2xl md:text-3xl text-[#e3e2e2] font-semibold mb-2">Low Pitch Confidence</h1>
              <p className="text-sm text-[#d0c5af] max-w-md mx-auto">
                We detected low pitch confidence ({confidenceScore}% score, {detectedNotesCount} distinct notes). Try playing clearer notes or turning up your input gain.
              </p>
            </div>

            {/* Score Readout Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto my-3 p-3 bg-[#0a0a0a] border border-[#4d4635]/30 rounded-lg text-center font-mono">
              <div>
                <span className="text-[10px] text-[#d0c5af]/60 block">SCORE</span>
                <span className="text-sm font-bold text-[#ffb4ab]">{confidenceScore}%</span>
              </div>
              <div>
                <span className="text-[10px] text-[#d0c5af]/60 block">NOTES</span>
                <span className="text-sm font-bold text-[#e3e2e2]">{detectedNotesCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#d0c5af]/60 block">SNR</span>
                <span className="text-sm font-bold text-[#f2ca50]">{loudDbResult - quietDbResult} dB</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 w-full flex flex-col gap-2.5 items-center border-t border-[#4d4635]/30">
              <button
                onClick={handleRetryPhraseStep}
                className="w-full max-w-xs bg-gradient-to-b from-[#f2ca50] to-[#d4af37] text-[#3c2f00] font-mono text-xs uppercase tracking-widest font-bold py-3 px-6 rounded shadow-[0_0_16px_rgba(212,175,55,0.3)] hover:shadow-[0_0_24px_rgba(212,175,55,0.5)] transition-all cursor-pointer active:scale-95"
              >
                Retry Step 3 Phrase
              </button>

              <button
                onClick={handleFinishCalibration}
                className="font-mono text-xs text-[#d0c5af] hover:text-[#e3e2e2] transition-colors cursor-pointer"
              >
                Accept Calibration Anyway
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 6: SUCCESS (CALIBRATION PASSED) */}
        {step === 'success' && (
          <div className="w-full flex flex-col justify-between h-full">
            {/* Badge */}
            <div className="w-full flex justify-center mb-2">
              <span className="font-mono text-xs text-[#81c784] tracking-widest border border-[#81c784]/40 px-3 py-1 rounded bg-[#1b5e20]/20 font-bold uppercase">
                CALIBRATION PASSED
              </span>
            </div>

            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-[#1b5e20]/30 border border-[#81c784]/40 flex items-center justify-center mx-auto my-2 text-[#81c784] shadow-[0_0_24px_rgba(129,199,132,0.3)]">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* Header */}
            <div>
              <h1 className="font-serif text-2xl md:text-3xl text-[#e3e2e2] font-semibold mb-2">Calibration Complete</h1>
              <p className="text-sm text-[#d0c5af] max-w-md mx-auto">
                Input confirmed ({confidenceScore}% confidence). Your studio environment is optimized and ready for recording.
              </p>
            </div>

            {/* Status Bar */}
            <div className="w-full max-w-xs mx-auto my-3">
              <span className="font-mono text-[10px] text-[#81c784] font-bold block mb-1 uppercase tracking-widest">
                SYSTEM STATUS: 100% OPTIMIZED
              </span>
              <div className="h-1.5 w-full bg-[#0a0a0a] rounded-full overflow-hidden border border-[#4d4635]/30">
                <div className="h-full bg-[#81c784] w-full shadow-[0_0_8px_rgba(129,199,132,0.8)]" />
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-3 w-full flex justify-center border-t border-[#4d4635]/30">
              <button
                onClick={handleFinishCalibration}
                className="w-full max-w-xs bg-gradient-to-b from-[#f2ca50] to-[#d4af37] text-[#3c2f00] font-mono text-xs uppercase tracking-widest font-bold py-3.5 px-8 rounded shadow-[0_0_16px_rgba(212,175,55,0.4)] hover:shadow-[0_0_24px_rgba(212,175,55,0.6)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Continue to Studio</span>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2.5" fill="none" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
