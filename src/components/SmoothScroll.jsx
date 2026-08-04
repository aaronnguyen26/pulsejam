'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP ScrollTrigger plugin globally
gsap.registerPlugin(ScrollTrigger);

/**
 * SmoothScroll component initializing Lenis and syncing scroll updates with GSAP ScrollTrigger and Motion.
 * 
 * Drives Lenis via GSAP ticker for frame-perfect sync between Lenis smooth scrolling,
 * GSAP ScrollTrigger pinning, and Motion scroll hooks.
 */
export default function SmoothScroll({ children }) {
  useEffect(() => {
    // 1. Initialize Lenis instance
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // 2. Sync Lenis scroll updates with GSAP ScrollTrigger & window listeners
    lenis.on('scroll', () => {
      ScrollTrigger.update();
      window.dispatchEvent(new Event('scroll'));
    });

    // 3. Drive Lenis via GSAP's ticker for zero-jitter pinning
    const updateRaf = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateRaf);
    gsap.ticker.lagSmoothing(0);

    // Cleanup on unmount
    return () => {
      gsap.ticker.remove(updateRaf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
