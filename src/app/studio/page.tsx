'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import {
  AIGenerationLogEntry,
  AIGenerationMetrics,
  AppMode,
  AudioEngineStatus,
  CalibrationData,
  CloudVibeMetrics,
  DSPMetrics,
  LatencyLogEntry,
  OperatingMode,
  PerformanceTier,
  StemSourceType,
} from '@/lib/audio/types';

import { ImmersiveWelcomeHomeScreen } from '@/components/screens/ImmersiveWelcomeHomeScreen';
import { StudioHubRefinedScreen } from '@/components/screens/StudioHubRefinedScreen';
import { MultiLaneMIDIStudioScreen } from '@/components/screens/MultiLaneMIDIStudioScreen';
import { RefinedCalibrationModal } from '@/components/RefinedCalibrationModal';

import { Visualizer } from '@/components/Visualizer';
import { ControlPanel } from '@/components/ControlPanel';
import { TierGauge } from '@/components/TierGauge';
import { StatusBanner } from '@/components/StatusBanner';
import { ModeToggle } from '@/components/ModeToggle';
import { LatencyMonitor } from '@/components/LatencyMonitor';
import { AIGenerationMonitor } from '@/components/AIGenerationMonitor';
import { CloudVibeToolbar } from '@/components/CloudVibeToolbar';
import { CloudVibeSettingsModal } from '@/components/CloudVibeSettingsModal';
import { DesktopDownloadBanner } from '@/components/DesktopDownloadBanner';

export type Stage1SubView = 'welcome' | 'studio-hub' | 'midi-studio' | 'daw-console';

