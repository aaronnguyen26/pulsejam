'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Screen Component: PulseJam Cinematic Narrative Experience
 * Extracted from Stitch MCP screen 'c630a39a9ca245aca7f6f2586b4f0532' ('Pulsejam: Cinematic Narrative Experience')
 * & 'fa4997af7e034a2bad88ed987ae505e0' ('PulseJam: Refined Mobile Narrative')
 * 
 * Features:
 * 1. Mobile Experience:
 *    - Fixed compact top mobile navigation bar with centered gold logo.
 *    - Floating bottom mobile tab bar (Vision, Process, Scenarios, Security) active on screens < 768px.
 *    - Responsive touch layout for mobile without layout breaking.
 * 2. Process Section:
 *    - Scroll-driven step glow (Step 01 → 02 → 03) active ONLY while scrolling through the section in order.
 *    - Works bidirectionally (scrolling down: 01 → 02 → 03, scrolling up: 03 → 02 → 01).
 *    - Glowing animated SVG path line with energy pulse.
 * 3. Scenarios Section:
 *    - Growth card uses authentic guitar fretboard image extracted from 'Pulsejam: Dynamic Security Experience'.
 *    - GSAP ScrollTrigger pinned horizontal scroll-jack with snap to 100% full view.
 */
export const RefinedBrandExperienceScreen: React.FC = () => {
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Process Section ScrollTrigger State (0 = Step 1, 1 = Step 2, 2 = Step 3, -1 = None)
  const processRef = useRef<HTMLDivElement>(null);
  const [activeProcessStep, setActiveProcessStep] = useState<number>(-1);

  // GSAP ScrollTrigger references for Scenarios Pinned Section
  const scenariosRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progressVal, setProgressVal] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = scenariosRef.current;
    const track = trackRef.current;
    const processSec = processRef.current;

    // Use GSAP Context for scope safety and clean unmount cleanup
    const ctx = gsap.context(() => {
      // 1. Process Section ScrollTrigger: highlights Step 01 -> 02 -> 03 in order (and reverse)
      if (processSec) {
        ScrollTrigger.create({
          trigger: processSec,
          start: 'top 70%',
          end: 'bottom 20%',
          scrub: 0.3,
          onUpdate: (self) => {
            const p = self.progress;
            if (p < 0.35) {
              setActiveProcessStep(0);
            } else if (p < 0.7) {
              setActiveProcessStep(1);
            } else {
              setActiveProcessStep(2);
            }
          },
          onLeave: () => setActiveProcessStep(-1),
          onLeaveBack: () => setActiveProcessStep(-1),
        });
      }

      // 2. Scenarios Horizontal Scroll-Jack (desktop only)
      if (section && track && window.innerWidth >= 768) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            pin: true,
            start: 'top top',
            end: '+=200%', // 200% scroll distance for 3 panels
            scrub: 0.5,
            snap: {
              snapTo: [0, 0.5, 1], // Snap 100% cleanly to Practice (0), Growth (0.5), or Performance (1.0)
              duration: { min: 0.25, max: 0.45 },
              delay: 0.08,
              ease: 'power1.inOut',
            },
            anticipatePin: 1,
            onUpdate: (self) => {
              const p = self.progress;
              setProgressVal(p);
              if (p < 0.33) {
                setActiveIndex(0);
              } else if (p < 0.66) {
                setActiveIndex(1);
              } else {
                setActiveIndex(2);
              }
            },
          },
        });

        // Scrub horizontal track from 0% to -66.666%
        tl.to(track, {
          xPercent: -66.666,
          ease: 'none',
        });
      }
    });

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-body-md relative overflow-x-hidden selection:bg-[#d4af37] selection:text-[#3c2f00]">
      {/* Atmospheric Top Background Gradient */}
      <div className="fixed top-0 inset-x-0 h-64 bg-gradient-to-b from-[#131313] via-[#131313]/80 to-transparent -z-10 pointer-events-none" />

      {/* ── Top Navigation Bar (h-16 on mobile, h-24 on desktop) ──────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#131313]/80 backdrop-blur-2xl border-b border-[#e7c9a6]/10 transition-all duration-300">
        <div className="flex justify-between items-center h-16 md:h-24 px-4 md:px-12 max-w-[1280px] mx-auto">
          <a href="#" className="font-headline-sm text-xl md:text-2xl text-[#f2ca50] tracking-tight flex items-center gap-3 group font-bold">
            <img
              src="/pulsejam_app_logo.jpg"
              alt="PulseJam AI Logo"
              className="w-8 h-8 rounded-lg border border-[#f2ca50]/40 shadow-[0_0_12px_rgba(242,202,80,0.3)] object-cover group-hover:scale-105 transition-transform"
            />
            <span>PulseJam AI</span>
          </a>

          <div className="hidden md:flex gap-10 items-center text-sm font-body-md text-[#d0c5af]">
            <a href="#vision" className="hover:text-[#f2ca50] transition-colors">The Vision</a>
            <a href="#experience" className="hover:text-[#f2ca50] transition-colors">The Process</a>
            <a href="#stories" className="hover:text-[#f2ca50] transition-colors">Scenarios</a>
            <a href="#security" className="hover:text-[#f2ca50] transition-colors">Security</a>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setDownloadOpen((v) => !v)}
                className="bg-gradient-brass text-[#3c2f00] font-label-caps text-[10px] md:text-xs px-4 md:px-7 py-2.5 md:py-2.5 rounded-full highlight-top uppercase tracking-widest font-bold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(242,202,80,0.2)] flex items-center gap-1.5 md:gap-2 cursor-pointer"
              >
              <span>Get PulseJam</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform duration-300 ${downloadOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {downloadOpen && (
              <div className="absolute right-0 top-full mt-3 w-80 bg-[#1f2020] border border-[#f2ca50]/30 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#4d4635]/40">
                  <img
                    src="/pulsejam_app_logo.jpg"
                    alt="PulseJam App"
                    className="w-12 h-12 rounded-xl border border-[#f2ca50]/50 shadow-[0_0_12px_rgba(242,202,80,0.3)] object-cover shrink-0"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#f2ca50] font-mono">PulseJam AI Studio Pro</h4>
                    <p className="text-[10px] text-[#d0c5af]/70 font-mono">macOS Apple Silicon (.dmg)</p>
                  </div>
                </div>
                <a
                  href="/downloads/PulseJam_0.1.0_aarch64.dmg"
                  download="PulseJam_0.1.0_aarch64.dmg"
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors group text-slate-100"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e7c9a6" strokeWidth="2" className="group-hover:stroke-[#f2ca50] transition-colors">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="font-body-md font-medium text-xs md:text-sm text-[#f2ca50]">Download for macOS</span>
                    <span className="text-[10px] md:text-xs text-[#d0c5af]">Apple Silicon (.dmg)</span>
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>

      <main className="pt-16 md:pt-24 pb-20 md:pb-0">
        {/* ── Hero Section ────────────────────────────────────────────── */}
        <section className="min-h-[85vh] md:min-h-[90vh] flex flex-col justify-center py-16 md:py-24 relative px-6 md:px-12 max-w-[1280px] mx-auto overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity"
              style={{ backgroundImage: "url('/images/hero_studio_bg.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#131313] via-[#131313]/80 to-[#131313]" />
          </div>

          <div className="absolute top-1/4 left-1/3 w-72 md:w-96 h-72 md:h-96 bg-[#f2ca50]/10 rounded-full blur-[140px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
            className="space-y-6 md:space-y-10 max-w-4xl relative z-10 text-center md:text-left"
          >
            <h1 className="font-display-lg text-4xl sm:text-7xl md:text-8xl lg:text-9xl text-[#e5e2e1] leading-[1.08] tracking-tight font-normal">
              Your Instrument,<br />
              <span className="text-gradient-brass italic">Reimagined.</span>
            </h1>

            <p className="font-body-lg text-body-lg text-[#d0c5af] max-w-2xl leading-relaxed text-lg sm:text-xl md:text-2xl opacity-90 mx-auto md:mx-0">
              Meet the AI that listens and reacts like a real bandmate. PulseJam AI breathes life into your practice sessions, transforming cold code into warm, responsive musical accompaniment.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-4 md:pt-6 justify-center md:justify-start">
              <a
                href="/downloads/PulseJam_0.1.0_aarch64.dmg"
                download="PulseJam_0.1.0_aarch64.dmg"
                className="bg-gradient-brass text-[#3c2f00] font-label-caps text-xs px-8 md:px-10 py-4 md:py-5 rounded-full highlight-top uppercase tracking-widest font-bold hover:brightness-110 transition-all inline-flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(242,202,80,0.25)] hover:shadow-[0_0_40px_rgba(242,202,80,0.4)] cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download for macOS (.dmg)</span>
              </a>

              <a
                href="#vision"
                className="bg-transparent border border-[#f2ca50]/50 text-[#f2ca50] font-label-caps text-xs px-8 md:px-10 py-4 md:py-5 rounded-full uppercase tracking-widest font-bold hover:bg-[#f2ca50]/5 hover:border-[#f2ca50] transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Explore The Vision</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </a>
            </div>
          </motion.div>
        </section>

        {/* Soft Transition */}
        <div className="h-20 md:h-32 bg-gradient-to-b from-transparent via-[#131313] to-[#131313]" />

        {/* ── Section 1: The Vision ───────────────────────────────────── */}
        <section id="vision" className="px-6 md:px-12 max-w-[1280px] mx-auto py-20 md:py-32 relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.8 }}
              className="md:col-span-6 space-y-6 md:space-y-8 text-center md:text-left"
            >
              <div className="inline-flex items-center gap-3 font-label-caps text-xs text-[#e7c9a6] uppercase tracking-widest justify-center md:justify-start">
                <span className="w-8 h-[1px] bg-[#e7c9a6]" />
                The Vision
              </div>

              <h2 className="font-headline-md text-3xl sm:text-5xl md:text-6xl text-[#e5e2e1]">
                Not a tool.<br />
                <span className="italic text-[#dfc29f]">A Companion.</span>
              </h2>

              <p className="font-body-md text-[#d0c5af] text-base md:text-lg leading-relaxed">
                Traditional backing tracks are static, lifeless. Metronomes are mechanical dictators. We built PulseJam AI to feel like an instrument itself—responsive, dynamic, and intuitive.
              </p>

              <p className="font-body-md text-[#d0c5af] text-base md:text-lg leading-relaxed">
                It analyzes your playing style in real-time, matching your dynamics, shifting tempo when you push, and pulling back when you breathe.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.8 }}
              className="md:col-span-6 relative mt-8 md:mt-0"
            >
              <div className="relative w-full aspect-[4/3] md:aspect-square">
                <div className="absolute right-0 top-0 w-[85%] md:w-[80%] h-[90%] glass-panel rounded-2xl overflow-hidden border border-hairline highlight-top z-20 animate-float shadow-2xl">
                  <div
                    className="absolute inset-0 bg-cover bg-center mix-blend-luminosity opacity-70"
                    style={{ backgroundImage: "url('/images/vision_console.jpg')" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#131313]/90 via-[#131313]/20 to-transparent" />
                </div>

                <div className="absolute left-0 bottom-0 w-[65%] md:w-[60%] h-[55%] md:h-[60%] bg-[#2a2a2a] rounded-2xl border border-[#e7c9a6]/20 overflow-hidden z-10 animate-float-delayed p-4 md:p-6 flex flex-col justify-end">
                  <div className="absolute inset-0 bg-[#131313]/80" />
                  <div className="relative z-10">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f2ca50" strokeWidth="2" className="mb-2">
                      <path d="M12 2v20M17 5v14M7 8v8" />
                    </svg>
                    <p className="font-label-caps text-[#f2ca50] tracking-widest text-[9px] md:text-[10px]">REAL-TIME ANALYSIS</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Section 2: Cinematic Narrative Experience - The Process ── */}
        <section id="experience" ref={processRef} className="py-20 md:py-32 relative bg-[#0e0e0e]/60 border-t border-hairline overflow-hidden">
          <div className="px-6 md:px-12 max-w-[1280px] mx-auto text-center mb-16 md:mb-24 relative z-10 space-y-4">
            <span className="font-label-caps text-xs text-[#e7c9a6] uppercase tracking-widest">The Process</span>
            <h2 className="font-headline-md text-3xl sm:text-5xl text-[#e5e2e1]">Intuitive By Design</h2>
          </div>

          <div className="px-6 md:px-12 max-w-[1000px] mx-auto relative z-10">
            {/* Animated & Glowing SVG Connecting Path (Desktop only) */}
            <svg
              className="hidden md:block absolute top-24 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none z-0"
              fill="none"
              viewBox="0 0 800 500"
            >
              <motion.path
                d="M 100 0 C 100 200, 700 100, 700 300 C 700 400, 400 450, 400 500"
                stroke="url(#paint_narrative_line_glow)"
                strokeWidth="8"
                strokeLinecap="round"
                className="blur-md"
                initial={{ pathLength: 0, opacity: 0.2 }}
                whileInView={{ pathLength: 1, opacity: activeProcessStep !== -1 ? 0.8 : 0.2 }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />

              <motion.path
                d="M 100 0 C 100 200, 700 100, 700 300 C 700 400, 400 450, 400 500"
                stroke="url(#paint_narrative_line)"
                strokeDasharray="8 8"
                strokeWidth="3"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{ duration: 2.5, ease: 'easeInOut' }}
              />

              <motion.path
                d="M 100 0 C 100 200, 700 100, 700 300 C 700 400, 400 450, 400 500"
                stroke="#ffe088"
                strokeDasharray="40 300"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ strokeDashoffset: 340, opacity: 0 }}
                whileInView={{
                  strokeDashoffset: [340, 0],
                  opacity: activeProcessStep !== -1 ? [0, 1, 0] : 0,
                }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />

              <defs>
                <linearGradient id="paint_narrative_line" x1="100" y1="0" x2="400" y2="500" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f2ca50" stopOpacity="0.4" />
                  <stop offset="0.5" stopColor="#ffe088" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#f2ca50" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="paint_narrative_line_glow" x1="100" y1="0" x2="400" y2="500" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f2ca50" stopOpacity="0.3" />
                  <stop offset="0.5" stopColor="#ffe088" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#f2ca50" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </svg>

            {/* 3 Steps: Mobile friendly vertical layout & active scroll glow */}
            <div className="flex flex-col space-y-16 md:space-y-40 relative z-10">
              {/* Step 1: Plug In */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
                className="flex flex-col md:flex-row items-center gap-8 md:gap-24"
              >
                <div className="w-full md:w-1/2 flex justify-center md:justify-end">
                  <div
                    className={`w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full glass-panel overflow-hidden relative group transition-all duration-500 ${
                      activeProcessStep === 0
                        ? 'border-2 border-[#f2ca50] scale-105 shadow-[0_0_55px_rgba(242,202,80,0.6)]'
                        : 'border border-[#e7c9a6]/30 opacity-75 shadow-none'
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
                        activeProcessStep === 0
                          ? 'opacity-100 scale-110 mix-blend-normal'
                          : 'opacity-70 mix-blend-luminosity'
                      }`}
                      style={{ backgroundImage: "url('/images/process_step1.jpg')" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent" />
                    <div className="absolute bottom-3 md:bottom-4 inset-x-0 text-center">
                      <span className={`font-label-caps text-[9px] md:text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border transition-all duration-300 ${
                        activeProcessStep === 0
                          ? 'text-[#f2ca50] bg-[#131313]/90 border-[#f2ca50]/60 font-bold'
                          : 'text-[#d0c5af]/80 bg-[#131313]/70 border-hairline'
                      }`}>
                        Audio Input
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/2 text-center md:text-left">
                  <span className="font-label-caps text-[#f2ca50] tracking-widest text-xs md:text-sm mb-2 md:mb-3 block font-bold">STEP 01</span>
                  <h3 className="font-headline-sm text-2xl md:text-4xl text-[#e5e2e1] mb-3 md:mb-4">Plug In</h3>
                  <p className="font-body-md text-[#d0c5af] text-base md:text-lg leading-relaxed">
                    Connect your instrument or microphone directly to your device. No complex routing required.
                  </p>
                </div>
              </motion.div>

              {/* Step 2: Play Naturally */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.215, 0.61, 0.355, 1] }}
                className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-24"
              >
                <div className="w-full md:w-1/2 flex justify-center md:justify-start">
                  <div
                    className={`w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full glass-panel overflow-hidden relative group transition-all duration-500 ${
                      activeProcessStep === 1
                        ? 'border-2 border-[#e7c9a6] scale-105 shadow-[0_0_55px_rgba(231,201,166,0.6)]'
                        : 'border border-[#e7c9a6]/30 opacity-75 shadow-none'
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
                        activeProcessStep === 1
                          ? 'opacity-100 scale-110 mix-blend-normal'
                          : 'opacity-70 mix-blend-luminosity'
                      }`}
                      style={{ backgroundImage: "url('/images/process_step2.jpg')" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent" />
                    <div className="absolute bottom-3 md:bottom-4 inset-x-0 text-center">
                      <span className={`font-label-caps text-[9px] md:text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border transition-all duration-300 ${
                        activeProcessStep === 1
                          ? 'text-[#e7c9a6] bg-[#131313]/90 border-[#e7c9a6]/60 font-bold'
                          : 'text-[#d0c5af]/80 bg-[#131313]/70 border-hairline'
                      }`}>
                        Live Pitch & Tempo
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/2 text-center md:text-right">
                  <span className="font-label-caps text-[#e7c9a6] tracking-widest text-xs md:text-sm mb-2 md:mb-3 block font-bold">STEP 02</span>
                  <h3 className="font-headline-sm text-2xl md:text-4xl text-[#e5e2e1] mb-3 md:mb-4">Play Naturally</h3>
                  <p className="font-body-md text-[#d0c5af] text-base md:text-lg leading-relaxed">
                    Just start playing. The engine instantly detects key, tempo, and dynamic intensity.
                  </p>
                </div>
              </motion.div>

              {/* Step 3: The App Reacts */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.215, 0.61, 0.355, 1] }}
                className="flex flex-col md:flex-row items-center gap-8 md:gap-24"
              >
                <div className="w-full md:w-1/2 flex justify-center md:justify-end">
                  <div
                    className={`w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full glass-panel overflow-hidden relative group transition-all duration-500 ${
                      activeProcessStep === 2
                        ? 'border-2 border-[#d4af37] scale-105 shadow-[0_0_55px_rgba(212,175,55,0.6)]'
                        : 'border border-[#e7c9a6]/30 opacity-75 shadow-none'
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
                        activeProcessStep === 2
                          ? 'opacity-100 scale-110 mix-blend-normal'
                          : 'opacity-70 mix-blend-luminosity'
                      }`}
                      style={{ backgroundImage: "url('/images/process_step3.jpg')" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent" />
                    <div className="absolute bottom-3 md:bottom-4 inset-x-0 text-center">
                      <span className={`font-label-caps text-[9px] md:text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border transition-all duration-300 ${
                        activeProcessStep === 2
                          ? 'text-[#d4af37] bg-[#131313]/90 border-[#d4af37]/60 font-bold'
                          : 'text-[#d0c5af]/80 bg-[#131313]/70 border-hairline'
                      }`}>
                        AI Companion Stems
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/2 text-center md:text-left">
                  <span className="font-label-caps text-[#d4af37] tracking-widest text-xs md:text-sm mb-2 md:mb-3 block font-bold">STEP 03</span>
                  <h3 className="font-headline-sm text-2xl md:text-4xl text-[#e5e2e1] mb-3 md:mb-4">The App Reacts</h3>
                  <p className="font-body-md text-[#d0c5af] text-base md:text-lg leading-relaxed">
                    Experience a backing track that ebbs and flows with your performance, creating a unique jam every time.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Section 3: GSAP SCROLLTRIGGER PINNED SCENARIOS SECTION ──── */}
        <section id="stories" ref={scenariosRef} className="min-h-screen md:h-screen w-full relative border-t border-hairline bg-[#131313] overflow-hidden py-16 md:py-0">
          <div className="w-full h-full flex flex-col justify-between pt-8 md:pt-32 pb-8 px-6 md:px-12 relative z-10">
            {/* Ambient Backdrops */}
            <div className="absolute inset-0 pointer-events-none -z-10">
              <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#f2ca50]/5 rounded-full blur-[160px]" />
              <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#e7c9a6]/5 rounded-full blur-[160px]" />
            </div>

            {/* Header Stage Selector Bar */}
            <div className="max-w-[1280px] mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4 z-20">
              <div className="text-center md:text-left">
                <span className="font-label-caps text-xs text-[#e7c9a6] uppercase tracking-widest block mb-1">
                  Scenarios
                </span>
                <h2 className="font-headline-md text-3xl md:text-5xl text-[#e5e2e1] font-normal tracking-tight">Everyday Jams</h2>
              </div>

              {/* Dynamic Stage Pill Highlights */}
              <div className="flex items-center gap-2 md:gap-3 bg-[#201f1f] px-3.5 md:px-5 py-2 md:py-2.5 rounded-full border border-hairline shadow-inner">
                <span className={`font-label-caps text-[10px] md:text-xs px-2.5 md:px-3.5 py-1 rounded-full transition-all duration-300 ${
                  activeIndex === 0 ? 'text-[#f2ca50] bg-[#f2ca50]/15 font-bold border border-[#f2ca50]/40' : 'text-[#d0c5af]/60'
                }`}>
                  01 PRACTICE
                </span>
                <span className="text-[#e7c9a6]/40">•</span>
                <span className={`font-label-caps text-[10px] md:text-xs px-2.5 md:px-3.5 py-1 rounded-full transition-all duration-300 ${
                  activeIndex === 1 ? 'text-[#f2ca50] bg-[#f2ca50]/15 font-bold border border-[#f2ca50]/40' : 'text-[#d0c5af]/60'
                }`}>
                  02 GROWTH
                </span>
                <span className="text-[#e7c9a6]/40">•</span>
                <span className={`font-label-caps text-[10px] md:text-xs px-2.5 md:px-3.5 py-1 rounded-full transition-all duration-300 ${
                  activeIndex === 2 ? 'text-[#f2ca50] bg-[#f2ca50]/15 font-bold border border-[#f2ca50]/40' : 'text-[#d0c5af]/60'
                }`}>
                  03 PERFORMANCE
                </span>
                <div className="w-20 h-1.5 bg-[#0e0e0e] rounded-full overflow-hidden border border-hairline ml-2 hidden sm:block">
                  <div
                    className="h-full bg-gradient-brass rounded-full origin-left transition-all duration-150"
                    style={{ transform: `scaleX(${Math.max(0.15, progressVal)})` }}
                  />
                </div>
              </div>
            </div>

            {/* Horizontal Track Canvas: Scrubbed & Snapped via GSAP ScrollTrigger (Desktop) & Responsive Stack (Mobile) */}
            <div className="w-full flex-1 flex items-center overflow-hidden relative my-auto mt-6 md:mt-0">
              <div
                ref={trackRef}
                className="flex flex-col md:flex-row w-full md:w-[300%] h-full items-center shrink-0 space-y-8 md:space-y-0"
              >
                {/* ── PANEL 1: PRACTICE ── */}
                <div className="w-full md:w-1/3 h-full px-2 md:px-8 flex items-center justify-center shrink-0">
                  <div className="max-w-[1280px] w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
                    <div className="md:col-span-7 bg-[#2a2a2a]/60 rounded-3xl border border-hairline p-6 md:p-12 relative overflow-hidden flex flex-col justify-end min-h-[300px] md:min-h-[440px] shadow-2xl group">
                      <div
                        className="absolute inset-0 bg-cover bg-center mix-blend-luminosity opacity-50 group-hover:opacity-75 transition-opacity duration-700 group-hover:scale-105"
                        style={{ backgroundImage: "url('/images/living_room_jam.jpg')" }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/60 to-transparent" />

                      <div className="space-y-3 md:space-y-4 relative z-10">
                        <span className="font-label-caps text-[10px] md:text-xs border border-[#4d4635] rounded-full px-3 md:px-4 py-1 md:py-1.5 inline-block text-[#e7c9a6] bg-[#131313]/70 backdrop-blur">
                          Practice
                        </span>
                        <h3 className="font-headline-sm text-2xl md:text-5xl text-[#e5e2e1]">The Living Room Concert</h3>
                        <p className="font-body-md text-sm md:text-lg text-[#d0c5af] max-w-lg leading-relaxed">
                          Transform quiet evenings into full-band experiences. Practice silently with headphones while feeling the weight of a live ensemble breathing with every note.
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-5 glass-panel border border-hairline rounded-3xl p-6 md:p-10 highlight-top shadow-2xl space-y-3 md:space-y-4">
                      <div className="font-label-caps text-xs text-[#f2ca50] tracking-widest">SCENARIO 01 · PRACTICE</div>
                      <h4 className="font-headline-sm text-xl md:text-2xl text-[#e5e2e1]">Intimate Solo Jam</h4>
                      <p className="font-body-md text-xs md:text-sm text-[#d0c5af] leading-relaxed">
                        Focus on the dynamic interaction between acoustic guitar riffs and responsive backing stem layers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── PANEL 2: GROWTH (Using Guitar Fretboard image) ── */}
                <div className="w-full md:w-1/3 h-full px-2 md:px-8 flex items-center justify-center shrink-0">
                  <div className="max-w-[1280px] w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
                    <div className="md:col-span-7 bg-[#2a2a2a]/60 rounded-3xl border border-hairline p-6 md:p-12 relative overflow-hidden flex flex-col justify-end min-h-[300px] md:min-h-[440px] shadow-2xl group">
                      <div
                        className="absolute inset-0 bg-cover bg-center mix-blend-luminosity opacity-50 group-hover:opacity-75 transition-opacity duration-700 group-hover:scale-105"
                        style={{ backgroundImage: "url('/images/guitar_fretboard.jpg')" }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/60 to-transparent" />

                      <div className="space-y-3 md:space-y-4 relative z-10">
                        <span className="font-label-caps text-[10px] md:text-xs border border-[#4d4635] rounded-full px-3 md:px-4 py-1 md:py-1.5 inline-block text-[#e7c9a6] bg-[#131313]/70 backdrop-blur">
                          Growth
                        </span>
                        <h3 className="font-headline-sm text-2xl md:text-5xl text-[#e5e2e1]">Mastering New Scales</h3>
                        <p className="font-body-md text-sm md:text-lg text-[#d0c5af] max-w-lg leading-relaxed">
                          Break out of your rut. Set parameters for complex modes and let the AI challenge you with unpredictable chord voicings and rhythmic variations.
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-5 glass-panel border border-hairline rounded-3xl p-6 md:p-10 highlight-top shadow-2xl space-y-3 md:space-y-4">
                      <div className="font-label-caps text-xs text-[#f2ca50] tracking-widest">SCENARIO 02 · GROWTH</div>
                      <h4 className="font-headline-sm text-xl md:text-2xl text-[#e5e2e1]">Harmonic Sparring Partner</h4>
                      <p className="font-body-md text-xs md:text-sm text-[#d0c5af] leading-relaxed">
                        Focus on the AI as a teacher and challenger. Real-time chordal adaptation and scale mode analysis pushing your improvisational skills to new heights.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── PANEL 3: PERFORMANCE ── */}
                <div className="w-full md:w-1/3 h-full px-2 md:px-8 flex items-center justify-center shrink-0">
                  <div className="max-w-[1280px] w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
                    <div className="md:col-span-7 bg-[#2a2a2a]/60 rounded-3xl border border-hairline p-6 md:p-12 relative overflow-hidden flex flex-col justify-end min-h-[300px] md:min-h-[440px] shadow-2xl group">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-luminosity group-hover:opacity-80 transition-opacity duration-700 group-hover:scale-105"
                        style={{ backgroundImage: "url('/images/scenario_performance.jpg')" }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/60 to-transparent" />

                      <div className="space-y-3 md:space-y-4 relative z-10">
                        <span className="font-label-caps text-[10px] md:text-xs border border-[#4d4635] rounded-full px-3 md:px-4 py-1 md:py-1.5 inline-block text-[#f2ca50] bg-[#131313]/70 backdrop-blur">
                          Performance
                        </span>
                        <h3 className="font-headline-sm text-2xl md:text-5xl text-[#e5e2e1]">The Live Companion</h3>
                        <p className="font-body-md text-sm md:text-lg text-[#d0c5af] max-w-lg leading-relaxed">
                          Take it to the stage. PulseJam acts as an invisible safety net, generating stems that align perfectly with your live band&apos;s tempo fluctuations, ensuring a remarkably tight sound.
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-5 glass-panel border border-hairline rounded-3xl p-6 md:p-10 highlight-top shadow-2xl space-y-4">
                      <div className="font-label-caps text-xs text-[#f2ca50] tracking-widest">SCENARIO 03 · PERFORMANCE</div>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-label-caps text-xs text-[#e7c9a6] uppercase tracking-wider">Zero Latency Sync</span>
                      </div>
                      <p className="font-body-md text-xs md:text-sm text-[#d0c5af] leading-relaxed">
                        Real-time AudioWorklet YIN pitch detection & DSP stem alignment running completely client-side.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Security & Privacy (Transitions directly from Performance with 0 dead space) ── */}
        <section id="security" className="py-16 md:py-24 relative border-t border-hairline bg-[#0e0e0e]/60">
          <div className="px-6 md:px-12 max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center mb-16 md:mb-24">
            <div className="space-y-6 md:space-y-8 text-center md:text-left">
              <div className="inline-flex items-center gap-2 border border-[#4d4635] rounded-full px-4 py-1.5 bg-[#201f1f]/50 backdrop-blur justify-center md:justify-start">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f2ca50" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="font-label-caps text-xs text-[#d0c5af]">Security Focus</span>
              </div>

              <h2 className="font-headline-md text-3xl sm:text-5xl text-[#e5e2e1]">
                Your Music,<br />
                <span className="italic text-[#e7c9a6]">Your Privacy.</span>
              </h2>

              <p className="font-body-md text-base md:text-lg text-[#d0c5af] leading-relaxed">
                Creative integrity demands a secure environment. PulseJam AI operates entirely on local processing. We don&apos;t upload your audio to external cloud servers or harvest your riffs.
              </p>

              <ul className="space-y-4 pt-2 text-left">
                <li className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#e7c9a6]/10 flex items-center justify-center shrink-0 text-[#e7c9a6]">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-body-md font-bold text-[#e5e2e1]">100% Local Execution</h4>
                    <p className="text-xs md:text-sm text-[#d0c5af]">Zero reliance on external servers during live play.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#e7c9a6]/10 flex items-center justify-center shrink-0 text-[#e7c9a6]">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-body-md font-bold text-[#e5e2e1]">No Data Harvesting</h4>
                    <p className="text-xs md:text-sm text-[#d0c5af]">Your performance sessions stay on your device, always.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex justify-center">
              <div className="w-56 h-56 md:w-72 md:h-72 border border-dashed border-[#e7c9a6]/30 rounded-full flex items-center justify-center relative spin-slow">
                <div className="w-40 h-40 md:w-52 md:h-52 glass-panel rounded-full border border-[#f2ca50]/50 flex items-center justify-center highlight-top shadow-[0_0_40px_rgba(242,202,80,0.15)] text-[#f2ca50]">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA Card */}
          <div className="px-6 md:px-12 max-w-4xl mx-auto text-center glass-panel p-8 md:p-16 rounded-3xl border border-hairline shadow-2xl highlight-top space-y-6">
            <h2 className="font-headline-md text-3xl sm:text-5xl text-[#e5e2e1]">Ready to Jam?</h2>
            <p className="font-body-md text-[#d0c5af] text-base md:text-lg max-w-2xl mx-auto">
              Download PulseJam AI for macOS (.dmg) and transform your practice sessions today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-4">
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

      {/* ── Mobile Floating Bottom Navigation Bar (md:hidden) ────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl border-t border-[#e7c9a6]/20 shadow-2xl flex justify-around items-center px-4 pb-4 pt-2.5 bg-[#0e0e0e]/95 backdrop-blur-2xl md:hidden">
        <a
          href="#vision"
          className="flex flex-col items-center justify-center text-[#f2ca50] active:scale-95 transition-transform duration-200"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="font-label-caps text-[10px] tracking-wider mt-1">Vision</span>
        </a>

        <a
          href="#experience"
          className="flex flex-col items-center justify-center text-[#d0c5af] hover:text-[#f2ca50] active:scale-95 transition-transform duration-200"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5v14M7 8v8" />
          </svg>
          <span className="font-label-caps text-[10px] tracking-wider mt-1">Process</span>
        </a>

        <a
          href="#stories"
          className="flex flex-col items-center justify-center text-[#d0c5af] hover:text-[#f2ca50] active:scale-95 transition-transform duration-200"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span className="font-label-caps text-[10px] tracking-wider mt-1">Scenarios</span>
        </a>

        <a
          href="#security"
          className="flex flex-col items-center justify-center text-[#d0c5af] hover:text-[#f2ca50] active:scale-95 transition-transform duration-200"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="font-label-caps text-[10px] tracking-wider mt-1">Security</span>
        </a>
      </nav>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-[#0e0e0e] py-12 md:py-16 border-t border-hairline pb-28 md:pb-16">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <a href="#" className="font-headline-sm text-xl text-[#f2ca50] font-bold flex items-center justify-center md:justify-start gap-2">
              PulseJam AI
            </a>
            <p className="font-body-md text-xs text-[#d0c5af] mt-2">
              © 2026 PulseJam AI. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 font-label-caps text-xs text-[#d0c5af]">
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
