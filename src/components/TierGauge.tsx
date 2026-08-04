'use client';

import React from 'react';
import { PerformanceTier, DSPMetrics } from '@/lib/audio/types';

interface TierGaugeProps {
  activeTier: PerformanceTier;
  metrics: DSPMetrics | null;
}

const TIER_CONFIG: {
  id: PerformanceTier;
  label: string;
  activeClass: string;
  dotColor: string;
  fillVar: string;
}[] = [
  {
    id: 'chill',
    label: 'Chill',
    activeClass: 'active-ice',
    dotColor: '#00d4ff',
    fillVar: 'var(--col-ice)',
  },
  {
    id: 'groove',
    label: 'Groove',
    activeClass: 'active-ember',
    dotColor: '#ff8c00',
    fillVar: 'var(--col-ember)',
  },
  {
    id: 'peak',
    label: 'Peak',
    activeClass: 'active-surge',
    dotColor: '#ff2d6e',
    fillVar: 'var(--col-surge)',
  },
];

const TIER_ORDER: PerformanceTier[] = ['chill', 'groove', 'peak'];

/**
 * Returns 0–1 progress within the current tier zone based on dB position
 * between the tier thresholds.
 */
function computeWithinTierProgress(
  activeTier: PerformanceTier,
  metrics: DSPMetrics | null
): number {
  if (!metrics) return 0;

  const { smoothedRmsDb, calibration } = metrics;
  const { quietDb, loudDb } = calibration;

  // dB range for each tier zone
  const ranges: Record<PerformanceTier, [number, number]> = {
    chill:  [-80, quietDb],
    groove: [quietDb, loudDb],
    peak:   [loudDb, 0],
  };

  const [lo, hi] = ranges[activeTier];
  if (hi === lo) return 0;
  return Math.max(0, Math.min(1, (smoothedRmsDb - lo) / (hi - lo)));
}

export const TierGauge: React.FC<TierGaugeProps> = ({ activeTier, metrics }) => {
  const activeIdx = TIER_ORDER.indexOf(activeTier);
  const progress = computeWithinTierProgress(activeTier, metrics);

  return (
    <div
      role="status"
      aria-label={`Energy tier: ${activeTier}`}
      aria-live="polite"
      className="flex items-center gap-1.5"
    >
      {TIER_CONFIG.map((tier, idx) => {
        const isActive = tier.id === activeTier;
        const isPast = idx < activeIdx;

        return (
          <React.Fragment key={tier.id}>
            {/* Connector between zones */}
            {idx > 0 && (
              <div
                aria-hidden="true"
                className="h-px w-3 transition-colors duration-300"
                style={{
                  background: isPast || isActive
                    ? TIER_CONFIG[idx - 1].dotColor
                    : 'rgba(255,255,255,0.1)',
                }}
              />
            )}

            {/* Tier zone pill */}
            <div
              aria-current={isActive ? 'true' : undefined}
              className={`tier-zone ${isActive ? tier.activeClass : ''}`}
            >
              {/* Live dot — only on active */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{ background: tier.dotColor }}
                />
              )}

              <span>{tier.label}</span>

              {/* Within-tier fill bar — shows how close to next threshold */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="relative h-1 w-10 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                    style={{
                      width: `${progress * 100}%`,
                      background: tier.fillVar,
                      opacity: 0.85,
                    }}
                  />
                </span>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
