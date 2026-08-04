'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CalibrationData, DSPMetrics } from '@/lib/audio/types';

interface CalibrationWizardProps {
  currentMetrics: DSPMetrics | null;
  onComplete: (calibration: CalibrationData) => void;
  onCancel?: () => void;
}

type Step = 'intro' | 'quiet' | 'normal' | 'loud' | 'complete';

const STEP_ORDER: ('quiet' | 'normal' | 'loud')[] = ['quiet', 'normal', 'loud'];

const STEP_CONFIG: Record<Exclude<Step, 'intro' | 'complete'>, {
  num: string;
  heading: string;
  instruction: string;
  color: string;
  glow: string;
  bg: string;
  border: string;
}> = {
  quiet: {
    num: '1 / 3',
    heading: 'Play quietly now',
    instruction: 'Pick lightly, or strum softly. Give us your quietest real playing — not silence.',
    color: 'var(--col-ice)',
    glow: '0 0 32px rgba(0,212,255,0.25)',
    bg: 'rgba(0,212,255,0.06)',
    border: 'rgba(0,212,255,0.2)',
  },
  normal: {
    num: '2 / 3',
    heading: 'Play at normal volume',
    instruction: 'Play like you would in an actual session — your comfortable everyday level.',
    color: 'var(--col-ember)',
    glow: '0 0 32px rgba(255,140,0,0.25)',
    bg: 'rgba(255,140,0,0.06)',
    border: 'rgba(255,140,0,0.2)',
  },
  loud: {
    num: '3 / 3',
    heading: 'Play as loud as you get',
    instruction: 'Full energy — the peak level you\'d reach during an actual solo or climax.',
    color: 'var(--col-surge)',
    glow: '0 0 32px rgba(255,45,110,0.25)',
    bg: 'rgba(255,45,110,0.06)',
    border: 'rgba(255,45,110,0.2)',
  },
};

