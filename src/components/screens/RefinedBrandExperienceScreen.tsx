'use client';

import React, { useState } from 'react';

/**
 * Screen Component: PulseJam Refined Brand Experience
 * Extracted from Stitch MCP screen 'f377a580635343ff8e3bf4ab2d692dd3'
 * Follows DESIGN.md specifications for typography (EB Garamond + Hanken Grotesk),
 * Warm Brass Gold palette (#f2ca50, #d4af37), and glassmorphism.
 */
export const RefinedBrandExperienceScreen: React.FC = () => {
  const [downloadOpen, setDownloadOpen] = useState(false);

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-body-md relative overflow-x-hidden selection:bg-[#d4af37] selection:text-[#3c2f00]">
      {/* Top Navigation */}
      <nav className="fixed top-0 inset-x-0 z-40 bg-[#131313]/80 backdrop-blur-2xl border-b border-[#e7c9a6]/10">
        <div className="max-w-[1280px] mx-auto h-20 px-6 md:px-12 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 text-[#f2ca50] font-headline-sm text-2xl font-bold tracking-tight">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5v14M7 8v8M2 11v2M22 11v2" />
            </svg>
            PulseJam AI
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm text-[#d0c5af]">
            <a href="#vision" className="hover:text-[#f2ca50] transition-colors">The Vision</a>
            <a href="#process" className="hover:text-[#f2ca50] transition-colors">The Process</a>
            <a href="#scenarios" className="hover:text-[#f2ca50] transition-colors">Scenarios</a>
            <a href="#security" className="hover:text-[#f2ca50] transition-colors">Security</a>
          </div>

          <div className="relative">
            <button
              onClick={() => setDownloadOpen((v) => !v)}
              className="bg-gradient-brass text-[#3c2f00] font-label-caps px-6 py-2.5 rounded-full highlight-top text-xs uppercase tracking-widest font-bold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(242,202,80,0.2)] flex items-center gap-2 cursor-pointer"
            >
              <span>Get PulseJam</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${downloadOpen ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {downloadOpen && (
              <div className="absolute right-0 mt-3 w-64 glass-panel border border-hairline rounded-xl p-2 shadow-2xl z-50 animate-fade-in">
                <a
                  href="/downloads/PulseJam_0.1.0_aarch64.dmg"
                  download="PulseJam_0.1.0_aarch64.dmg"
                  className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors text-slate-100 group"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--col-ice)" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <div>
                    <div className="text-xs font-bold text-[#f2ca50]">Download for macOS</div>
                    <div className="text-[10px] text-[#d0c5af]">Apple Silicon (.dmg)</div>
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 md:px-12 max-w-[1280px] mx-auto min-h-[85vh] flex flex-col justify-center relative">
        <div className="absolute top-1/3 right-10 w-96 h-96 bg-[#f2ca50]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-3xl space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 border border-[#4d4635] rounded-full px-4 py-1.5 bg-[#201f1f]/60 backdrop-blur text-xs font-label-caps text-[#e7c9a6]">
            <span className="w-2 h-2 rounded-full bg-[#f2ca50] animate-pulse" />
            Stage 1-4 Engine Ready
          </div>

          <h1 className="font-display-lg text-5xl md:text-7xl lg:text-8xl font-normal leading-[1.05] tracking-tight text-[#e5e2e1]">
            Your Instrument,<br />
            <span className="text-gradient-brass italic">Reimagined.</span>
          </h1>

          <p className="font-body-lg text-lg md:text-2xl text-[#d0c5af] leading-relaxed max-w-2xl">
            Meet the AI that listens and reacts like a real bandmate. PulseJam Engine breathes life into your practice sessions, transforming cold code into warm, responsive musical accompaniment.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <a
              href="/downloads/PulseJam_0.1.0_aarch64.dmg"
              download="PulseJam_0.1.0_aarch64.dmg"
              className="bg-gradient-brass text-[#3c2f00] font-label-caps px-8 py-4 rounded-full highlight-top text-xs uppercase tracking-widest font-bold hover:brightness-110 transition-all shadow-[0_0_30px_rgba(242,202,80,0.25)] flex items-center gap-3 cursor-pointer"
            >
              <span>Download macOS App (.dmg)</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* The Vision Section */}
      <section id="vision" className="py-24 px-6 md:px-12 max-w-[1280px] mx-auto border-t border-hairline">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-6 space-y-6">
            <span className="font-label-caps text-xs text-[#e7c9a6] tracking-widest uppercase flex items-center gap-3">
              <span className="w-6 h-[1px] bg-[#e7c9a6]" />
              The Vision
            </span>
            <h2 className="font-headline-md text-4xl md:text-5xl text-[#e5e2e1]">
              Not a tool.<br />
              <span className="italic text-[#dfc29f]">A Companion.</span>
            </h2>
            <p className="font-body-md text-[#d0c5af] leading-relaxed text-base md:text-lg">
              Traditional backing tracks are static, lifeless. Metronomes are mechanical dictators. We built PulseJam AI to feel like an instrument itself—responsive, dynamic, and intuitive.
            </p>
            <p className="font-body-md text-[#d0c5af] leading-relaxed text-base md:text-lg">
              It analyzes your playing style in real-time, matching your dynamics, shifting tempo when you push, and pulling back when you breathe.
            </p>
          </div>

          <div className="md:col-span-6">
            <div className="glass-panel p-8 rounded-2xl border border-hairline highlight-top space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-xs text-[#f2ca50]">REAL-TIME DSP TRACKER</span>
                <span className="font-mono text-xs text-[#e7c9a6]">0.4ms Latency</span>
              </div>
              <div className="h-32 bg-[#0e0e0e] rounded-xl p-4 border border-[#4d4635] flex items-end gap-1.5">
                {[40, 65, 30, 85, 95, 70, 50, 60, 100, 80, 45, 90, 75, 60, 85, 95].map((h, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-gradient-to-t from-[#d4af37] to-[#f2ca50] rounded-t-sm transition-all duration-300"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Process Steps */}
      <section id="process" className="py-24 px-6 md:px-12 max-w-[1280px] mx-auto border-t border-hairline">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
          <span className="font-label-caps text-xs text-[#e7c9a6] tracking-widest uppercase">The Process</span>
          <h2 className="font-headline-md text-4xl md:text-5xl text-[#e5e2e1]">Intuitive By Design</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: 'STEP 01',
              title: 'Plug In',
              desc: 'Connect your instrument or microphone directly to your device. No complex routing required.',
              icon: 'cable',
            },
            {
              step: 'STEP 02',
              title: 'Play Naturally',
              desc: 'Just start playing. The engine instantly detects key, tempo, and dynamic intensity.',
              icon: 'music_note',
            },
            {
              step: 'STEP 03',
              title: 'The App Reacts',
              desc: 'Experience a backing track that ebbs and flows with your performance, creating a unique jam every time.',
              icon: 'graphic_eq',
            },
          ].map((item) => (
            <div key={item.step} className="glass-panel p-8 rounded-2xl border border-hairline highlight-top space-y-4">
              <span className="font-label-caps text-xs text-[#f2ca50] tracking-widest">{item.step}</span>
              <h3 className="font-headline-sm text-2xl text-[#e5e2e1]">{item.title}</h3>
              <p className="font-body-md text-sm text-[#d0c5af] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
