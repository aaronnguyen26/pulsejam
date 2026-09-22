'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefinedBrandExperienceScreen } from '@/components/screens/RefinedBrandExperienceScreen';

/**
 * Website UI Landing Page: PulseJam AI — Refined Brand Experience
 * Served at http://localhost:3000/ (Website UI).
 * In Tauri desktop app, automatically redirects to /studio.
 */
export default function WebsiteHomePage() {
  const router = useRouter();

  useEffect(() => {
    // If running inside Tauri desktop app, route directly to the studio console
    if (
      typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
    ) {
      router.replace('/studio');
    }
  }, [router]);

  return <RefinedBrandExperienceScreen />;
}
