'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

/**
 * Example component demonstrating scroll-triggered (whileInView) and
 * scroll-linked (useScroll + useTransform) animations synchronized with Lenis.
 */
export default function ScrollAnimationExample() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const cards = [
    {
      title: '01. Responsive Stem Engine',
      accent: 'tier-ice',
      border: 'border-[var(--col-ice)]/30',
      badge: 'Chill Phase',
      desc: 'Seamlessly crossfades between stems as your live playing dynamics ebb and flow, maintaining musical coherence.',
    },
    {
      title: '02. Zero-Latency DSP Tracker',
      accent: 'tier-ember',
      border: 'border-[var(--col-ember)]/30',
      badge: 'Groove Phase',
      desc: 'Web Audio API RMS & spectral energy tracking evaluates performance output every frame without audio delay.',
    },
    {
      title: '03. Peak Dynamic Intensity',
      accent: 'tier-surge',
      border: 'border-[var(--col-surge)]/30',
      badge: 'Peak Phase',
      desc: 'Unlocks dense harmonic stacks and full percussion stems when live performance reaches peak energy thresholds.',
    },
  ];

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-16 space-y-12">
      {/* Scroll-Linked Animation Header: Synced Progress Bar via useScroll() */}
      <div className="rack-module p-6 rounded-xl border border-[var(--col-edge-hi)] backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="section-label">Lenis + Motion Synchronization Test</span>
          <span className="font-data text-xs text-[var(--col-ice)] bg-[var(--col-ice)]/10 px-2.5 py-1 rounded border border-[var(--col-ice)]/20">
            useScroll() Synced
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4 font-data">
          Global Scroll Progress (driven by Lenis smooth scroll RAF):
        </p>
        <div className="w-full h-2.5 bg-slate-900/80 rounded-full overflow-hidden border border-[var(--col-edge)]">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--col-ice)] via-[var(--col-ember)] to-[var(--col-surge)] origin-left"
            style={{ scaleX }}
          />
        </div>
      </div>

      {/* Scroll-Triggered Animation: whileInView Fade & Slide-in */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{
              duration: 0.6,
              delay: index * 0.15,
              ease: [0.215, 0.61, 0.355, 1],
            }}
            className={`rack-module p-6 rounded-xl border ${card.border} flex flex-col justify-between hover:border-opacity-60 transition-all`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold uppercase tracking-wider font-data ${card.accent}`}>
                  {card.badge}
                </span>
                <span className="w-2 h-2 rounded-full bg-[var(--col-edge-hi)]" />
              </div>
              <h4 className="text-base font-bold text-slate-100 mb-2 font-display">
                {card.title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-display">
                {card.desc}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--col-edge)] text-[11px] font-data text-slate-500 flex justify-between items-center">
              <span>whileInView Trigger</span>
              <span className={card.accent}>Ready</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
