'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Screen Component: PulseJam Cinematic Narrative Experience
 * Extracted from Stitch MCP screen 'c630a39a9ca245aca7f6f2586b4f0532' ('Pulsejam: Cinematic Narrative Experience')
 * 
 * Features:
 * 1. Process Section:
 *    - Active breathing & glowing hover-style animations for all 3 step images (Step 01, Step 02, Step 03)
 *      triggered automatically when scrolled into view without requiring mouse hover.
 *    - Glowing animated SVG path line that lights up and sends traveling energy pulses down the line on scroll.
 * 2. Pinned Scenarios Section with GSAP ScrollTrigger & Snap:
 *    - Pinned in place at top top with top padding clearing fixed navbar.
 *    - Snapping (snapTo: [0, 0.5, 1]) prevents half-and-half card positions.
 *    - Scroll input drives left-to-right state transitions (Practice → Growth → Performance).
 *    - Unpins ONLY once Performance card is reached, transitioning straight into #security with 0 dead space.
 */
export const RefinedBrandExperienceScreen: React.FC = () => {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [complexity, setComplexity] = useState(75);

  // GSAP ScrollTrigger references for Scenarios Pinned Section
  const scenariosRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progressVal, setProgressVal] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = scenariosRef.current;
    const track = trackRef.current;

    if (!section || !track) return;

    // Use GSAP Context for scope safety and clean unmount cleanup
    const ctx = gsap.context(() => {
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
    }, scenariosRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-body-md relative overflow-x-hidden selection:bg-[#d4af37] selection:text-[#3c2f00]">
      {/* Atmospheric Top Background Gradient */}
      <div className="fixed top-0 inset-x-0 h-64 bg-gradient-to-b from-[#131313] via-[#131313]/80 to-transparent -z-10 pointer-events-none" />

      {/* ── Top Navigation (h-24 = 96px fixed top navbar) ────────────── */}
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
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24">
        {/* ── Hero Section ────────────────────────────────────────────── */}
        <section className="min-h-[90vh] flex flex-col justify-center py-24 relative px-6 md:px-12 max-w-[1280px] mx-auto overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity"
              style={{ backgroundImage: "url('/images/hero_studio_bg.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#131313] via-[#131313]/80 to-[#131313]" />
          </div>

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
              Meet the AI that listens and reacts like a real bandmate. PulseJam AI breathes life into your practice sessions, transforming cold code into warm, responsive musical accompaniment.
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
        <div className="h-32 bg-gradient-to-b from-transparent via-[#131313] to-[#131313]" />

        {/* ── Section 1: The Vision ───────────────────────────────────── */}
        <section id="vision" className="px-6 md:px-12 max-w-[1280px] mx-auto py-32 relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center relative z-10">
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
                It analyzes your playing style in real-time, matching your dynamics, shifting tempo when you push, and pulling back when you breathe.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.8 }}
              className="md:col-span-6 relative mt-16 md:mt-0"
            >
              <div className="relative w-full aspect-[4/5] md:aspect-square">
                <div className="absolute right-0 top-0 w-[80%] h-[90%] glass-panel rounded-2xl overflow-hidden border border-hairline highlight-top z-20 animate-float shadow-2xl">
                  <div
                    className="absolute inset-0 bg-cover bg-center mix-blend-luminosity opacity-70"
                    style={{ backgroundImage: "url('/images/vision_console.jpg')" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#131313]/90 via-[#131313]/20 to-transparent" />
                </div>

                <div className="absolute left-0 bottom-0 w-[60%] h-[60%] bg-[#2a2a2a] rounded-2xl border border-[#e7c9a6]/20 overflow-hidden z-10 animate-float-delayed p-6 flex flex-col justify-end">
                  <div className="absolute inset-0 bg-[#131313]/80" />
                  <div className="relative z-10">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f2ca50" strokeWidth="2" className="mb-2">
                      <path d="M12 2v20M17 5v14M7 8v8" />
                    </svg>
                    <p className="font-label-caps text-[#f2ca50] tracking-widest text-[10px]">REAL-TIME ANALYSIS</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Section 2: Cinematic Narrative Experience - The Process ── */}
        <section id="experience" className="py-32 relative bg-[#0e0e0e]/60 border-t border-hairline overflow-hidden">
          <div className="px-6 md:px-12 max-w-[1280px] mx-auto text-center mb-24 relative z-10 space-y-4">
            <span className="font-label-caps text-xs text-[#e7c9a6] uppercase tracking-widest">The Process</span>
            <h2 className="font-headline-md text-4xl sm:text-5xl text-[#e5e2e1]">Intuitive By Design</h2>
          </div>

          <div className="px-6 md:px-12 max-w-[1000px] mx-auto relative z-10">
            {/* Animated & Glowing SVG Connecting Path */}
            <svg
              className="hidden md:block absolute top-24 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none z-0"
              fill="none"
              viewBox="0 0 800 500"
            >
              {/* Outer Glowing Backlight Path */}
              <motion.path
                d="M 100 0 C 100 200, 700 100, 700 300 C 700 400, 400 450, 400 500"
                stroke="url(#paint_narrative_line_glow)"
                strokeWidth="8"
                strokeLinecap="round"
                className="blur-md"
                initial={{ pathLength: 0, opacity: 0.2 }}
                whileInView={{ pathLength: 1, opacity: [0.3, 0.8, 0.4] }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{
                  pathLength: { duration: 2.5, ease: 'easeInOut' },
                  opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                }}
              />

              {/* Main Crisp Gold Dashed Path */}
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

              {/* Traveling Glowing Light Pulse Segment */}
              <motion.path
                d="M 100 0 C 100 200, 700 100, 700 300 C 700 400, 400 450, 400 500"
                stroke="#ffe088"
                strokeDasharray="40 300"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ strokeDashoffset: 340, opacity: 0 }}
                whileInView={{
                  strokeDashoffset: [340, 0],
                  opacity: [0, 1, 0],
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

            {/* 3 Steps with Active Breathing & Hover-Style Image Animations */}
            <div className="flex flex-col space-y-24 md:space-y-40 relative z-10">
              {/* Step 1: Plug In */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
                className="flex flex-col md:flex-row items-center gap-12 md:gap-24"
              >
                <div className="w-full md:w-1/2 flex justify-center md:justify-end">
                  <motion.div
                    whileInView={{
                      scale: [1, 1.06, 1],
                      boxShadow: [
                        '0 0 30px rgba(242,202,80,0.25)',
                        '0 0 55px rgba(242,202,80,0.5)',
                        '0 0 35px rgba(242,202,80,0.3)',
                      ],
                    }}
                    viewport={{ once: false, margin: '-50px' }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-40 h-40 md:w-48 md:h-48 rounded-full glass-panel border border-[#e7c9a6]/40 overflow-hidden relative group"
                  >
                    <motion.div
                      whileInView={{
                        scale: [1, 1.12, 1],
                        opacity: [0.75, 1, 0.85],
                      }}
                      viewport={{ once: false, margin: '-50px' }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-cover bg-center mix-blend-luminosity"
                      style={{ backgroundImage: "url('/images/process_step1.jpg')" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent" />
                    <div className="absolute bottom-4 inset-x-0 text-center">
                      <span className="font-label-caps text-[10px] text-[#f2ca50] uppercase tracking-widest bg-[#131313]/80 px-3 py-1 rounded-full border border-hairline shadow-md">
                        Audio Input
                      </span>
                    </div>
                  </motion.div>
                </div>
                <div className="w-full md:w-1/2 text-center md:text-left">
                  <span className="font-label-caps text-[#f2ca50] tracking-widest text-sm mb-3 block font-bold">STEP 01</span>
                  <h3 className="font-headline-sm text-3xl md:text-4xl text-[#e5e2e1] mb-4">Plug In</h3>
                  <p className="font-body-md text-[#d0c5af] text-lg leading-relaxed">
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
                className="flex flex-col md:flex-row-reverse items-center gap-12 md:gap-24"
              >
                <div className="w-full md:w-1/2 flex justify-center md:justify-start">
                  <motion.div
                    whileInView={{
                      scale: [1, 1.06, 1],
                      boxShadow: [
                        '0 0 30px rgba(231,201,166,0.25)',
                        '0 0 55px rgba(231,201,166,0.5)',
                        '0 0 35px rgba(231,201,166,0.3)',
                      ],
                    }}
                    viewport={{ once: false, margin: '-50px' }}
                    transition={{ duration: 3, delay: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-40 h-40 md:w-48 md:h-48 rounded-full glass-panel border border-[#e7c9a6]/40 overflow-hidden relative group"
                  >
                    <motion.div
                      whileInView={{
                        scale: [1, 1.12, 1],
                        opacity: [0.75, 1, 0.85],
                      }}
                      viewport={{ once: false, margin: '-50px' }}
                      transition={{ duration: 3, delay: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-cover bg-center mix-blend-luminosity"
                      style={{ backgroundImage: "url('/images/process_step2.jpg')" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent" />
                    <div className="absolute bottom-4 inset-x-0 text-center">
                      <span className="font-label-caps text-[10px] text-[#e7c9a6] uppercase tracking-widest bg-[#131313]/80 px-3 py-1 rounded-full border border-hairline shadow-md">
                        Live Pitch & Tempo
                      </span>
                    </div>
                  </motion.div>
                </div>
                <div className="w-full md:w-1/2 text-center md:text-right">
                  <span className="font-label-caps text-[#e7c9a6] tracking-widest text-sm mb-3 block font-bold">STEP 02</span>
                  <h3 className="font-headline-sm text-3xl md:text-4xl text-[#e5e2e1] mb-4">Play Naturally</h3>
                  <p className="font-body-md text-[#d0c5af] text-lg leading-relaxed">
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
                className="flex flex-col md:flex-row items-center gap-12 md:gap-24"
              >
                <div className="w-full md:w-1/2 flex justify-center md:justify-end">
                  <motion.div
                    whileInView={{
                      scale: [1, 1.06, 1],
                      boxShadow: [
                        '0 0 30px rgba(212,175,55,0.25)',
                        '0 0 55px rgba(212,175,55,0.5)',
                        '0 0 35px rgba(212,175,55,0.3)',
                      ],
                    }}
                    viewport={{ once: false, margin: '-50px' }}
                    transition={{ duration: 3, delay: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-40 h-40 md:w-48 md:h-48 rounded-full glass-panel border border-[#e7c9a6]/40 overflow-hidden relative group"
                  >
                    <motion.div
                      whileInView={{
                        scale: [1, 1.12, 1],
                        opacity: [0.75, 1, 0.85],
                      }}
                      viewport={{ once: false, margin: '-50px' }}
                      transition={{ duration: 3, delay: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-cover bg-center mix-blend-luminosity"
                      style={{ backgroundImage: "url('/images/process_step3.jpg')" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent" />
                    <div className="absolute bottom-4 inset-x-0 text-center">
                      <span className="font-label-caps text-[10px] text-[#d4af37] uppercase tracking-widest bg-[#131313]/80 px-3 py-1 rounded-full border border-hairline shadow-md">
                        AI Companion Stems
                      </span>
                    </div>
                  </motion.div>
                </div>
                <div className="w-full md:w-1/2 text-center md:text-left">
                  <span className="font-label-caps text-[#d4af37] tracking-widest text-sm mb-3 block font-bold">STEP 03</span>
                  <h3 className="font-headline-sm text-3xl md:text-4xl text-[#e5e2e1] mb-4">The App Reacts</h3>
                  <p className="font-body-md text-[#d0c5af] text-lg leading-relaxed">
                    Experience a backing track that ebbs and flows with your performance, creating a unique jam every time.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Section 3: GSAP SCROLLTRIGGER PINNED SCENARIOS SECTION ──── */}
        <section id="stories" ref={scenariosRef} className="h-screen w-full relative border-t border-hairline bg-[#131313] overflow-hidden">
          {/* Top padding (pt-28 md:pt-32) clears the h-24 fixed top navbar so 'Everyday Jams' is 100% visible */}
          <div className="w-full h-full flex flex-col justify-between pt-28 md:pt-32 pb-8 px-6 md:px-12 relative z-10">
            {/* Ambient Backdrops */}
            <div className="absolute inset-0 pointer-events-none -z-10">
              <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#f2ca50]/5 rounded-full blur-[160px]" />
              <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#e7c9a6]/5 rounded-full blur-[160px]" />
            </div>

            {/* Header Stage Selector Bar */}
            <div className="max-w-[1280px] mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4 z-20">
              <div>
                <span className="font-label-caps text-xs text-[#e7c9a6] uppercase tracking-widest block mb-1">
                  Scenarios
                </span>
                <h2 className="font-headline-md text-3xl md:text-5xl text-[#e5e2e1] font-normal tracking-tight">Everyday Jams</h2>
              </div>

              {/* Dynamic Stage Pill Highlights */}
              <div className="flex items-center gap-3 bg-[#201f1f] px-5 py-2.5 rounded-full border border-hairline shadow-inner">
                <span className={`font-label-caps text-xs px-3.5 py-1 rounded-full transition-all duration-300 ${
                  activeIndex === 0 ? 'text-[#f2ca50] bg-[#f2ca50]/15 font-bold border border-[#f2ca50]/40' : 'text-[#d0c5af]/60'
                }`}>
                  01 PRACTICE
                </span>
                <span className="text-[#e7c9a6]/40">•</span>
                <span className={`font-label-caps text-xs px-3.5 py-1 rounded-full transition-all duration-300 ${
                  activeIndex === 1 ? 'text-[#f2ca50] bg-[#f2ca50]/15 font-bold border border-[#f2ca50]/40' : 'text-[#d0c5af]/60'
                }`}>
                  02 GROWTH
                </span>
                <span className="text-[#e7c9a6]/40">•</span>
                <span className={`font-label-caps text-xs px-3.5 py-1 rounded-full transition-all duration-300 ${
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

            {/* Horizontal Track Canvas: Scrubbed & Snapped via GSAP ScrollTrigger (0% -> -66.666%) */}
            <div className="w-full flex-1 flex items-center overflow-hidden relative my-auto">
              <div
                ref={trackRef}
                className="flex flex-row w-[300%] h-full items-center shrink-0"
              >
                {/* ── PANEL 1: PRACTICE ── */}
                <div className="w-1/3 h-full px-4 md:px-8 flex items-center justify-center shrink-0">
                  <div className="max-w-[1280px] w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div className="md:col-span-7 bg-[#2a2a2a]/60 rounded-3xl border border-hairline p-8 md:p-12 relative overflow-hidden flex flex-col justify-end min-h-[360px] md:min-h-[440px] shadow-2xl group">
                      <div
                        className="absolute inset-0 bg-cover bg-center mix-blend-luminosity opacity-50 group-hover:opacity-75 transition-opacity duration-700 group-hover:scale-105"
                        style={{ backgroundImage: "url('/images/living_room_jam.jpg')" }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/60 to-transparent" />

                      <div className="space-y-4 relative z-10">
                        <span className="font-label-caps text-xs border border-[#4d4635] rounded-full px-4 py-1.5 inline-block text-[#e7c9a6] bg-[#131313]/70 backdrop-blur">
                          Practice
                        </span>
                        <h3 className="font-headline-sm text-3xl md:text-5xl text-[#e5e2e1]">The Living Room Concert</h3>
                        <p className="font-body-md text-base md:text-lg text-[#d0c5af] max-w-lg leading-relaxed">
                          Transform quiet evenings into full-band experiences. Practice silently with headphones while feeling the weight of a live ensemble breathing with every note.
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-5 glass-panel border border-hairline rounded-3xl p-8 md:p-10 highlight-top shadow-2xl space-y-4">
                      <div className="font-label-caps text-xs text-[#f2ca50] tracking-widest">SCENARIO 01 · PRACTICE</div>
                      <h4 className="font-headline-sm text-2xl text-[#e5e2e1]">Intimate Solo Jam</h4>
                      <p className="font-body-md text-sm text-[#d0c5af] leading-relaxed">
                        Focus on the dynamic interaction between acoustic guitar riffs and responsive backing stem layers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── PANEL 2: GROWTH ── */}
                <div className="w-1/3 h-full px-4 md:px-8 flex items-center justify-center shrink-0">
                  <div className="max-w-[1280px] w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div className="md:col-span-6 glass-panel border border-hairline rounded-3xl p-8 md:p-12 highlight-top shadow-2xl space-y-6">
                      <span className="font-label-caps text-xs text-[#e7c9a6] border border-[#4d4635] rounded-full px-4 py-1.5 inline-block bg-[#131313]/70">
                        Growth
                      </span>
                      <h3 className="font-headline-sm text-3xl md:text-5xl text-[#e5e2e1]">Mastering New Scales</h3>
                      <p className="font-body-md text-base md:text-lg text-[#d0c5af] leading-relaxed">
                        Break out of your rut. Set parameters for complex modes and let the AI challenge you with unpredictable chord voicings and rhythmic variations.
                      </p>
                    </div>

                    <div className="md:col-span-6 glass-panel border border-hairline rounded-3xl p-8 md:p-10 highlight-top shadow-2xl space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-[#f2ca50]/10 border border-[#f2ca50]/30 flex items-center justify-center text-[#f2ca50]">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 10v6M2 10v6M12 2v20" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-headline-sm text-2xl text-[#e5e2e1]">AI Mode Complexity</h4>
                          <p className="font-label-caps text-xs text-[#d0c5af]">Dynamic Harmonics Engine</p>
                        </div>
                      </div>

                      <div className="space-y-4 bg-[#131313]/80 p-6 rounded-2xl border border-hairline">
                        <div className="flex justify-between items-center font-label-caps text-xs text-[#d0c5af]">
                          <span>Complexity Control</span>
                          <span className="text-[#f2ca50] font-[#f2ca50] font-bold">{complexity}% Advanced</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={complexity}
                          onChange={(e) => setComplexity(Number(e.target.value))}
                          className="w-full accent-[#f2ca50] bg-[#0e0e0e] h-2.5 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── PANEL 3: PERFORMANCE ── */}
                <div className="w-1/3 h-full px-4 md:px-8 flex items-center justify-center shrink-0">
                  <div className="max-w-[1280px] w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div className="md:col-span-7 bg-[#2a2a2a]/60 rounded-3xl border border-hairline p-8 md:p-12 relative overflow-hidden flex flex-col justify-end min-h-[360px] md:min-h-[440px] shadow-2xl group">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-luminosity group-hover:opacity-80 transition-opacity duration-700 group-hover:scale-105"
                        style={{ backgroundImage: "url('/images/scenario_performance.jpg')" }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/60 to-transparent" />

                      <div className="space-y-4 relative z-10">
                        <span className="font-label-caps text-xs border border-[#4d4635] rounded-full px-4 py-1.5 inline-block text-[#f2ca50] bg-[#131313]/70 backdrop-blur">
                          Performance
                        </span>
                        <h3 className="font-headline-sm text-3xl md:text-5xl text-[#e5e2e1]">The Live Companion</h3>
                        <p className="font-body-md text-base md:text-lg text-[#d0c5af] max-w-lg leading-relaxed">
                          Take it to the stage. PulseJam acts as an invisible safety net, generating stems that align perfectly with your live band's tempo fluctuations, ensuring a remarkably tight sound.
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-5 glass-panel border border-hairline rounded-3xl p-8 md:p-10 highlight-top shadow-2xl space-y-6">
                      <div className="font-label-caps text-xs text-[#f2ca50] tracking-widest">SCENARIO 03 · PERFORMANCE</div>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-label-caps text-xs text-[#e7c9a6] uppercase tracking-wider">Zero Latency Sync</span>
                      </div>
                      <p className="font-body-md text-sm text-[#d0c5af] leading-relaxed">
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
        <section id="security" className="py-24 relative border-t border-hairline bg-[#0e0e0e]/60">
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
                Creative integrity demands a secure environment. PulseJam AI operates entirely on local processing. We don't upload your audio to external cloud servers or harvest your riffs.
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
              © 2026 PulseJam AI. All rights reserved.
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
