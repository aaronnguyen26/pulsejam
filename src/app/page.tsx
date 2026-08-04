'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import {
  AIGenerationLogEntry,
  AIGenerationMetrics,
  AppMode as LibAppMode,
  AudioEngineStatus,
  CalibrationData,
  CloudVibeMetrics,
  DSPMetrics,
  LatencyLogEntry,
  OperatingMode,
  PerformanceTier,
  StemSourceType,
} from '@/lib/audio/types';

import { Visualizer }             from '@/components/Visualizer';
import { ControlPanel }           from '@/components/ControlPanel';
import { LatencyMonitor }         from '@/components/LatencyMonitor';
import { AIGenerationMonitor }    from '@/components/AIGenerationMonitor';
import { CloudVibeToolbar }       from '@/components/CloudVibeToolbar';
import { CloudVibeSettingsModal } from '@/components/CloudVibeSettingsModal';
import { DesktopDownloadBanner }  from '@/components/DesktopDownloadBanner';
import { CalibrationWizard }      from '@/components/CalibrationWizard';
import { StatusBanner }           from '@/components/StatusBanner';
import { TierGauge }              from '@/components/TierGauge';
import { ModeToggle, AppMode }    from '@/components/ModeToggle';
import ScrollAnimationExample     from '@/components/ScrollAnimationExample';

// Screen Components built from Stitch MCP & DESIGN.md
import { RefinedBrandExperienceScreen } from '@/components/screens/RefinedBrandExperienceScreen';
import { StudioHubScreen }              from '@/components/screens/StudioHubScreen';
import { PerformanceStemsScreen }       from '@/components/screens/PerformanceStemsScreen';
import { PerformanceAIScreen }          from '@/components/screens/PerformanceAIScreen';
import { InputCalibrationScreen }       from '@/components/screens/InputCalibrationScreen';
import { LibraryScreen }                from '@/components/screens/LibraryScreen';

type ScreenView =
  | 'brand'
  | 'studio_hub'
  | 'performance_stems'
  | 'performance_ai'
  | 'calibration'
  | 'library'
  | 'live_app';

