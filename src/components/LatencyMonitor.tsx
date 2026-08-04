'use client';

import React, { useState } from 'react';
import { LatencyLogEntry } from '@/lib/audio/types';

interface LatencyMonitorProps {
  logs: LatencyLogEntry[];
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

export const LatencyMonitor: React.FC<LatencyMonitorProps> = ({ logs, onClear }) => {
  const [expanded, setExpanded] = useState(false);

  const latestDelta  = logs.length > 0 ? logs[0].deltaMs : null;

  const computeMedian = (entries: LatencyLogEntry[]): number | null => {
    if (entries.length === 0) return null;
    const sorted = [...entries].map(e => e.deltaMs).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const medianDelta  = computeMedian(logs);
  const targetMet    = medianDelta !== null && medianDelta < 35;

  return (
    <section
      aria-label="Transition timing"
      className="rack-module rounded-2xl overflow-hidden"
    >
      {/* ── Collapsed summary bar ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/2 transition text-left"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-300">Transition timing</span>

          {/* Inline stats — visible in collapsed state */}
          <div className="flex items-center gap-3" style={{ fontFamily: 'var(--font-data)' }}>
            {latestDelta !== null ? (
              <>
                <span className="text-xs text-slate-500">
                  Latest <span className="text-slate-200 font-semibold">{latestDelta} ms</span>
                </span>
                <span className="text-xs text-slate-500">
                  Median <span className="text-slate-200 font-semibold">{medianDelta?.toFixed(0)} ms</span>
                </span>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{
                    color:      targetMet ? 'var(--col-ok)' : 'var(--col-warn)',
                    background: targetMet ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                    border:     `1px solid ${targetMet ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}
                >
                  {targetMet ? '< 35 ms ✓' : '≥ 35 ms'}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-600">No transitions yet</span>
            )}
          </div>
        </div>

        <ChevronIcon open={expanded} />
      </button>

      {/* ── Expandable detail ── */}
      {expanded && (
        <div className="border-t border-white/6 px-5 pb-5 pt-4 space-y-4">
          {/* Four headline stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Latest',  val: latestDelta  !== null ? `${latestDelta} ms`               : '—', color: 'var(--col-ice)'   },
              { label: 'Median',  val: medianDelta   !== null ? `${medianDelta.toFixed(1)} ms`    : '—', color: 'var(--col-ok)'    },
              { label: 'Best',    val: logs.length   > 0      ? `${Math.min(...logs.map(l => l.deltaMs))} ms`  : '—', color: 'text-slate-200' },
              { label: 'Worst',   val: logs.length   > 0      ? `${Math.max(...logs.map(l => l.deltaMs))} ms`  : '—', color: 'text-slate-200' },
            ].map(item => (
              <div
                key={item.label}
                className="flex flex-col gap-0.5 bg-black/30 rounded-lg p-3 border border-white/5 text-center"
              >
                <span className="section-label">{item.label}</span>
                <span
                  className={`text-base font-semibold tabular-nums ${!item.color.startsWith('var') ? item.color : ''}`}
                  style={{
                    fontFamily: 'var(--font-data)',
                    color: item.color.startsWith('var') ? item.color : undefined,
                  }}
                >
                  {item.val}
                </span>
              </div>
            ))}
          </div>

          {/* Log table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="section-label">Transition log</span>
              {logs.length > 0 && (
                <button
                  onClick={onClear}
                  aria-label="Clear timing log"
                  className="text-xs text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="rack-bezel max-h-40 overflow-y-auto rounded-xl p-2">
              {logs.length === 0 ? (
                <p className="text-slate-600 text-center py-6 text-sm italic">
                  Play to trigger tier transitions — they'll appear here.
                </p>
              ) : (
                <table
                  className="w-full text-xs"
                  style={{ fontFamily: 'var(--font-data)' }}
                >
                  <thead>
                    <tr className="border-b border-white/8 text-slate-500">
                      <th className="py-1.5 px-3 text-left font-medium">Time</th>
                      <th className="py-1.5 px-3 text-left font-medium">Transition</th>
                      <th className="py-1.5 px-3 text-right font-medium">ΔT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/4">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-white/4 transition">
                        <td className="py-1.5 px-3 text-slate-500 tabular-nums">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 px-3">
                          <span className="capitalize text-slate-400">{log.previousTier}</span>
                          <span aria-hidden="true" className="text-slate-600 mx-1.5">→</span>
                          <span className="capitalize font-semibold text-slate-200">{log.newTier}</span>
                        </td>
                        <td className="py-1.5 px-3 text-right font-semibold tabular-nums" style={{ color: log.deltaMs < 35 ? 'var(--col-ok)' : 'var(--col-warn)' }}>
                          {log.deltaMs} ms
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