export default function StudioHomePage() {
  const engineRef = useRef<AudioEngine | null>(null);

  // App View Navigation State
  const [subView, setSubView] = useState<Stage1SubView>('midi-studio');
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [isCloudSettingsOpen, setIsCloudSettingsOpen] = useState(false);

  // Audio Engine Subscriptions & Telemetry
  const [status, setStatus] = useState<AudioEngineStatus>({
    isInitialized: false,
    isMicActive: false,
    errorType: null,
    errorMessage: null,
  });

  const [metrics, setMetrics] = useState<DSPMetrics | null>(null);
  const [latencyLogs, setLatencyLogs] = useState<LatencyLogEntry[]>([]);
  const [aiMetrics, setAiMetrics] = useState<AIGenerationMetrics | null>(null);
  const [aiLogs, setAiLogs] = useState<AIGenerationLogEntry[]>([]);
  const [cloudMetrics, setCloudMetrics] = useState<CloudVibeMetrics | null>(null);

  const [appMode, setAppMode] = useState<AppMode>('stems');
  const [stemSource, setStemSource] = useState<StemSourceType>('synthetic');
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('LIVE');
  const [overrideTier, setOverrideTier] = useState<PerformanceTier>('chill');

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;

    const unsubStatus = engine.subscribeStatus((st) => setStatus(st));
    const unsubMetrics = engine.subscribeMetrics((m) => setMetrics(m));
    const unsubLatency = engine.subscribeLatency(() => {
      setLatencyLogs(engine.getLatencyHistory());
    });
    const unsubAiMetrics = engine.subscribeAIGenMetrics((m) => setAiMetrics(m));
    const unsubAiLogs = engine.subscribeAIGenLogs((entry) => {
      setAiLogs((prev) => [entry, ...prev].slice(0, 10));
    });
    const unsubCloud = engine.subscribeCloudVibe((m) => setCloudMetrics(m));

    // Initialize audio engine on client mount
    engine.initialize(stemSource);

    return () => {
      unsubStatus();
      unsubMetrics();
      unsubLatency();
      unsubAiMetrics();
      unsubAiLogs();
      unsubCloud();
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

  const handleToggleMic = async () => {
    if (!engineRef.current) return;
    if (status.isMicActive) {
      engineRef.current.stopMicrophone();
    } else {
      await engineRef.current.startMicrophone();
    }
  };

  const handleSelectMode = (mode: OperatingMode, override?: PerformanceTier) => {
    setOperatingMode(mode);
    if (override) setOverrideTier(override);
    if (engineRef.current) {
      engineRef.current.setOperatingMode(mode, override);
    }
  };

  const handleChangeStemSource = async (source: StemSourceType) => {
    setStemSource(source);
    if (engineRef.current) {
      await engineRef.current.switchStemSource(source);
    }
  };

  const handleChangeAppMode = (mode: AppMode) => {
    setAppMode(mode);
    if (engineRef.current) {
      engineRef.current.setAppMode(mode);
    }
  };

  const handleToggleCloudVibe = async () => {
    if (!engineRef.current) return;
    if (cloudMetrics?.status === 'CONNECTED' || cloudMetrics?.status === 'ROTATING') {
      engineRef.current.stopCloudVibe();
    } else {
      await engineRef.current.startCloudVibe();
    }
  };

  const activeTier: PerformanceTier =
    operatingMode === 'OVERRIDE' ? overrideTier : metrics?.activeTier || 'chill';

  return (
    <div className="relative min-h-screen bg-[#121414] text-[#e3e2e2]">
      {/* Floating Mode Switcher Header */}
      <header className="fixed top-3 right-6 z-50 flex items-center gap-2 bg-[#1e2020]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#4d4635]/40 shadow-lg">
        <Link
          href="/"
          className="px-3 py-1 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider text-[#d0c5af] hover:text-[#f2ca50] border-r border-[#4d4635]/50 pr-3 flex items-center gap-1"
        >
          <span>← Website</span>
        </Link>

        <button
          onClick={() => setSubView('welcome')}
          className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
            subView === 'welcome'
              ? 'bg-[#f2ca50] text-[#3c2f00] shadow-[0_0_10px_rgba(242,202,80,0.4)]'
              : 'text-[#d0c5af] hover:text-[#f2ca50]'
          }`}
        >
          Welcome
        </button>

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

        <button
          onClick={() => setSubView('daw-console')}
          className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
            subView === 'daw-console'
              ? 'bg-[#f2ca50] text-[#3c2f00] shadow-[0_0_10px_rgba(242,202,80,0.4)]'
              : 'text-[#d0c5af] hover:text-[#f2ca50]'
          }`}
        >
          DAW Console
        </button>
      </header>

      {/* ── Screen 1: Immersive Welcome Screen ────────────────────── */}
      {subView === 'welcome' && (
        <ImmersiveWelcomeHomeScreen
          onStartSession={handleStartSession}
          onOpenStudioHub={() => setSubView('studio-hub')}
          onOpenCalibration={() => setIsCalibrating(true)}
        />
      )}

      {/* ── Screen 2: Studio Hub Refined Screen ───────────────────── */}
      {subView === 'studio-hub' && (
        <StudioHubRefinedScreen
          audioEngine={engineRef.current}
          onLaunchLiveSession={() => setSubView('midi-studio')}
          onOpenCalibration={() => setIsCalibrating(true)}
        />
      )}

      {/* ── Screen 4: Multi-Lane MIDI Studio Screen ────────────────── */}
      {subView === 'midi-studio' && (
        <MultiLaneMIDIStudioScreen
          audioEngine={engineRef.current}
          onOpenCalibration={() => setIsCalibrating(true)}
          onNavigateBack={() => setSubView('studio-hub')}
        />
      )}

      {/* ── Screen 5: Full DAW Console Studio Workspace ────────────── */}
      {subView === 'daw-console' && (
        <div className="p-4 md:p-8 space-y-6 pt-16">
          <header className="glass-panel p-4 md:p-6 rounded-2xl border border-hairline highlight-top flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-brass flex items-center justify-center text-[#3c2f00] font-bold shadow-[0_0_15px_rgba(242,202,80,0.25)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </div>
              <div>
                <h1 className="font-headline-sm text-xl md:text-2xl text-[#e5e2e1] flex items-center gap-3">
                  <span>PulseJam DAW Workspace</span>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#f2ca50]/10 text-[#f2ca50] border border-[#f2ca50]/30 font-normal">
                    STAGE 1-4
                  </span>
                </h1>
                <p className="font-label-caps text-xs text-[#d0c5af] mt-0.5">
                  Zero-Latency Multi-Tier Stem & AI Generation Console
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <ModeToggle mode={appMode} onChange={handleChangeAppMode} />
              <div className="hidden sm:block border-l border-hairline pl-4">
                <TierGauge activeTier={activeTier} metrics={metrics} />
              </div>
            </div>
          </header>

          <StatusBanner
            errorType={status.errorType}
            errorMessage={status.errorMessage}
            onDismiss={() => {
              if (engineRef.current) {
                engineRef.current['setError']?.(null, '');
              }
            }}
          />

          <DesktopDownloadBanner />

          <CloudVibeToolbar
            metrics={cloudMetrics}
            onToggle={handleToggleCloudVibe}
            onOpenSettings={() => setIsCloudSettingsOpen(true)}
            onVolumeChange={(vol) => engineRef.current?.setCloudVibeVolume(vol)}
            onStop={() => engineRef.current?.stopCloudVibe()}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <Visualizer metrics={metrics} activeTier={activeTier} />

              <ControlPanel
                isMicActive={status.isMicActive}
                mode={operatingMode}
                activeTier={overrideTier}
                stemSource={stemSource}
                onToggleMic={handleToggleMic}
                onSelectMode={handleSelectMode}
                onChangeStemSource={handleChangeStemSource}
                onOpenCalibration={() => setIsCalibrating(true)}
              />
            </div>

            <div className="lg:col-span-4 space-y-6">
              {appMode === 'ai-gen' && (
                <AIGenerationMonitor
                  metrics={aiMetrics}
                  logs={aiLogs}
                  onClear={() => {
                    setAiLogs([]);
                    engineRef.current?.clearAIGenLogs();
                  }}
                />
              )}

              <LatencyMonitor
                logs={latencyLogs}
                onClear={() => {
                  setLatencyLogs([]);
                  engineRef.current?.clearLatencyHistory();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Screen 3: Refined 2-Step Acoustic Calibration Modal ────── */}
      <RefinedCalibrationModal
        isOpen={isCalibrating}
        audioEngine={engineRef.current}
        onComplete={handleCalibrationComplete}
        onSkip={handleCalibrationSkip}
      />

      {/* Cloud Vibe Settings Modal */}
      <CloudVibeSettingsModal
        isOpen={isCloudSettingsOpen}
        onClose={() => setIsCloudSettingsOpen(false)}
        onKeySaved={() => {
          if (engineRef.current) {
            setCloudMetrics((prev) => (prev ? { ...prev, hasApiKey: true } : null));
          }
        }}
      />
    </div>
  );
}