export default function PulseJamApp() {
  const [activeScreen, setActiveScreen] = useState<ScreenView>('brand');

  const audioEngineRef = useRef<AudioEngine | null>(null);

  const [metrics,          setMetrics]          = useState<DSPMetrics | null>(null);
  const [latencyLogs,      setLatencyLogs]      = useState<LatencyLogEntry[]>([]);
  const [aiGenMetrics,     setAiGenMetrics]     = useState<AIGenerationMetrics | null>(null);
  const [aiGenLogs,        setAiGenLogs]        = useState<AIGenerationLogEntry[]>([]);
  const [cloudVibeMetrics, setCloudVibeMetrics] = useState<CloudVibeMetrics | null>(null);

  const [engineStatus, setEngineStatus] = useState<AudioEngineStatus>({
    isInitialized: false,
    isMicActive:   false,
    errorType:     null,
    errorMessage:  null,
  });

  const [operatingMode,  setOperatingMode]  = useState<OperatingMode>('LIVE');
  const [stemSource,     setStemSource]     = useState<StemSourceType>('synthetic');
  const [isCalibrating,  setIsCalibrating]  = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appMode,        setAppMode]        = useState<AppMode>('stems');

  useEffect(() => {
    const engine = new AudioEngine();
    audioEngineRef.current = engine;

    engine.subscribeMetrics((m) => setMetrics(m));
    engine.subscribeLatency((entry) =>
      setLatencyLogs((prev) => [entry, ...prev].slice(0, 20))
    );
    engine.subscribeStatus((st) => setEngineStatus(st));

    engine.subscribeAIGenMetrics((m) => setAiGenMetrics(m));
    engine.subscribeAIGenLogs((entry) =>
      setAiGenLogs((prev) => [entry, ...prev].slice(0, 10))
    );

    engine.subscribeCloudVibe((m) => setCloudVibeMetrics(m));

    engine.initialize(stemSource);

    return () => {
      engine.destroy();
      audioEngineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleMic = async () => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    if (engineStatus.isMicActive) {
      engine.stopMicrophone();
    } else {
      const success = await engine.startMicrophone();
      if (success && !metrics) setIsCalibrating(true);
    }
  };

  const handleSelectMode = (mode: OperatingMode, overrideTier?: PerformanceTier) => {
    setOperatingMode(mode);
    audioEngineRef.current?.setOperatingMode(mode, overrideTier);
  };

  const handleChangeStemSource = async (source: StemSourceType) => {
    setStemSource(source);
    await audioEngineRef.current?.switchStemSource(source);
  };

  const handleCalibrationComplete = (calibration: CalibrationData) => {
    setIsCalibrating(false);
    // Apply calibration thresholds if supported by engine
  };

  return (
    <main className="min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col font-body-md">
      {/* Stitch Design System Screen Switcher Toolbar */}
      <div className="sticky top-0 z-50 bg-[#0e0e0e]/90 backdrop-blur-xl border-b border-hairline py-2.5 px-4">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-sm text-[#f2ca50] font-bold">Stitch Screens:</span>
            <div className="flex items-center gap-1.5 bg-[#201f1f] p-1 rounded-full border border-hairline">
              {[
                { id: 'brand', label: 'Refined Brand Experience' },
                { id: 'studio_hub', label: 'Studio Hub' },
                { id: 'performance_stems', label: 'Stems Performance' },
                { id: 'performance_ai', label: 'AI Performance' },
                { id: 'calibration', label: 'Calibration' },
                { id: 'library', label: 'Library' },
                { id: 'live_app', label: 'Live Audio Workspace' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveScreen(s.id as ScreenView)}
                  className={`px-3 py-1 rounded-full font-label-caps text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                    activeScreen === s.id
                      ? 'bg-gradient-brass text-[#3c2f00] font-bold shadow-[0_0_12px_rgba(242,202,80,0.3)]'
                      : 'text-[#d0c5af] hover:text-[#e5e2e1] hover:bg-white/5'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Screen Render Switcher */}
      {activeScreen === 'brand' && <RefinedBrandExperienceScreen />}
      {activeScreen === 'studio_hub' && <StudioHubScreen />}
      {activeScreen === 'performance_stems' && <PerformanceStemsScreen />}
      {activeScreen === 'performance_ai' && <PerformanceAIScreen />}
      {activeScreen === 'calibration' && <InputCalibrationScreen />}
      {activeScreen === 'library' && <LibraryScreen />}

      {/* Live Audio App Screen */}
      {activeScreen === 'live_app' && (
        <div className="flex-1 flex flex-col gap-5 p-4 max-w-[1400px] w-full mx-auto">
          <StatusBanner
            errorType={engineStatus.errorType}
            errorMessage={engineStatus.errorMessage}
            onDismiss={() => setEngineStatus((s) => ({ ...s, errorType: null, errorMessage: null }))}
          />

          <DesktopDownloadBanner />

          <CloudVibeToolbar
            metrics={cloudVibeMetrics}
            onToggle={() => {}}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onVolumeChange={() => {}}
            onStop={() => {}}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 flex flex-col gap-5">
              <Visualizer metrics={metrics} activeTier={metrics?.activeTier ?? 'chill'} />

              <ControlPanel
                isMicActive={engineStatus.isMicActive}
                mode={operatingMode}
                activeTier={metrics?.activeTier ?? 'chill'}
                stemSource={stemSource}
                onToggleMic={handleToggleMic}
                onSelectMode={handleSelectMode}
                onChangeStemSource={handleChangeStemSource}
                onOpenCalibration={() => setIsCalibrating(true)}
              />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-5">
              <TierGauge activeTier={metrics?.activeTier ?? 'chill'} metrics={metrics} />

              <ModeToggle mode={appMode} onChange={setAppMode} />
            </div>
          </div>

          <div className="mt-2">
            {appMode === 'stems' ? (
              <LatencyMonitor
                logs={latencyLogs}
                onClear={() => {
                  setLatencyLogs([]);
                  audioEngineRef.current?.clearLatencyHistory();
                }}
              />
            ) : (
              <AIGenerationMonitor
                metrics={aiGenMetrics}
                logs={aiGenLogs}
                onClear={() => {
                  setAiGenLogs([]);
                  audioEngineRef.current?.clearAIGenLogs();
                }}
              />
            )}
          </div>

          <ScrollAnimationExample />
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 px-6 text-center border-t border-hairline bg-[#0e0e0e]/80">
        <span className="text-xs text-[#d0c5af] font-mono">
          PulseJam AI — Stitch Design System (`PulseJam: Refined Brand Experience`) · Next.js · Tailwind CSS
        </span>
      </footer>

      {/* Modals & Overlays */}
      {isCalibrating && (
        <CalibrationWizard
          currentMetrics={metrics}
          onComplete={handleCalibrationComplete}
          onCancel={() => setIsCalibrating(false)}
        />
      )}

      <CloudVibeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onKeySaved={() => {
          if (cloudVibeMetrics) {
            setCloudVibeMetrics({ ...cloudVibeMetrics, hasApiKey: true });
          }
        }}
      />
    </main>
  );
}