export const CalibrationWizard: React.FC<CalibrationWizardProps> = ({
  currentMetrics,
  onComplete,
  onCancel,
}) => {
  const [step, setStep]       = useState<Step>('intro');
  const [countdown, setCountdown] = useState(3);

  const [quietDb,  setQuietDb]  = useState<number | null>(null);
  const [normalDb, setNormalDb] = useState<number | null>(null);
  const [loudDb,   setLoudDb]   = useState<number | null>(null);

  const metricsRef = useRef<DSPMetrics | null>(currentMetrics);
  metricsRef.current = currentMetrics;
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const startStep = (targetStep: Step) => {
    setStep(targetStep);
    setCountdown(3);

    let remaining = 3;
    const captured: number[] = [];

    const interval = setInterval(() => {
      if (metricsRef.current) captured.push(metricsRef.current.rawRmsDb);
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        finishStep(targetStep, captured);
      }
    }, 1000);

    timerRef.current = interval;
  };

  const finishStep = (completedStep: Step, samples: number[]) => {
    const valid = samples.filter(v => isFinite(v) && v > -100);
    const avg   = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : -40;

    if (completedStep === 'quiet') {
      setQuietDb(avg);
      setStep('normal');
    } else if (completedStep === 'normal') {
      setNormalDb(avg);
      setStep('loud');
    } else if (completedStep === 'loud') {
      setLoudDb(avg);
      const q = quietDb  ?? -45;
      const n = normalDb ?? -25;
      const l = avg;
      const calibration: CalibrationData = {
        quietDb:         Math.min(-15, Math.max(-60, q + 0.45 * (n - q))),
        normalDb:        n,
        loudDb:          Math.min(-5,  Math.max(-25, n + 0.5 * (l - n))),
        onsetThreshold:  3.5,
      };
      onComplete(calibration);
      setStep('complete');
    }
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Level bar — 0–100%
  const levelPct = Math.min(100, Math.max(0, ((currentMetrics?.rawRmsDb ?? -80) + 80) * 1.25));

  const isActiveStep = (s: Step): s is 'quiet' | 'normal' | 'loud' =>
    s === 'quiet' || s === 'normal' || s === 'loud';

  // cfg is derived inside JSX only when isActiveStep(step) is true
  const cfg = isActiveStep(step) ? STEP_CONFIG[step] : null;
  // fallback for header strip coloring when not in an active step
  const headerColor  = cfg?.color  ?? 'rgba(255,255,255,0.1)';
  const headerBg     = cfg?.bg     ?? 'rgba(255,255,255,0.02)';
  const headerBorder = cfg?.border ?? 'rgba(255,255,255,0.08)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calibration-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <div
        className="rack-module w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ border: `1px solid ${headerBorder}` }}
      >
        {/* ── Header strip ── */}
        <div
          className="px-6 py-4 border-b"
          style={{
            borderColor: headerBorder,
            background:  headerBg,
          }}
        >
          <div className="flex items-center justify-between">
            <h2
              id="calibration-title"
              className="text-sm font-semibold text-white"
            >
              Calibrate
            </h2>
            {onCancel && step === 'intro' && (
              <button
                onClick={onCancel}
                aria-label="Close calibration"
                className="text-slate-400 hover:text-white text-xs px-3 py-1 rounded-md border border-white/10 hover:border-white/20 transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Step progress dots */}
          {step !== 'intro' && step !== 'complete' && (
            <div className="flex items-center gap-2 mt-3">
              {STEP_ORDER.map((s) => {
                const isActive = step === s;
                const isDone   = STEP_ORDER.indexOf(s) < STEP_ORDER.indexOf(step as 'quiet' | 'normal' | 'loud');
                return (
                  <div
                    key={s}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      background: isDone || isActive ? headerColor : 'rgba(255,255,255,0.08)',
                      opacity: isActive ? 1 : isDone ? 0.6 : 1,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-6">

          {/* ── INTRO ── */}
          {step === 'intro' && (
            <div className="space-y-5">
              <p className="text-sm text-slate-300 leading-relaxed">
                PulseJam needs to learn your volume range so it knows when you're playing quietly, normally, or at full energy. Takes about 12 seconds.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {STEP_ORDER.map((s) => {
                  const c = STEP_CONFIG[s];
                  return (
                    <div
                      key={s}
                      className="rounded-lg p-3 text-center border"
                      style={{ background: c.bg, borderColor: c.border }}
                    >
                      <span
                        className="block text-xs font-semibold mb-1"
                        style={{ color: c.color }}
                      >
                        {s === 'quiet' ? 'Quiet' : s === 'normal' ? 'Normal' : 'Loud'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {s === 'quiet'  ? '3 seconds' : s === 'normal' ? '3 seconds' : '3 seconds'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => startStep('quiet')}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.1))',
                  border: '1px solid rgba(0,212,255,0.3)',
                }}
              >
                Start calibration →
              </button>
            </div>
          )}

          {/* ── ACTIVE STEP ── */}
          {isActiveStep(step) && cfg && (
            <div className="space-y-5 text-center">
              {/* Step number */}
              <span
                className="inline-block text-xs font-medium px-3 py-1 rounded-full"
                style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
              >
                Step {cfg.num}
              </span>

              {/* Countdown ring */}
              <div
                className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: cfg.color,
                  boxShadow: cfg.glow,
                  background: cfg.bg,
                }}
              >
                <span
                  className="text-5xl font-bold leading-none"
                  style={{ fontFamily: 'var(--font-data)', color: cfg.color }}
                >
                  {countdown}
                </span>
              </div>

              <div>
                <h3
                  className="text-lg font-semibold text-white mb-1"
                >
                  {cfg.heading}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {cfg.instruction}
                </p>
              </div>

              {/* Live level bar */}
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full overflow-hidden bg-black/50 border border-white/8">
                  <div
                    className="h-full rounded-full transition-all duration-75"
                    style={{
                      width: `${levelPct}%`,
                      background: `linear-gradient(90deg, var(--col-ice), var(--col-ember), var(--col-surge))`,
                    }}
                  />
                </div>
                <p
                  className="text-xs text-slate-500 text-right"
                  style={{ fontFamily: 'var(--font-data)' }}
                >
                  {(currentMetrics?.rawRmsDb ?? -80).toFixed(1)} dB
                </p>
              </div>
            </div>
          )}

          {/* ── COMPLETE ── */}
          {step === 'complete' && (
            <div className="space-y-5 text-center">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--col-ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white mb-1">All set</h3>
                <p className="text-sm text-slate-400">
                  Thresholds locked in. PulseJam will now react to your playing.
                </p>
              </div>

              <div
                className="grid grid-cols-2 gap-3 text-left p-4 rounded-xl border border-white/8"
                style={{ background: 'rgba(255,255,255,0.03)', fontFamily: 'var(--font-data)' }}
              >
                <div>
                  <span className="section-label block mb-1">Chill → Groove</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--col-ice)' }}>
                    {quietDb !== null && normalDb !== null
                      ? (quietDb + 0.45 * (normalDb - quietDb)).toFixed(1)
                      : '–'} dB
                  </span>
                </div>
                <div>
                  <span className="section-label block mb-1">Groove → Peak</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--col-surge)' }}>
                    {normalDb !== null && loudDb !== null
                      ? (normalDb + 0.5 * (loudDb - normalDb)).toFixed(1)
                      : '–'} dB
                  </span>
                </div>
              </div>

              <button
                onClick={() => onComplete({
                  quietDb:  quietDb  !== null && normalDb !== null ? quietDb + 0.45 * (normalDb - quietDb) : -33,
                  normalDb: normalDb ?? -22,
                  loudDb:   normalDb !== null && loudDb  !== null ? normalDb + 0.5 * (loudDb - normalDb)  : -15,
                  onsetThreshold: 3.5,
                })}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-slate-950 cursor-pointer transition active:scale-[0.98]"
                style={{ background: 'var(--col-ok)' }}
              >
                Start playing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
