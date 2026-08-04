'use client';

import React, { useState } from 'react';

/**
 * Screen Component: PulseJam Performance Stems Mode
 * Extracted from Stitch MCP screen '44d03d4404994399b981c5c81678827b'
 * Stems performance console with dynamic Chill / Groove / Peak stem controls.
 */
export const PerformanceStemsScreen: React.FC = () => {
  const [activeTier, setActiveTier] = useState<'chill' | 'groove' | 'peak'>('groove');
  const [crossfadeVal, setCrossfadeVal] = useState(50);

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen p-4 md:p-8 font-body-md space-y-6">
      {/* Performance Console Header */}
      <div className="glass-panel p-6 rounded-2xl border border-hairline highlight-top flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-label-caps text-xs text-[#f2ca50] tracking-widest uppercase">Stage 1 Stems Engine</span>
          <h1 className="font-headline-sm text-2xl md:text-3xl text-[#e5e2e1] mt-1">Reactive Stems Performance Console</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-[#f2ca50]/10 border border-[#f2ca50]/30 font-mono text-xs text-[#f2ca50]">
            Mode: Auto Crossfade
          </span>
        </div>
      </div>

      {/* 3 Performance Tiers Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            id: 'chill',
            title: 'Chill Tier',
            accent: 'text-[#00d4ff]',
            border: activeTier === 'chill' ? 'border-[#00d4ff]' : 'border-hairline',
            desc: 'Ambient pads, light percussion & sub-bass crossfades for relaxed playing dynamics.',
            bgGlow: 'shadow-[0_0_20px_rgba(0,212,255,0.15)]',
          },
          {
            id: 'groove',
            title: 'Groove Tier',
            accent: 'text-[#f2ca50]',
            border: activeTier === 'groove' ? 'border-[#f2ca50]' : 'border-hairline',
            desc: 'Rhythmic basslines, full drums & medium-tempo harmonic accompaniment.',
            bgGlow: 'shadow-[0_0_20px_rgba(242,202,80,0.15)]',
          },
          {
            id: 'peak',
            title: 'Peak Tier',
            accent: 'text-[#ff2d6e]',
            border: activeTier === 'peak' ? 'border-[#ff2d6e]' : 'border-hairline',
            desc: 'High-octane synths, maximum drum density & full peak intensity response.',
            bgGlow: 'shadow-[0_0_20px_rgba(255,45,110,0.15)]',
          },
        ].map((tier) => (
          <div
            key={tier.id}
            onClick={() => setActiveTier(tier.id as any)}
            className={`glass-panel p-6 rounded-2xl border ${tier.border} ${tier.bgGlow} transition-all cursor-pointer space-y-4`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`font-headline-sm text-xl font-bold ${tier.accent}`}>{tier.title}</h3>
              {activeTier === tier.id && (
                <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping" />
              )}
            </div>
            <p className="font-body-md text-xs text-[#d0c5af] leading-relaxed">{tier.desc}</p>
            <div className="pt-4 border-t border-hairline font-mono text-xs text-[#e7c9a6] flex justify-between">
              <span>Status</span>
              <span>{activeTier === tier.id ? 'ACTIVE OUTPUT' : 'STANDBY'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Crossfade Control Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-hairline highlight-top space-y-6">
        <div className="flex items-center justify-between">
          <span className="font-label-caps text-xs text-[#e7c9a6]">MANUAL STEM CROSSFADE CONTROL</span>
          <span className="font-mono text-xs text-[#f2ca50]">{crossfadeVal}% Bias</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={crossfadeVal}
          onChange={(e) => setCrossfadeVal(Number(e.target.value))}
          className="w-full accent-[#f2ca50] bg-[#0e0e0e] h-3 rounded-lg cursor-pointer"
        />

        <div className="flex justify-between font-label-caps text-xs text-[#d0c5af]">
          <span>Chill (0%)</span>
          <span>Groove (50%)</span>
          <span>Peak (100%)</span>
        </div>
      </div>
    </div>
  );
};
