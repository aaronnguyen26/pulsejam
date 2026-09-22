'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import {
  AudioEngineStatus,
  CalibrationData,
} from '@/lib/audio/types';

import { StudioHubRefinedScreen } from '@/components/screens/StudioHubRefinedScreen';
import { MultiLaneMIDIStudioScreen } from '@/components/screens/MultiLaneMIDIStudioScreen';
import { RefinedCalibrationModal } from '@/components/RefinedCalibrationModal';
import { StudioSettingsModal } from '@/components/StudioSettingsModal';
import { ConditioningBridge } from '@/lib/audio/ConditioningBridge';

export type Stage1SubView = 'studio-hub' | 'midi-studio';

export default function StudioHomePage() {
  const engineRef = useRef<AudioEngine | null>(null);
  const bridgeRef = useRef<ConditioningBridge | null>(null);
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null);

  // App View Navigation State (Lands on Studio Hub by default)
  const [subView, setSubView] = useState<Stage1SubView>('studio-hub');
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Audio Engine Subscriptions & Telemetry
  const [_status, setStatus] = useState<AudioEngineStatus>({
    isInitialized: false,
    isMicActive: false,
    errorType: null,
    errorMessage: null,
  });

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;
    setAudioEngine(engine);

    const bridge = new ConditioningBridge({ debugMode: true });
    bridgeRef.current = bridge;
    bridge.start();
    bridge.connect();
    engine.setConditioningBridge(bridge);

    const unsubStatus = engine.subscribeStatus((st) => setStatus(st));

    // Initialize audio engine on client mount
    engine.initialize('synthetic');

    return () => {
      unsubStatus();
      bridge.stop();
      engine.destroy();
    };
  }, []);

  const handleStartSession = () => {
    setIsCalibrating(true);
  };

  const handleCalibrationComplete = (calData: CalibrationData) => {
    setIsCalibrating(false);
    if (engineRef.current) {
      engineRef.current.setCalibration(calData);
    }
    setSubView('midi-studio');
  };

  const handleCalibrationSkip = () => {
    setIsCalibrating(false);
    setSubView('midi-studio');
  };

  return (
    <div className="relative min-h-screen bg-[#121414] text-[#e3e2e2]">
      {/* Floating Mode Switcher Header: Studio Hub, MIDI Studio */}
      <header className="fixed top-3 right-6 z-50 flex items-center gap-2 bg-[#1e2020]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#4d4635]/40 shadow-lg">
        <button
          onClick={() => setSubView('studio-hub')}
          className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
            subView === 'studio-hub'
              ? 'bg-[#f2ca50] text-[#3c2f00] shadow-[0_0_10px_rgba(242,202,80,0.4)]'
              : 'text-[#d0c5af] hover:text-[#f2ca50]'
          }`}
        >
          Studio Hub
        </button>

        <button
          onClick={() => setSubView('midi-studio')}
          className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
            subView === 'midi-studio'
              ? 'bg-[#f2ca50] text-[#3c2f00] shadow-[0_0_10px_rgba(242,202,80,0.4)]'
              : 'text-[#d0c5af] hover:text-[#f2ca50]'
          }`}
        >
          MIDI Studio
        </button>
      </header>

      {/* ── Screen 1: Studio Hub Refined Screen ───────────────────── */}
      {subView === 'studio-hub' && (
        <StudioHubRefinedScreen
          audioEngine={audioEngine}
          onLaunchLiveSession={() => setSubView('midi-studio')}
          onOpenCalibration={() => setIsCalibrating(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* ── Screen 4: Multi-Lane MIDI Studio Screen ────────────────── */}
      {subView === 'midi-studio' && (
        <MultiLaneMIDIStudioScreen
          audioEngine={audioEngine}
          onOpenCalibration={() => setIsCalibrating(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNavigateBack={() => setSubView('studio-hub')}
        />
      )}

      {/* ── Screen 3: Refined Acoustic Calibration Modal ────── */}
      <RefinedCalibrationModal
        isOpen={isCalibrating}
        audioEngine={audioEngine}
        onComplete={handleCalibrationComplete}
        onSkip={handleCalibrationSkip}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* ── Screen 5: PulseJam Studio Settings & Mic Check Modal ─── */}
      <StudioSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        audioEngine={audioEngine}
      />
    </div>
  );
}
