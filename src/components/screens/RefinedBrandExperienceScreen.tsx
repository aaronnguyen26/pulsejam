'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';

/**
 * Screen Component: PulseJam Refined Brand Experience
 * Extracted from Stitch MCP screen 'f377a580635343ff8e3bf4ab2d692dd3'
 * Follows DESIGN.md specifications for typography (EB Garamond + Hanken Grotesk),
 * Warm Brass Gold palette (#f2ca50, #d4af37), glassmorphism, and Lenis smooth scrolling.
 */
export const RefinedBrandExperienceScreen: React.FC = () => {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [complexity, setComplexity] = useState(75);

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-body-md relative overflow-x-hidden selection:bg-[#d4af37] selection:text-[#3c2f00]">
      {/* Atmospheric Top Gradient */}
      <div className="fixed top-0 inset-x-0 h-64 bg-gradient-to-b from-[#131313] via-[#131313]/80 to-transparent -z-10 pointer-events-none" />

      {/* ── Top Navigation ───────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#131313]/80 backdrop-blur-2xl border-b border-[#e7c9a6]/10 transition-all duration-300">
        <div className="flex justify-between items-center h-24 px-6 md:px-12 max-w-[1280px] mx-auto">
          <a href="#" className="font-headline-sm text-2xl text-[#f2ca50] tracking-tight flex items-center gap-2 group font-bold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:rotate-90 transition-transform duration-500">
              <path d="M12 2v20M17 5v14M7 8v8M2 11v2M22 11v2" />
            </svg>
            PulseJam AI
          </a>

          <div className="hidden md:flex gap-10 items-center text-sm font-body-md text-[#d0c5af]">
            <a href="#vision" className="hover:text-[#f2ca50] transition-colors">The Vision</a>
            <a href="#experience" className="hover:text-[#f2ca50] transition-colors">The Process</a>
            <a href="#stories" className="hover:text-[#f2ca50] transition-colors">Scenarios</a>
            <a href="#security" className="hover:text-[#f2ca50] transition-colors">Security</a>
          </div>

          <div className="relative">
            <button
              onClick={() => setDownloadOpen((v) => !v)}
              className="bg-gradient-brass text-[#3c2f00] font-label-caps text-xs px-8 py-3.5 rounded-full highlight-top uppercase tracking-widest font-bold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(242,202,80,0.2)] flex items-center gap-2 cursor-pointer"
            >
              <span>Get PulseJam</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform duration-300 ${downloadOpen ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {downloadOpen && (
              <div className="absolute right-0 mt-4 w-64 glass-panel border border-hairline rounded-xl shadow-2xl overflow-hidden highlight-top p-2 space-y-1 z-50 animate-fade-in">
                <a
                  href="/downloads/PulseJam_0.1.0_aarch64.dmg"
                  download="PulseJam_0.1.0_aarch64.dmg"
                  className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-lg transition-colors group text-slate-100"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e7c9a6" strokeWidth="2" className="group-hover:stroke-[#f2ca50] transition-colors">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="font-body-md font-medium text-sm text-[#f2ca50]">Download for macOS</span>
                    <span className="text-xs text-[#d0c5af]">Apple Silicon (.dmg)</span>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-lg transition-colors group text-slate-100 opacity-60"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e7c9a6" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="font-body-md font-medium text-sm">Download for Windows</span>
                    <span className="text-xs text-[#d0c5af]">Windows 10/11</span>
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24">
        {/* ── Hero Section ────────────────────────────────────────────── */}
        <section className="min-h-[90vh] flex flex-col justify-center py-24 relative px-6 md:px-12 max-w-[1280px] mx-auto">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#f2ca50]/10 rounded-full blur-[140px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
            className="space-y-10 max-w-4xl relative z-10"
          >
            <h1 className="font-display-lg text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-[#e5e2e1] leading-[1.05] tracking-tight font-normal">
              Your Instrument,<br />
              <span className="text-gradient-brass italic">Reimagined.</span>
            </h1>

            <p className="font-body-lg text-body-lg text-[#d0c5af] max-w-2xl leading-relaxed text-xl md:text-2xl opacity-90">
              Meet the AI that listens and reacts like a real bandmate. PulseJam Engine breathes life into your practice sessions, transforming cold code into warm, responsive musical accompaniment.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 pt-6">
              <a
                href="/downloads/PulseJam_0.1.0_aarch64.dmg"
                download="PulseJam_0.1.0_aarch64.dmg"
                className="bg-gradient-brass text-[#3c2f00] font-label-caps text-xs px-10 py-5 rounded-full highlight-top uppercase tracking-widest font-bold hover:brightness-110 transition-all inline-flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(242,202,80,0.25)] hover:shadow-[0_0_40px_rgba(242,202,80,0.4)] cursor-pointer"
              >
                <span>Experience PulseJam</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>

              <a
                href="#experience"
                className="bg-transparent border border-[#f2ca50]/50 text-[#f2ca50] font-label-caps text-xs px-10 py-5 rounded-full uppercase tracking-widest font-bold hover:bg-[#f2ca50]/5 hover:border-[#f2ca50] transition-all inline-flex items-center justify-center cursor-pointer"
              >
                Hear the Demo
              </a>
            </div>
          </motion.div>
        </section>

        {/* Soft Transition */}
        <div className="h-48 bg-gradient-to-b from-transparent via-[#131313] to-[#131313]" />

        {/* ── Section 1: The Vision ───────────────────────────────────── */}
        <section id="vision" className="px-6 md:px-12 max-w-[1280px] mx-auto py-32 relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.8 }}
              className="md:col-span-6 space-y-8"
            >
              <div className="inline-flex items-center gap-3 font-label-caps text-xs text-[#e7c9a6] uppercase tracking-widest">
                <span className="w-8 h-[1px] bg-[#e7c9a6]" />
                The Vision
              </div>

              <h2 className="font-headline-md text-4xl sm:text-5xl md:text-6xl text-[#e5e2e1]">
                Not a tool.<br />
                <span className="italic text-[#dfc29f]">A Companion.</span>
              </h2>

              <p className="font-body-md text-[#d0c5af] text-lg leading-relaxed">
                Traditional backing tracks are static, lifeless. Metronomes are mechanical dictators. We built PulseJam AI to feel like an instrument itself—responsive, dynamic, and intuitive.
              </p>

              <p className="font-body-md text-[#d0c5af] text-lg leading-relaxed">
                It analyzes your playing style in real-time, matching your dynamics, shifting tempo when you push, and pulling back when you breathe. It's the ultimate sparring partner for your musical journey.
              </p>
            </motion.div>

            {/* Asymmetrical Studio Deck Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.8 }}
              className="md:col-span-6 relative"
            >
              <div className="glass-panel rounded-2xl p-8 border border-hairline highlight-top shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-xs text-[#f2ca50] tracking-widest uppercase">REAL-TIME DSP ENGINE</span>
                  <span className="font-mono text-xs text-[#e7c9a6]">0.4ms Latency</span>
                </div>

                <div className="h-40 bg-[#0e0e0e] rounded-xl p-4 border border-[#4d4635] flex items-end gap-1.5 justify-between">
                  {[45, 70, 35, 90, 100, 75, 55, 65, 95, 85, 50, 92, 80, 65, 90, 100, 70, 45, 80, 95].map((h, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-[#d4af37] via-[#f2ca50] to-[#ffe088] rounded-t-sm transition-all duration-300"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between font-mono text-xs text-[#d0c5af]">
                  <span>Signal Input: Mic / AudioWorklet</span>
                  <span className="text-emerald-400">ACTIVE PASS</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Section 2: The Process (Flow Journey) ──────────────────── */}
        <section id="experience" className="py-32 relative bg-[#0e0e0e]/50 border-t border-hairline">
          <div className="px-6 md:px-12 max-w-[1280px] mx-auto text-center mb-24 space-y-4">
            <span className="font-label-caps text-xs text-[#e7c9a6] uppercase tracking-widest">The Process</span>
            <h2 className="font-headline-md text-4xl sm:text-5xl text-[#e5e2e1]">Intuitive By Design</h2>
          </div>

          <div className="px-6 md:px-12 max-w-[1000px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="glass-panel p-8 rounded-2xl border border-hairline highlight-top flex flex-col justify-between space-y-6"
              >
                <div>
                  <div className="w-16 h-16 rounded-full bg-[#f2ca50]/10 border border-[#f2ca50]/30 flex items-center justify-center mb-6 text-[#f2ca50]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5v14M7 8v8" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-xs text-[#f2ca50] tracking-widest block mb-2">STEP 01</span>
                  <h3 className="font-headline-sm text-2xl text-[#e5e2e1] mb-3">Plug In</h3>
                  <p className="font-body-md text-sm text-[#d0c5af] leading-relaxed">
                    Connect your instrument or microphone directly to your device. No complex routing required.
                  </p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="glass-panel p-8 rounded-2xl border border-hairline highlight-top flex flex-col justify-between space-y-6"
              >
                <div>
                  <div className="w-16 h-16 rounded-full bg-[#e7c9a6]/10 border border-[#e7c9a6]/30 flex items-center justify-center mb-6 text-[#e7c9a6]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-xs text-[#e7c9a6] tracking-widest block mb-2">STEP 02</span>
                  <h3 className="font-headline-sm text-2xl text-[#e5e2e1] mb-3">Play Naturally</h3>
                  <p className="font-body-md text-sm text-[#d0c5af] leading-relaxed">
                    Just start playing. The engine instantly detects key, tempo, and dynamic intensity.
                  </p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="glass-panel p-8 rounded-2xl border border-hairline highlight-top flex flex-col justify-between space-y-6"
              >
                <div>
                  <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center mb-6 text-[#d4af37]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-xs text-[#d4af37] tracking-widest block mb-2">STEP 03</span>
                  <h3 className="font-headline-sm text-2xl text-[#e5e2e1] mb-3">The App Reacts</h3>
                  <p className="font-body-md text-sm text-[#d0c5af] leading-relaxed">
                    Experience a backing track that ebbs and flows with your performance, creating a unique jam every time.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Section 3: Everyday Jams (Scenarios Bento Grid) ─────────── */}
        <section id="stories" className="px-6 md:px-12 max-w-[1280px] mx-auto py-32 border-t border-hairline">
          <div className="max-w-2xl mb-16 space-y-4">
            <span className="font-label-caps text-xs text-[#e7c9a6] uppercase tracking-widest">Scenarios</span>
            <h2 className="font-headline-md text-4xl sm:text-5xl text-[#e5e2e1]">Everyday Jams</h2>
            <p className="font-body-lg text-lg text-[#d0c5af]">
              Whether you are refining your technique or exploring new creative horizons, PulseJam adapts to your environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Card 1 */}
            <div className="md:col-span-7 bg-[#2a2a2a]/60 rounded-2xl border border-hairline p-8 relative overflow-hidden flex flex-col justify-end min-h-[360px] shadow-xl">
              <div className="space-y-3 relative z-10">
                <span className="font-label-caps text-xs border border-[#4d4635] rounded-full px-4 py-1.5 inline-block text-[#e7c9a6] bg-[#131313]/60 backdrop-blur">
                  Acoustic Setup
                </span>
                <h3 className="font-headline-sm text-3xl text-[#e5e2e1]">The Living Room Concert</h3>
                <p className="font-body-md text-sm text-[#d0c5af] max-w-md leading-relaxed">
                  Transform quiet evenings into full-band experiences. Practice silently with headphones while feeling the weight of a live ensemble.
                </p>
              </div>
            </div>

            {/* Card 2: Interactive Complexity */}
            <div className="md:col-span-5 glass-panel border border-hairline rounded-2xl p-8 flex flex-col justify-between shadow-xl space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#2a2a2a] border border-[#e7c9a6]/30 flex items-center justify-center text-[#e7c9a6]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10v6M12 2v20" />
                  </svg>
                </div>
                <h3 className="font-headline-sm text-2xl text-[#e5e2e1]">Mastering New Scales</h3>
                <p className="font-body-md text-sm text-[#d0c5af] leading-relaxed">
                  Set parameters for complex modes and let the AI challenge you with unpredictable chord voicings and rhythmic variations.
                </p>
              </div>

              {/* Slider UI */}
              <div className="space-y-3 bg-[#131313]/60 p-4 rounded-xl border border-hairline">
                <div className="flex justify-between items-center font-label-caps text-xs text-[#d0c5af]">
                  <span>Complexity Control</span>
                  <span className="text-[#f2ca50] font-bold">{complexity}% Advanced</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={complexity}
                  onChange={(e) => setComplexity(Number(e.target.value))}
                  className="w-full accent-[#f2ca50] bg-[#0e0e0e] h-2 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Card 3 */}
            <div className="md:col-span-12 glass-panel border border-hairline rounded-2xl p-8 md:p-12 highlight-top flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-xl">
              <div className="max-w-2xl space-y-3">
                <h3 className="font-headline-sm text-2xl md:text-3xl text-[#e5e2e1]">The Live Performance Companion</h3>
                <p className="font-body-md text-sm md:text-base text-[#d0c5af] leading-relaxed">
                  Take it to the stage. PulseJam acts as an invisible safety net, generating stems that align perfectly with your live playing dynamics.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-[#201f1f] px-6 py-3.5 rounded-full border border-[#e7c9a6]/20 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-label-caps text-xs text-[#e7c9a6] tracking-wider uppercase">Zero Latency Local DSP</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Security & Privacy ───────────────────────────── */}
        <section id="security" className="py-32 relative border-t border-hairline bg-[#0e0e0e]/60">
          <div className="px-6 md:px-12 max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 border border-[#4d4635] rounded-full px-4 py-1.5 bg-[#201f1f]/50 backdrop-blur">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f2ca50" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="font-label-caps text-xs text-[#d0c5af]">Security Focus</span>
              </div>

              <h2 className="font-headline-md text-4xl sm:text-5xl text-[#e5e2e1]">
                Your Music,<br />
                <span className="italic text-[#e7c9a6]">Your Privacy.</span>
              </h2>

              <p className="font-body-md text-base md:text-lg text-[#d0c5af] leading-relaxed">
                Creative integrity demands a secure environment. PulseJam Engine operates entirely on local processing. We don't upload your audio to external cloud servers or harvest your riffs.
              </p>

              <ul className="space-y-4 pt-2">
                <li className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#e7c9a6]/10 flex items-center justify-center shrink-0 text-[#e7c9a6]">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-body-md font-bold text-[#e5e2e1]">100% Local Execution</h4>
                    <p className="text-sm text-[#d0c5af]">Zero reliance on external servers during live play.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#e7c9a6]/10 flex items-center justify-center shrink-0 text-[#e7c9a6]">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-body-md font-bold text-[#e5e2e1]">No Data Harvesting</h4>
                    <p className="text-sm text-[#d0c5af]">Your performance sessions stay on your device, always.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex justify-center">
              <div className="w-72 h-72 border border-dashed border-[#e7c9a6]/30 rounded-full flex items-center justify-center relative spin-slow">
                <div className="w-52 h-52 glass-panel rounded-full border border-[#f2ca50]/50 flex items-center justify-center highlight-top shadow-[0_0_40px_rgba(242,202,80,0.15)] text-[#f2ca50]">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA Card */}
          <div className="px-6 md:px-12 max-w-4xl mx-auto text-center glass-panel p-12 md:p-16 rounded-3xl border border-hairline shadow-2xl highlight-top space-y-6">
            <h2 className="font-headline-md text-4xl sm:text-5xl text-[#e5e2e1]">Ready to Jam?</h2>
            <p className="font-body-md text-[#d0c5af] text-lg max-w-2xl mx-auto">
              Download PulseJam AI for macOS (.dmg) and transform your practice sessions today.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
              <a
                href="/downloads/PulseJam_0.1.0_aarch64.dmg"
                download="PulseJam_0.1.0_aarch64.dmg"
                className="bg-gradient-brass text-[#3c2f00] font-label-caps text-xs px-8 py-4 rounded-full highlight-top uppercase tracking-widest font-bold hover:brightness-110 transition-all shadow-[0_0_30px_rgba(242,202,80,0.25)] flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download for macOS (.dmg)</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-[#0e0e0e] py-16 border-t border-hairline">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <a href="#" className="font-headline-sm text-xl text-[#f2ca50] font-bold flex items-center gap-2">
              PulseJam AI
            </a>
            <p className="font-body-md text-xs text-[#d0c5af] mt-2">
              © 2026 PulseJam AI. Crafted with PulseJam Engine & Lenis Smooth Scroll.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 font-label-caps text-xs text-[#d0c5af]">
            <a href="#" className="hover:text-[#f2ca50] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#f2ca50] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#f2ca50] transition-colors">Security</a>
            <a href="#" className="hover:text-[#f2ca50] transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
