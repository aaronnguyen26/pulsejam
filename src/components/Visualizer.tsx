'use client';

import React, { useRef, useEffect } from 'react';
import { DSPMetrics, PerformanceTier } from '@/lib/audio/types';

interface VisualizerProps {
  metrics: DSPMetrics | null;
  activeTier: PerformanceTier;
}

const TOKENS = {
  void:    '#080b12',
  ice:     '#00d4ff',
  ember:   '#ff8c00',
  surge:   '#ff2d6e',
  surface: '#0f1420',
  grid:    'rgba(255, 255, 255, 0.04)',
} as const;

const TIER_COLOR: Record<PerformanceTier, string> = {
  chill:  TOKENS.ice,
  groove: TOKENS.ember,
  peak:   TOKENS.surge,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function getNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAMES[pitch % 12];
  return `${name}${octave}`;
}

function segmentColor(seg: number, total: number): string {
  const pct = seg / total;
  if (pct < 0.6) return TOKENS.ice;
  if (pct < 0.82) return TOKENS.ember;
  return TOKENS.surge;
}

export const Visualizer: React.FC<VisualizerProps> = ({ metrics, activeTier }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const metricsRef = useRef<DSPMetrics | null>(metrics);
  metricsRef.current = metrics;

  const tierRef = useRef<PerformanceTier>(activeTier);
  tierRef.current = activeTier;

  const historyRmsRef   = useRef<number[]>(new Array(80).fill(-80));
  const historyOnsetRef = useRef<number[]>(new Array(80).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);

      const W = canvas.width;
      const H = canvas.height;

      // Background
      ctx.fillStyle = TOKENS.void;
      ctx.fillRect(0, 0, W, H);

      const m          = metricsRef.current;
      const tier       = tierRef.current;
      const rawRms     = m ? m.rawRmsDb      : -80;
      const smoothRms  = m ? m.smoothedRmsDb : -80;
      const rawOnset   = m ? m.rawOnsetDensity : 0;
      const quietDb    = m ? m.calibration.quietDb : -35;
      const loudDb     = m ? m.calibration.loudDb  : -12;

      historyRmsRef.current.push(smoothRms);
      historyRmsRef.current.shift();
      historyOnsetRef.current.push(rawOnset);
      historyOnsetRef.current.shift();

      // Layout regions
      const meterW  = 20;
      const meterGap = 8;
      const meterX  = W - meterW - meterGap;
      const graphW  = meterX - 8;
      const graphH  = H - 24;
      const baseY   = H - 12;

      // dB → Y
      const dbToY = (db: number) => {
        const n = (Math.max(-80, Math.min(0, db)) + 80) / 80;
        return baseY - n * graphH;
      };

      // ─── Subtle grid ──────────────────────────────────────────
      ctx.strokeStyle = TOKENS.grid;
      ctx.lineWidth   = 1;
      const gridSteps = 4;
      for (let i = 1; i <= gridSteps; i++) {
        const y = baseY - (i / gridSteps) * graphH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(graphW, y);
        ctx.stroke();
      }

      // ─── Threshold marker lines ───────────────────────────────
      const quietY = dbToY(quietDb);
      const loudY  = dbToY(loudDb);

      // Quiet → Groove threshold
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(0, quietY); ctx.lineTo(graphW, quietY); ctx.stroke();

      ctx.fillStyle = 'rgba(0, 212, 255, 0.55)';
      ctx.font      = `10px var(--font-jetbrains-mono, monospace)`;
      ctx.fillText(`Chill→Groove  ${quietDb.toFixed(1)} dB`, 10, quietY - 5);

      // Groove → Peak threshold
      ctx.strokeStyle = 'rgba(255, 45, 110, 0.55)';
      ctx.beginPath(); ctx.moveTo(0, loudY); ctx.lineTo(graphW, loudY); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 45, 110, 0.6)';
      ctx.fillText(`Groove→Peak  ${loudDb.toFixed(1)} dB`, 10, loudY - 5);

      // ─── Waveform trace ───────────────────────────────────────
      const sliceW = graphW / (historyRmsRef.current.length - 1);
      ctx.beginPath();
      for (let i = 0; i < historyRmsRef.current.length; i++) {
        const x = i * sliceW;
        const y = dbToY(historyRmsRef.current[i]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }

      // Tier-tinted line
      const strokeGrad = ctx.createLinearGradient(0, 0, graphW, 0);
      strokeGrad.addColorStop(0,   TOKENS.ice);
      strokeGrad.addColorStop(0.5, TOKENS.ember);
      strokeGrad.addColorStop(1,   TOKENS.surge);
      ctx.strokeStyle = strokeGrad;
      ctx.lineWidth   = 2;
      ctx.stroke();

      // Glow under trace
      ctx.lineTo(graphW, baseY);
      ctx.lineTo(0, baseY);
      ctx.closePath();

      const fillGrad2 = ctx.createLinearGradient(0, 0, 0, H);
      const glowMap: Record<PerformanceTier, string> = {
        chill:  'rgba(0,212,255,0.10)',
        groove: 'rgba(255,140,0,0.10)',
        peak:   'rgba(255,45,110,0.10)',
      };
      fillGrad2.addColorStop(0,   glowMap[tier]);
      fillGrad2.addColorStop(1,   'rgba(8,11,18,0.95)');
      ctx.fillStyle = fillGrad2;
      ctx.fill();

      // ─── Pitch Badge Overlay (Canvas) ────────────────────────
      if (m && m.currentPitch && m.currentFrequency) {
        const noteStr = getNoteName(m.currentPitch);
        const freqStr = `${m.currentFrequency.toFixed(1)} Hz`;

        ctx.fillStyle = 'rgba(15, 20, 32, 0.85)';
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(graphW - 140, 12, 128, 36, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = TOKENS.ice;
        ctx.font = 'bold 13px var(--font-jetbrains-mono, monospace)';
        ctx.fillText(`🎵 ${noteStr}`, graphW - 130, 30);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px var(--font-jetbrains-mono, monospace)';
        ctx.fillText(freqStr, graphW - 74, 30);
      }

      // ─── VU Meter (right column, LED segments) ────────────────
      const totalSegs = 24;
      const segGap    = 2;
      const segH      = (H - 24) / totalSegs;

      const normSmooth = (Math.max(-80, Math.min(0, smoothRms)) + 80) / 80;
      const normRaw    = (Math.max(-80, Math.min(0, rawRms)) + 80) / 80;
      const activeSegs = Math.round(normSmooth * totalSegs);
      const peakSeg    = Math.round(normRaw * totalSegs);

      for (let seg = 0; seg < totalSegs; seg++) {
        const segY = baseY - (seg + 1) * segH;
        let col    = 'rgba(255,255,255,0.04)';

        if (seg < activeSegs) {
          col = segmentColor(seg, totalSegs);
        } else if (seg === peakSeg && peakSeg > activeSegs) {
          col = 'rgba(255,255,255,0.7)';
        }

        ctx.fillStyle = col;
        ctx.fillRect(meterX, segY, meterW, segH - segGap);
      }

      // ─── Onset density bar (bottom strip) ────────────────────
      const onset = historyOnsetRef.current[historyOnsetRef.current.length - 1] || 0;
      if (onset > 0) {
        const alpha = Math.min(0.9, onset * 0.18);
        ctx.fillStyle = `rgba(255,140,0,${alpha})`;
        ctx.fillRect(0, H - 5, graphW * Math.min(1, onset / 8), 3);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <section
      aria-label="Live level display and waveform"
      className="rack-module relative w-full rounded-2xl p-4"
    >
      {/* Recessed canvas frame */}
      <div className="rack-bezel relative rounded-xl p-2">
        <canvas
          ref={canvasRef}
          width={800}
          height={240}
          role="img"
          aria-label="Rolling volume history with threshold markers and VU meter"
          className="w-full h-[240px] rounded-lg"
          style={{ display: 'block' }}
        />
      </div>

      {/* Readout strip — below canvas */}
      <div
        className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center"
        style={{ fontFamily: 'var(--font-data)' }}
      >
        <div className="flex flex-col gap-0.5 bg-black/30 rounded-lg p-2.5 border border-white/5">
          <span className="section-label">Level</span>
          <span className="text-base font-semibold tabular-nums text-slate-200">
            {metrics ? metrics.rawRmsDb.toFixed(1) : '−80.0'}
            <span className="text-xs text-slate-500 ml-1">dB</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 bg-black/30 rounded-lg p-2.5 border border-white/5">
          <span className="section-label">Smoothed</span>
          <span className="text-base font-semibold tabular-nums tier-ice">
            {metrics ? metrics.smoothedRmsDb.toFixed(1) : '−80.0'}
            <span className="text-xs text-slate-500 ml-1">dB</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 bg-black/30 rounded-lg p-2.5 border border-white/5">
          <span className="section-label">Attack density</span>
          <span className="text-base font-semibold tabular-nums tier-ember">
            {metrics ? metrics.smoothedOnsetDensity.toFixed(1) : '0.0'}
            <span className="text-xs text-slate-500 ml-1">att/s</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 bg-black/30 rounded-lg p-2.5 border border-white/5">
          <span className="section-label">Detected Pitch</span>
          <span className="text-base font-semibold tabular-nums text-cyan-300">
            {metrics && metrics.currentPitch ? getNoteName(metrics.currentPitch) : '—'}
            {metrics && metrics.currentFrequency && (
              <span className="text-[10px] text-slate-400 ml-1">({metrics.currentFrequency.toFixed(0)}Hz)</span>
            )}
          </span>
        </div>
      </div>
    </section>
  );
};
