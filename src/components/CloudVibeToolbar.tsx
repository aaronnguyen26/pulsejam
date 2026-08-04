'use client';

import React from 'react';
import { CloudVibeMetrics } from '@/lib/audio/types';

interface CloudVibeToolbarProps {
  metrics: CloudVibeMetrics | null;
  onToggle: () => void;
  onOpenSettings: () => void;
  onVolumeChange: (vol: number) => void;
  onStop: () => void;
}

function formatSessionTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const CloudVibeToolbar: React.FC<CloudVibeToolbarProps> = ({
  metrics,
  onToggle,
  onOpenSettings,
  onVolumeChange,
  onStop,
}) => {
  const status = metrics?.status || 'OFF';
  const hasKey = metrics?.hasApiKey ?? false;
  const elapsedSec = metrics?.sessionElapsedSec || 0;
  const rotationCount = metrics?.rotationCount || 0;
  const volume = metrics?.volume ?? 0.5;

  const isConnected = status === 'CONNECTED' || status === 'ROTATING';
  const timeRemaining = Math.max(0, 540 - elapsedSec);

  return (
    <section
      aria-label="Cloud Vibe Layer Controls and Telemetry"
      className="rack-module rounded-2xl p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Status & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            disabled={!hasKey && status === 'OFF'}
            aria-label="Toggle Cloud Vibe Layer"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold font-mono transition cursor-pointer ${
              isConnected
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : status === 'CONNECTING'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                : 'bg-black/40 text-slate-400 border-white/10 hover:border-white/20'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isConnected
                  ? 'bg-amber-400 animate-pulse'
                  : status === 'CONNECTING'
                  ? 'bg-cyan-400 animate-ping'
                  : 'bg-slate-600'
              }`}
            />
            <span>
              CLOUD VIBE: {status === 'NO_KEY' ? 'NO KEY' : status}
            </span>
          </button>

          {/* Settings Modal Gear Trigger */}
          <button
            onClick={onOpenSettings}
            aria-label="Open Cloud Vibe Settings Modal"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>{hasKey ? 'BYOK Settings' : 'Add API Key'}</span>
          </button>
        </div>

        {/* Center Live Session Timer & Rotation Readiness */}
        {isConnected && (
          <div className="flex items-center gap-3 font-mono-tech text-xs bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-slate-400">
              Session: <strong className="text-amber-400 tabular-nums">{formatSessionTime(elapsedSec)}</strong> / 09:00
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Auto-Rotate in: <strong className="text-cyan-300 tabular-nums">{formatSessionTime(timeRemaining)}</strong>
            </span>
            {rotationCount > 0 && (
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                {rotationCount} Rotations
              </span>
            )}
          </div>
        )}

        {/* Right Side Volume Slider & Emergency Stop */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              aria-label="Cloud Vibe Layer Volume"
              className="w-20 accent-amber-400 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-300 w-8 tabular-nums">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Unmistakable Emergency STOP Control */}
          {isConnected && (
            <button
              onClick={onStop}
              aria-label="Emergency Stop Cloud Vibe Layer"
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold font-mono text-xs shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              <span>STOP CLOUD VIBE</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Message Banner */}
      {status === 'ERROR' && metrics?.errorMessage && (
        <div className="rounded-xl p-3 bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{metrics.errorMessage}</span>
          </div>
          <button
            onClick={onOpenSettings}
            className="text-amber-300 underline hover:text-amber-200 cursor-pointer"
          >
            Check Settings
          </button>
        </div>
      )}

      {/* Active Weighted Prompts Tags Stream */}
      {isConnected && metrics?.activePrompts && metrics.activePrompts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 font-mono-tech text-xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Active Telemetry Prompts:
          </span>
          {metrics.activePrompts.map((p, idx) => (
            <span
              key={idx}
              className="bg-black/40 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]"
            >
              "{p.text}": <strong className="text-white">{p.weight}</strong>
            </span>
          ))}
          <span className="text-[10px] text-slate-500 ml-auto">
            Density: <strong className="text-cyan-300">{metrics.density}</strong> · Brightness: <strong className="text-cyan-300">{metrics.brightness}</strong>
          </span>
        </div>
      )}
    </section>
  );
};
