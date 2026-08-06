'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { CalibrationData, DSPMetrics } from '@/lib/audio/types';

interface RefinedCalibrationModalProps {
  isOpen: boolean;
  audioEngine: AudioEngine | null;
  onComplete: (calibration: CalibrationData) => void;
  onSkip: () => void;
}

export function RefinedCalibrationModal({
  isOpen,
  audioEngine,
  onComplete,
  onSkip,
}: RefinedCalibrationModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [countdown, setCountdown] = useState(5);
  const [currentRmsDb, setCurrentRmsDb] = useState(-80);
  const [peakAmp, setPeakAmp] = useState(0);

  const quietSamplesRef = useRef<number[]>([]);
  const loudSamplesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Reset state on open
    setStep(1);
    setCountdown(5);
    quietSamplesRef.current = [];
    loudSamplesRef.current = [];

    if (!audioEngine) return;

    const unsubscribe = audioEngine.subscribeMetrics((metrics: DSPMetrics) => {
      setCurrentRmsDb(metrics.rawRmsDb);
      setPeakAmp(metrics.peakAmplitude || Math.pow(10, metrics.rawRmsDb / 20));

      if (step === 1) {
        quietSamplesRef.current.push(metrics.rawRmsDb);
      } else if (step === 2) {
        loudSamplesRef.current.push(metrics.rawRmsDb);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, audioEngine, step]);

  // Countdown timer per step
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (step === 1) {
            setStep(2);
            return 5;
          } else {
            // Finished step 2 -> finalize calibration
            clearInterval(interval);

            const quietAvg =
              quietSamplesRef.current.length > 0
                ? quietSamplesRef.current.reduce((a, b) => a + b, 0) / quietSamplesRef.current.length
                : -38;
            const loudAvg =
              loudSamplesRef.current.length > 0
                ? loudSamplesRef.current.reduce((a, b) => a + b, 0) / loudSamplesRef.current.length
                : -12;

            const quietDb = Math.min(-20, Math.max(-60, Math.round(quietAvg)));
            const loudDb = Math.max(-15, Math.min(-2, Math.round(loudAvg)));
            const normalDb = Math.round((quietDb + loudDb) / 2);

            const finalCalibration: CalibrationData = {
              quietDb,
              normalDb,
              loudDb,
              onsetThreshold: 3.5,
            };

            if (audioEngine) {
              audioEngine.setCalibration(finalCalibration);
            }

            onComplete(finalCalibration);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, step, audioEngine, onComplete]);

  if (!isOpen) return null;

  // Level bar percentage calculation (dB map from -60 to 0)
  const fillPercent = Math.min(100, Math.max(0, ((currentRmsDb + 60) / 60) * 100));
  const circleOffset = ((5 - countdown) / 5) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0d0e0f]/80 backdrop-blur-md">
      {/* Main Modal Container */}
      <div className="relative w-full max-w-md bg-[#1e2020]/90 backdrop-blur-xl border border-[#f2ca50]/30 rounded-2xl p-8 flex flex-col items-center text-center shadow-[0_16px_48px_rgba(0,0,0,0.8)]">
        {/* Step Badge */}
        <div className="absolute top-4 left-6 flex items-center gap-2 opacity-70">
          <span className="font-mono text-[11px] text-[#d0c5af] uppercase tracking-widest font-bold">
            STEP 0{step}/02
          </span>
        </div>

        {/* Content Section */}
        <div className="flex flex-col items-center mt-4 mb-6">
          <h2 className="font-serif text-2xl font-bold text-[#f2ca50] mb-2 drop-shadow-[0_0_8px_rgba(242,202,80,0.4)]">
            {step === 1 ? 'Play something quiet' : 'Play something loud'}
          </h2>
          <p className="font-sans text-sm text-[#d0c5af] max-w-[280px]">
            {step === 1
              ? 'Establishing noise floor. Please strum or sing softly for 5 seconds.'
              : 'Establishing peak thresholds. Please play at max volume for 5 seconds.'}
          </p>
        </div>

        {/* Visualizer Level Meter */}
        <div className="w-full h-8 bg-[#0a0a0a] border border-[#4d4635]/40 rounded-full overflow-hidden relative mb-6 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
          {/* Grid Markers */}
          <div className="absolute inset-0 flex justify-between px-3 items-center pointer-events-none opacity-20 z-0">
            <div className="w-px h-full bg-[#e3e2e2]" />
            <div className="w-px h-full bg-[#e3e2e2]" />
            <div className="w-px h-full bg-[#e3e2e2]" />
            <div className="w-px h-full bg-[#ffb4ab]" />
          </div>
          {/* Dynamic Fill Bar */}
          <div
            className="h-full bg-gradient-to-r from-[#d4af37] via-[#f2ca50] to-[#ffe088] transition-all duration-75 rounded-full shadow-[0_0_12px_rgba(242,202,80,0.5)]"
            style={{ width: `${fillPercent}%` }}
          />
        </div>

        {/* Circular SVG Progress Countdown */}
        <div className="relative w-16 h-16 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-[#343535]"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path
              className="text-[#f2ca50] transition-all duration-1000 ease-linear"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray="100"
              strokeDashoffset={circleOffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xs font-bold text-[#f2ca50]">
              0{countdown}s
            </span>
          </div>
        </div>

        {/* Skip Action Button */}
        <button
          onClick={onSkip}
          className="font-mono text-[11px] text-[#d0c5af] hover:text-[#f2ca50] transition-colors uppercase tracking-widest bg-transparent border-none cursor-pointer py-1 px-3"
        >
          Skip Calibration
        </button>
      </div>
    </div>
  );
}
