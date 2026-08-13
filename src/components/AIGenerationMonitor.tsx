'use client';

import React, { useState } from 'react';
import { AIAudioStreamMetrics, SidecarStatus } from '@/lib/audio/types';

interface AIGenerationMonitorProps {
  sidecarStatus: SidecarStatus | null;
  aiStreamMetrics: AIAudioStreamMetrics | null;
  onResetReceiver?: () => void;
}

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
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
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const AIGenerationMonitor: React.FC<AIGenerationMonitorProps> = ({
  sidecarStatus,
  aiStreamMetrics,
  onResetReceiver,
}) => {
  const [expanded, setExpanded] = useState(true);

  const sidecarState = sidecarStatus?.state || 'unavailable';
  const rttMs = sidecarStatus?.roundTripMs ?? null;

  const streamState = aiStreamMetrics?.state || 'idle';
  const bufferDepthMs = aiStreamMetrics?.bufferDepthMs ?? 0;
  const bufferDepthChunks = aiStreamMetrics?.bufferDepthChunks ?? 0;
  const underrunCount = aiStreamMetrics?.underrunCount ?? 0;

  const getStatusLedColor = () => {
    if (sidecarState === 'connected' && streamState === 'streaming') return 'bg-emerald-400 led-emerald';
    if (sidecarState === 'high-latency' || streamState === 'buffering') return 'bg-amber-400 led-ember';
    if (streamState === 'stalled') return 'bg-rose-400 led-rose';
    return 'bg-slate-500';
  };

  return (
    <section
      aria-label="MRT2 Real-Time Stream & Sidecar Telemetry Monitor"
      className="rack-module rounded-2xl overflow-hidden border border-white/10 bg-[#171919]"
    >
      {/* Header Bar / Toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${getStatusLedColor()} animate-pulse`} />
            <span className="text-sm font-semibold text-slate-200">
              Stage 2 MRT2 Audio Stream Monitor
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono-tech text-xs">
            <span className="text-slate-400">
              Sidecar RTT: <strong className="text-amber-400 font-bold">{rttMs !== null ? `${rttMs} ms` : '--'}</strong>
            </span>
            <span className="text-slate-400">
              Jitter Buffer: <strong className="text-cyan-400 font-bold">{bufferDepthMs} ms ({bufferDepthChunks} chunks)</strong>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                streamState === 'streaming'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                  : streamState === 'buffering'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}
            >
              {streamState.toUpperCase()}
            </span>
          </div>
        </div>

        <ChevronIcon open={expanded} />
      </button>

      {/* Expanded Telemetry Readout Cards */}
      {expanded && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono-tech">
            {/* 1. Sidecar RTT Latency */}
            <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                SIDECAR RTT LATENCY
              </span>
              <span className="text-xl font-bold text-amber-400 tabular-nums">
                {rttMs !== null ? `${rttMs} ms` : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 uppercase">
                {sidecarState}
              </span>
            </div>

            {/* 2. Jitter Buffer Depth */}
            <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                JITTER BUFFER DEPTH
              </span>
              <span className="text-xl font-bold text-cyan-300 tabular-nums">
                {bufferDepthMs} ms
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                {bufferDepthChunks} CHUNKS (40MS EA)
              </span>
            </div>

            {/* 3. Total Underruns / Dropped Chunks */}
            <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                UNDERRUNS / DROPS
              </span>
              <span
                className={`text-xl font-bold tabular-nums ${
                  underrunCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {underrunCount}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 uppercase">
                {underrunCount === 0 ? 'GAPLESS PLAYBACK' : 'DROPPED FRAMES'}
              </span>
            </div>

            {/* 4. Stream State */}
            <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                STREAM STATUS
              </span>
              <span className="text-sm font-bold text-slate-200 uppercase">
                {streamState}
              </span>
              {onResetReceiver && (
                <button
                  onClick={onResetReceiver}
                  className="mt-1 text-[10px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  [RESET STREAM]
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
