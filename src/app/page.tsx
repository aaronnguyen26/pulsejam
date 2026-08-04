'use client';

import React, { useState, useEffect, useRef } from 'react';
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

import { Visualizer }             from '@/components/Visualizer';
import { ControlPanel }           from '@/components/ControlPanel';
import { LatencyMonitor }         from '@/components/LatencyMonitor';
import { AIGenerationMonitor }    from '@/components/AIGenerationMonitor';
import { CloudVibeToolbar }       from '@/components/CloudVibeToolbar';
import { CloudVibeSettingsModal } from '@/components/CloudVibeSettingsModal';
import { CalibrationWizard }      from '@/components/CalibrationWizard';
import { StatusBanner }           from '@/components/StatusBanner';
import { TierGauge }              from '@/components/TierGauge';
import { ModeToggle }             from '@/components/ModeToggle';

export default function PulseJamApp() {
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
    audioEngineRef.current?.setCalibration(calibration);
    setIsCalibrating(false);
  };

  const handleAppModeChange = (mode: AppMode) => {
    setAppMode(mode);
    audioEngineRef.current?.setAppMode(mode);
  };

  const handleToggleCloudVibe = async () => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    if (cloudVibeMetrics?.status === 'CONNECTED' || cloudVibeMetrics?.status === 'CONNECTING') {
      engine.stopCloudVibe();
    } else {
      await engine.startCloudVibe();
    }
  };

  const handleStopCloudVibe = () => {
    audioEngineRef.current?.stopCloudVibe();
  };

  const handleCloudVibeVolumeChange = (vol: number) => {
    audioEngineRef.current?.setCloudVibeVolume(vol);
  };

  const activeTier: PerformanceTier = metrics?.activeTier ?? 'chill';

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--col-void)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b"
        style={{
          background: 'rgba(8,11,18,0.92)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <div className="mx-auto max-w-5xl px-5 py-3.5 flex items-center gap-4 justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="flex flex-col gap-[3px] justify-center h-9 w-9 items-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
              aria-hidden="true"
            >
              <div className="h-[3px] w-4 rounded-full" style={{ background: 'var(--col-ice)' }} />
              <div className="h-[3px] w-5 rounded-full" style={{ background: 'var(--col-ember)' }} />
              <div className="h-[3px] w-6 rounded-full" style={{ background: 'var(--col-surge)' }} />
            </div>
            <span
              className="text-base font-bold tracking-tight text-white hidden sm:block"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              PulseJam AI
            </span>
          </div>

          {/* Mode toggle — center header */}
          <ModeToggle mode={appMode} onChange={handleAppModeChange} />

          {/* Right side status indicators */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {engineStatus.isMicActive && (
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full animate-pulse led-live"
                  style={{ background: 'var(--col-ok)' }}
                  aria-hidden="true"
                />
                <span className="text-xs text-slate-400 hidden md:block" style={{ fontFamily: 'var(--font-data)' }}>
                  LIVE MIC
                </span>
              </div>
            )}

            {appMode === 'stems' ? (
              <TierGauge activeTier={activeTier} metrics={metrics} />
            ) : (
              <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-500/30 rounded-lg px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-amber-300">AI GEN MODE</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl w-full flex-1 px-5 py-5 space-y-4">

        {/* Status Error Banner */}
        <StatusBanner
          errorType={engineStatus.errorType}
          errorMessage={engineStatus.errorMessage}
          onDismiss={() => {}}
        />

        {/* Stage 3 Cloud Vibe Toolbar */}
        <CloudVibeToolbar
          metrics={cloudVibeMetrics}
          onToggle={handleToggleCloudVibe}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onVolumeChange={handleCloudVibeVolumeChange}
          onStop={handleStopCloudVibe}
        />

        {/* Visualizer */}
        <Visualizer metrics={metrics} activeTier={activeTier} />

        {/* Controls */}
        <ControlPanel
          isMicActive={engineStatus.isMicActive}
          mode={operatingMode}
          activeTier={activeTier}
          stemSource={stemSource}
          onToggleMic={handleToggleMic}
          onSelectMode={handleSelectMode}
          onChangeStemSource={handleChangeStemSource}
          onOpenCalibration={() => setIsCalibrating(true)}
        />

        {/* Mode Specific Telemetry & Latency Monitors */}
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

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer
        className="py-3 px-5 text-center border-t"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background:  'rgba(4,6,10,0.7)',
        }}
      >
        <span
          className="text-xs text-slate-600"
          style={{ fontFamily: 'var(--font-data)' }}
        >
          PulseJam AI — Stems · Local AI MIDI (Magenta.js) · Cloud Vibe (Google Lyria RealTime BYOK)
        </span>
      </footer>

      {/* ── Modals & Overlays ───────────────────────────────────────── */}
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
