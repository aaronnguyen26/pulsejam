'use client';

import React, { useState } from 'react';
import { AIGenerationLogEntry, AIGenerationMetrics } from '@/lib/audio/types';

interface AIGenerationMonitorProps {
  metrics: AIGenerationMetrics | null;
  logs: AIGenerationLogEntry[];
  onClear: () => void;
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
  metrics,
  logs,
  onClear,
}) => {
  const [expanded, setExpanded] = useState(true);

  const latestGen = logs.length > 0 ? logs[0].generationLatencyMs : null;

  const computeMedian = (entries: AIGenerationLogEntry[]): number | null => {
    if (entries.length === 0) return null;
    const sorted = [...entries].map((e) => e.generationLatencyMs).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const medianGen = computeMedian(logs);
  const isFallback = logs.length > 0 ? logs[0].isFallback : false;

  return (
    <section
      aria-label="Local AI Generation Telemetry & Latency Logs"
      className="rack-module rounded-2xl overflow-hidden"
    >
      {/* Header Bar / Toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 led-ember animate-pulse" />
            <span className="text-sm font-semibold text-slate-200">
              Local AI Generation Telemetry (TF.js WASM + Magenta.js)
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono-tech text-xs">
            {latestGen !== null ? (
              <>
                <span className="text-slate-400">
                  Latest Bar Gen: <strong className="text-amber-400 font-bold">{latestGen} ms</strong>
                </span>
                <span className="text-slate-400">
                  Median: <strong className="text-emerald-400 font-bold">{medianGen?.toFixed(0)} ms</strong>
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    isFallback
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                  }`}
                >
                  {isFallback ? '⚠️ FALLBACK REPEAT' : '✓ 1-BAR LOOKAHEAD READY'}
                </span>
              </>
            ) : (
              <span className="text-slate-500">Awaiting Bar Boundary Cycles…</span>
            )}
          </div>
        </div>

        <ChevronIcon open={expanded} />
      </button>

      {/* Expanded Stats & Log Stream */}
      {expanded && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-4">
          {/* Readout Counter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono-tech">
            <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                LATEST GEN ΔT
              </span>
              <span className="text-xl font-bold text-amber-400 tabular-nums">
                {latestGen !== null ? `${latestGen} ms` : '--'}
              </span>
            </div>

            <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                MEDIAN GEN ΔT
              </span>
              <span className="text-xl font-bold text-emerald-400 tabular-nums">
                {medianGen !== null ? `${medianGen.toFixed(1)} ms` : '--'}
              </span>
            </div>

            <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                LOOKAHEAD CADENCE
              </span>
              <span className="text-sm font-bold text-cyan-300 mt-1 uppercase">
                1 BAR (2.0 SEC)
              </span>
            </div>

            <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                INFERENCE BACKEND
              </span>
              <span className="text-sm font-bold text-slate-200 mt-1 uppercase">
                TF.JS WASM WORKER
              </span>
            </div>
          </div>

          {/* Per-Bar Generation Log Stream */}
          <div>
            <div className="flex items-center justify-between mb-2 font-mono-tech text-xs">
              <span className="text-slate-400 uppercase tracking-wider">
                PER-BAR GENERATION CYCLE LOG (LAST 10 BARS)
              </span>
              {logs.length > 0 && (
                <button
                  onClick={onClear}
                  aria-label="Clear generation logs"
                  className="text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  [CLEAR LOGS]
                </button>
              )}
            </div>

            <div className="rack-bezel max-h-40 overflow-y-auto rounded-xl p-2 font-mono-tech text-xs">
              {logs.length === 0 ? (
                <p className="text-slate-500 text-center py-6 italic font-sans text-xs">
                  No AI generation cycles logged yet. Start playing in AI Generation Mode to trigger per-bar lookahead inference.
                </p>
              ) : (
                <table className="w-full text-left tabular-nums">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                      <th className="py-1.5 px-3">BAR INDEX</th>
                      <th className="py-1.5 px-3">TIMESTAMP</th>
                      <th className="py-1.5 px-3">NOTES (DRUMS / MELODY)</th>
                      <th className="py-1.5 px-3 text-right">GEN LATENCY ΔT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition">
                        <td className="py-1.5 px-3 text-cyan-300 font-bold">
                          BAR #{log.barIndex}
                        </td>
                        <td className="py-1.5 px-3 text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 px-3 text-slate-300">
                          🥁 {log.drumNotesCount} drums • 🎹 {log.melodyNotesCount} bass notes
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-amber-400">
                          {log.generationLatencyMs} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
