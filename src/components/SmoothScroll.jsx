'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * SmoothScroll component initializing Lenis and syncing scroll updates with Motion.
 * 
 * Drives Lenis via requestAnimationFrame and triggers window scroll events on
 * Lenis scroll ticks so Motion's useScroll(), useTransform(), and whileInView
 * animations stay frame-perfect with Lenis's smoothed scroll position.
 */
export default function SmoothScroll({ children }) {
  useEffect(() => {
    // 1. Initialize Lenis instance
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // 4 & 5. Sync Lenis scroll updates with Motion listeners (useScroll, whileInView, useTransform)
    lenis.on('scroll', () => {
      window.dispatchEvent(new Event('scroll'));
    });

    // 1. Drive Lenis via requestAnimationFrame
    let animationFrameId;

    function raf(time) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    animationFrameId = requestAnimationFrame(raf);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
