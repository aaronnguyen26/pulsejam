'use client';

import React from 'react';
import { OperatingMode, PerformanceTier, StemSourceType } from '@/lib/audio/types';

interface ControlPanelProps {
  isMicActive: boolean;
  mode: OperatingMode;
  activeTier: PerformanceTier;
  stemSource: StemSourceType;
  onToggleMic: () => void;
  onSelectMode: (mode: OperatingMode, overrideTier?: PerformanceTier) => void;
  onChangeStemSource: (source: StemSourceType) => void;
  onOpenCalibration: () => void;
}

const MicIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {active ? (
      /* Mic-off: strikethrough */
      <>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
        <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    ) : (
      /* Mic on */
      <>
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    )}
  </svg>
);

const CalibIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
  </svg>
);

const TIERS: { id: PerformanceTier; label: string; sub: string; activeClass: string }[] = [
  { id: 'chill',  label: 'Chill',  sub: 'Quiet / ambient',      activeClass: 'border-[var(--col-ice)] bg-[rgba(0,212,255,0.08)] text-[var(--col-ice)]' },
  { id: 'groove', label: 'Groove', sub: 'Rhythm + bass',         activeClass: 'border-[var(--col-ember)] bg-[rgba(255,140,0,0.08)] text-[var(--col-ember)]' },
  { id: 'peak',   label: 'Peak',   sub: 'Full arrangement',      activeClass: 'border-[var(--col-surge)] bg-[rgba(255,45,110,0.08)] text-[var(--col-surge)]' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isMicActive,
  mode,
  activeTier,
  stemSource,
  onToggleMic,
  onSelectMode,
  onChangeStemSource,
  onOpenCalibration,
}) => {
  return (
    <section
      aria-label="Performance controls"
      className="rack-module rounded-2xl p-5 space-y-5"
    >
      {/* ── Row 1: Mic + Calibrate + Stems source ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mic + Calibrate */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMic}
            aria-label={isMicActive ? 'Stop listening' : 'Start listening'}
            className={`mic-btn ${isMicActive ? 'mic-btn-stop' : 'mic-btn-start'} flex-1`}
          >
            <MicIcon active={isMicActive} />
            {isMicActive ? 'Stop' : 'Start playing'}
          </button>

          <button
            onClick={onOpenCalibration}
            disabled={!isMicActive}
            aria-label="Calibrate volume thresholds"
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-sm font-medium hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer active:scale-[0.98]"
          >
            <CalibIcon />
            Calibrate
          </button>
        </div>

        {/* Stems source — segmented control */}
        <div className="flex flex-col gap-2">
          <span className="section-label">Backing stems</span>
          <div className="flex rounded-lg border border-white/8 overflow-hidden bg-black/30">
            {(['synthetic', 'files'] as StemSourceType[]).map((src, idx) => (
              <button
                key={src}
                onClick={() => onChangeStemSource(src)}
                aria-pressed={stemSource === src}
                className={`flex-1 py-2.5 px-4 text-sm font-medium transition cursor-pointer ${
                  idx === 0 ? '' : 'border-l border-white/8'
                } ${
                  stemSource === src
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {src === 'synthetic' ? 'Synth (built-in)' : 'MP3 files'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 leading-snug">
            {stemSource === 'synthetic'
              ? 'Generates 3 tempo-locked loops locally — no files needed.'
              : 'Loads stem files from /public/audio/ — place your MP3s there.'}
          </p>
        </div>
      </div>

      {/* ── Row 2: Tier overrides ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="section-label">Manual override</span>
          <span
            className="text-xs font-medium"
            style={{ fontFamily: 'var(--font-data)', color: mode === 'LIVE' ? 'var(--col-ice)' : 'var(--col-ember)' }}
          >
            {mode === 'LIVE' ? 'Auto (reactive)' : `Locked: ${activeTier}`}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {/* Auto mode */}
          <button
            onClick={() => onSelectMode('LIVE')}
            aria-pressed={mode === 'LIVE'}
            className={`py-3 px-3 rounded-lg border text-sm font-semibold flex flex-col items-center gap-1 cursor-pointer transition active:scale-[0.98] ${
              mode === 'LIVE'
                ? 'border-[var(--col-ice)] bg-[rgba(0,212,255,0.08)] text-[var(--col-ice)]'
                : 'border-white/8 bg-black/20 text-slate-400 hover:border-white/15 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${mode === 'LIVE' ? 'bg-[var(--col-ice)] animate-pulse' : 'bg-slate-600'}`}
              />
              Auto
            </span>
            <span className="text-[10px] text-slate-500 font-normal">Reactive</span>
          </button>

          {/* Tier overrides */}
          {TIERS.map((tier) => {
            const isActive = mode === 'OVERRIDE' && activeTier === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => onSelectMode('OVERRIDE', tier.id)}
                aria-pressed={isActive}
                className={`py-3 px-3 rounded-lg border text-sm font-semibold flex flex-col items-center gap-1 cursor-pointer transition active:scale-[0.98] ${
                  isActive
                    ? tier.activeClass
                    : 'border-white/8 bg-black/20 text-slate-400 hover:border-white/15 hover:text-slate-200'
                }`}
              >
                {tier.label}
                <span className="text-[10px] text-slate-500 font-normal">{tier.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
