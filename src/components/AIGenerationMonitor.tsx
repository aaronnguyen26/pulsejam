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
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const AIGenerationMonitor: React.FC<AIGenerationMonitorProps> = ({
  sidecarStatus,
  aiStreamMetrics,
  onResetReceiver,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const sidecarState = sidecarStatus?.state || 'unavailable';
  const rttMs = sidecarStatus?.roundTripMs ?? null;

  const streamState = aiStreamMetrics?.state || 'idle';
  const bufferDepthMs = aiStreamMetrics?.bufferDepthMs ?? 0;
  const bufferDepthChunks = aiStreamMetrics?.bufferDepthChunks ?? 0;
  const underrunCount = aiStreamMetrics?.underrunCount ?? 0;

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onResetReceiver) return;
    setIsResetting(true);
    onResetReceiver();
    setTimeout(() => setIsResetting(false), 800);
  };

  // State indicator styling in obsidian & champagne gold theme
  const getLedDetails = () => {
    if (sidecarState === 'connected' && streamState === 'streaming') {
      return {
        color: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse',
        badge: 'STREAMING',
        badgeClass: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40',
      };
    }
    if (sidecarState === 'connected') {
      return {
        color: 'bg-[#f2ca50] shadow-[0_0_8px_rgba(242,202,80,0.5)]',
        badge: 'READY',
        badgeClass: 'bg-[#231f17] text-[#f2ca50] border-[#f2ca50]/30',
      };
    }
    if (sidecarState === 'high-latency' || streamState === 'buffering') {
      return {
        color: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse',
        badge: 'BUFFERING',
        badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
      };
    }
    if (streamState === 'stalled') {
      return {
        color: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
        badge: 'STALLED',
        badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
      };
    }
    return {
      color: 'bg-[#4d4635]',
      badge: 'STANDBY',
      badgeClass: 'bg-[#18150f] text-[#d0c5af]/60 border-[#4d4635]/30',
    };
  };

  const led = getLedDetails();

  return (
    <section
      aria-label="AI Audio Stream Engine Telemetry"
      className="rounded-xl overflow-hidden border border-[#4d4635]/40 bg-[#12100b] shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all"
    >
      {/* ── Compact Precision Status Ribbon (Resting View) ────────────────── */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 gap-3 bg-gradient-to-r from-[#16130b] via-[#12100b] to-[#16130b]">
        {/* Left: Stream Identifier & State Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${led.color}`} />
            <span className="font-mono text-xs font-bold text-[#e5e2e1] tracking-wider uppercase">
              AI STREAM ENGINE
            </span>
          </div>

          <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${led.badgeClass}`}>
            {led.badge}
          </span>
        </div>

        {/* Center: Sleek Inline Telemetry Ribbon */}
        <div className="flex items-center gap-3.5 font-mono text-[11px] text-[#d0c5af]/70">
          {/* Latency */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#d0c5af]/50 text-[10px]">RTT:</span>
            <strong className="text-[#f2ca50] font-bold tabular-nums">
              {rttMs !== null ? `${rttMs}ms` : '--'}
            </strong>
          </div>

          <span className="text-[#4d4635]">•</span>

          {/* Buffer Level with 6-segment Micro-Meter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#d0c5af]/50 text-[10px]">BUFFER:</span>
            <strong className="text-[#e5e2e1] font-bold tabular-nums">
              {bufferDepthMs}ms
            </strong>
            <div className="flex items-center gap-0.5 h-3 ml-1" title={`${bufferDepthChunks} chunks in jitter buffer`}>
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const filled = idx < bufferDepthChunks;
                return (
                  <div
                    key={`micro-bar-${idx}`}
                    className={`w-1 rounded-sm transition-all duration-150 ${
                      filled
                        ? 'h-2.5 bg-[#f2ca50] shadow-[0_0_4px_rgba(242,202,80,0.6)]'
                        : 'h-1 bg-white/10'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <span className="text-[#4d4635]">•</span>

          {/* Continuity / Drops */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#d0c5af]/50 text-[10px]">DROPS:</span>
            <strong
              className={`font-bold tabular-nums ${
                underrunCount === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {underrunCount}
            </strong>
          </div>

          <span className="hidden md:inline text-[#4d4635]">•</span>

          {/* Format Spec */}
          <span className="hidden md:inline text-[10px] text-[#d0c5af]/50">
            48kHz / 16-bit
          </span>
        </div>

        {/* Right: Actions & Diagnostics Toggle */}
        <div className="flex items-center gap-2">
          {onResetReceiver && (
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="px-2 py-1 rounded text-[10px] font-mono text-[#d0c5af]/70 hover:text-[#f2ca50] hover:bg-white/5 border border-transparent hover:border-[#4d4635]/40 transition cursor-pointer"
              title="Reset jitter buffer and resynchronize neural audio stream"
            >
              {isResetting ? 'RESETTING…' : 'RESET'}
            </button>
          )}

          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1f1b13] hover:bg-[#2a251a] border border-[#4d4635]/40 text-[#f2ca50] font-mono text-[10px] font-bold transition cursor-pointer shadow-sm"
          >
            <span>DIAGNOSTICS</span>
            <ChevronIcon open={expanded} />
          </button>
        </div>
      </div>

      {/* ── Expanded Precision Diagnostics Drawer ─────────────────────────── */}
      {expanded && (
        <div className="border-t border-[#4d4635]/30 bg-[#0c0a06]/95 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono">
            {/* 1. Sidecar RTT Latency */}
            <div className="bg-[#14120c] rounded-xl p-3.5 border border-[#4d4635]/30 flex flex-col items-center justify-between shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
              <span className="text-[10px] text-[#d0c5af]/60 uppercase tracking-wider mb-1">
                SIDECAR RTT LATENCY
              </span>
              <span className="text-xl font-bold text-[#f2ca50] tabular-nums my-1">
                {rttMs !== null ? `${rttMs} ms` : 'STANDBY'}
              </span>
              <span className="text-[10px] text-[#d0c5af]/50 uppercase">
                {sidecarState === 'connected' ? 'LOCAL MLX DAEMON' : sidecarState.toUpperCase()}
              </span>
            </div>

            {/* 2. Jitter Buffer Depth */}
            <div className="bg-[#14120c] rounded-xl p-3.5 border border-[#4d4635]/30 flex flex-col items-center justify-between shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
              <span className="text-[10px] text-[#d0c5af]/60 uppercase tracking-wider mb-1">
                JITTER BUFFER DEPTH
              </span>
              <span className="text-xl font-bold text-[#e5e2e1] tabular-nums my-1">
                {bufferDepthMs} ms
              </span>
              <span className="text-[10px] text-[#d0c5af]/50">
                {bufferDepthChunks} CHUNKS (40MS FRAME)
              </span>
            </div>

            {/* 3. Stream Continuity / Drops */}
            <div className="bg-[#14120c] rounded-xl p-3.5 border border-[#4d4635]/30 flex flex-col items-center justify-between shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
              <span className="text-[10px] text-[#d0c5af]/60 uppercase tracking-wider mb-1">
                STREAM INTEGRITY
              </span>
              <span
                className={`text-xl font-bold tabular-nums my-1 ${
                  underrunCount === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {underrunCount === 0 ? '100% GAPLESS' : `${underrunCount} DROPS`}
              </span>
              <span className="text-[10px] text-[#d0c5af]/50 uppercase">
                {underrunCount === 0 ? 'ZERO DROPOUTS' : 'BUFFER UNDERRUNS'}
              </span>
            </div>

            {/* 4. DSP Pipeline Link */}
            <div className="bg-[#14120c] rounded-xl p-3.5 border border-[#4d4635]/30 flex flex-col items-center justify-between shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
              <span className="text-[10px] text-[#d0c5af]/60 uppercase tracking-wider mb-1">
                SIGNAL PROTOCOL
              </span>
              <span className="text-xs font-bold text-[#ffe9b0] uppercase my-1">
                BINARY WS ➔ WORKLET
              </span>
              <span className="text-[10px] text-[#d0c5af]/50 uppercase">
                48kHz FLOAT32 STEREO
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
