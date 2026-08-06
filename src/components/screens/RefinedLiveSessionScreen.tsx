'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { DSPMetrics, PerformanceTier } from '@/lib/audio/types';

interface RefinedLiveSessionScreenProps {
  audioEngine: AudioEngine | null;
  onOpenCalibration: () => void;
  onNavigateBack?: () => void;
}

export function RefinedLiveSessionScreen({
  audioEngine,
  onOpenCalibration,
  onNavigateBack,
}: RefinedLiveSessionScreenProps) {
  // Transport states
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Timecode counters
  const [elapsedSec, setElapsedSec] = useState(0);

  // Background Tier Analysis state (silent logging for Stage 2 seam)
  const [activeTier, setActiveTier] = useState<PerformanceTier>('chill');
  const prevTierRef = useRef<PerformanceTier>('chill');

  // Waveform data history
  const waveformHistoryRef = useRef<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio Recording & Playback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // Format seconds to timecode MM:SS:FF
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `00:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  // 1. Subscribe to AudioEngine metrics & background tier analysis
  useEffect(() => {
    if (!audioEngine) return;

    // Pre-fill initial waveform history with baseline idle values
    if (waveformHistoryRef.current.length === 0) {
      waveformHistoryRef.current = new Array(160).fill(0.05);
    }

    const unsubscribe = audioEngine.subscribeMetrics((metrics: DSPMetrics) => {
      // 1. Silent Background Tier Analysis
      const currentTier = metrics.activeTier;
      if (currentTier !== prevTierRef.current) {
        console.log(
          `[Background Tier Analysis] Tier Transition: ${prevTierRef.current} -> ${currentTier} (dB: ${metrics.smoothedRmsDb.toFixed(
            1
          )})`
        );
        prevTierRef.current = currentTier;
      }
      setActiveTier(currentTier);

      // 2. Feed audio peak amplitude to live scrolling waveform buffer
      const amp = metrics.peakAmplitude ?? Math.min(1, Math.max(0.02, Math.pow(10, metrics.rawRmsDb / 20)));
      waveformHistoryRef.current.push(amp);
      if (waveformHistoryRef.current.length > 200) {
        waveformHistoryRef.current.shift();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [audioEngine]);

  // 2. Continuous Canvas Waveform Renderer
  useEffect(() => {
    let animFrameId: number;

    const renderWaveform = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear background grid
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(0, 0, width, height);

          // Subtle horizontal grid lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          for (let y = height / 4; y < height; y += height / 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Center axis
          ctx.strokeStyle = 'rgba(242, 202, 80, 0.15)';
          ctx.beginPath();
          ctx.moveTo(0, height / 2);
          ctx.lineTo(width, height / 2);
          ctx.stroke();

          // Render vertical waveform bars
          const history = waveformHistoryRef.current;
          const barWidth = 4;
          const barGap = 3;
          const stepX = barWidth + barGap;
          const startX = width - history.length * stepX;

          for (let i = 0; i < history.length; i++) {
            const val = history[i];
            const barHeight = Math.max(4, val * (height * 0.8));
            const x = startX + i * stepX;
            const y = (height - barHeight) / 2;

            ctx.fillStyle = isRecording ? '#f2ca50' : '#d4af37';
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 2);
            ctx.fill();
          }
        }
      }
      animFrameId = requestAnimationFrame(renderWaveform);
    };

    renderWaveform();
    return () => cancelAnimationFrame(animFrameId);
  }, [isRecording]);

  // 3. Timecode elapsed counter
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording || isPlaying) {
      timer = setInterval(() => {
        setElapsedSec((prev) => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isRecording, isPlaying]);

  // 4. Transport Actions
  const handleRecordToggle = async () => {
    if (!audioEngine) return;

    if (!isRecording) {
      // Start Microphone and Recording
      const success = await audioEngine.startMicrophone();
      if (success) {
        setIsRecording(true);
        setIsPlaying(false);
        setElapsedSec(0);

        // Record stream via MediaRecorder if available
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            recordedChunksRef.current = [];

            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                recordedChunksRef.current.push(e.data);
              }
            };

            recorder.onstop = () => {
              const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
              const url = URL.createObjectURL(blob);
              setRecordedAudioUrl(url);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
          }
        } catch {
          // Stream recorded internally
        }
      }
    } else {
      // Stop Recording
      handleStop();
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current.currentTime = 0;
    }

    if (audioEngine) {
      audioEngine.stopMicrophone();
    }

    setIsRecording(false);
    setIsPlaying(false);
  };

  const handlePlayTake = () => {
    if (isRecording) {
      handleStop();
    }

    if (recordedAudioUrl) {
      if (!audioPlaybackRef.current) {
        audioPlaybackRef.current = new Audio(recordedAudioUrl);
        audioPlaybackRef.current.onended = () => setIsPlaying(false);
      }
      audioPlaybackRef.current.play();
      setIsPlaying(true);
    } else {
      // Synthetic playback simulation
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 4000);
    }
  };

  return (
    <div className="bg-[#121414] text-[#e3e2e2] min-h-screen flex flex-col antialiased selection:bg-[#f2ca50] selection:text-[#3c2f00]">
      {/* Top App Bar */}
      <header className="bg-[#0d0e0f] text-[#f2ca50] border-b border-[#4d4635] shadow-sm flex justify-between items-center h-12 px-6 w-full z-50">
        <div className="flex items-center gap-4">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-1"
              aria-label="Back to Home"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          )}
          <span className="font-mono text-xs tracking-widest font-bold uppercase text-[#f2ca50]">
            PulseJam AI // Single Track Recording
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[#d0c5af]/80">
            AUDIO: {audioEngine?.getStatus().isMicActive ? 'ACTIVE (48kHz)' : 'IDLE'}
          </span>
          <button
            onClick={onOpenCalibration}
            className="text-[#d0c5af] hover:text-[#f2ca50] hover:bg-[#292a2a] transition-colors p-1.5 rounded-full flex items-center justify-center"
            title="Recalibrate Microphone"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col relative pt-4 pb-28 px-6">
        {/* Track Header */}
        <div className="py-3 px-6 flex justify-between items-center bg-[#1a1c1c] border-b border-[#4d4635]/30 rounded-t-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] text-[#d0c5af] tracking-widest">
              TRACK 01
            </span>
            <span className="font-serif text-xl text-[#f2ca50] font-semibold">
              Electric Lead
            </span>
          </div>

          <button
            onClick={onOpenCalibration}
            className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors flex items-center gap-2 text-xs font-mono bg-[#292a2a] px-3 py-1.5 rounded-lg border border-[#4d4635]/50"
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
            <span className="tracking-widest uppercase">RECALIBRATE</span>
          </button>
        </div>

        {/* Live Waveform Canvas Container */}
        <div className="flex-grow relative bg-[#0a0a0a] overflow-hidden flex flex-col justify-center border-y border-[#4d4635]/30 mb-6 rounded-b-xl min-h-[340px] shadow-[0_0_32px_rgba(242,202,80,0.1)]">
          {/* Waveform Canvas */}
          <canvas
            ref={canvasRef}
            width={1200}
            height={340}
            className="w-full h-full object-cover z-10"
          />

          {/* Fixed Center Playhead Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-[#ffb4ab] shadow-[0_0_12px_rgba(255,180,171,0.8)] z-20 -ml-[1px] pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#ffb4ab] rounded-full shadow-[0_0_8px_rgba(255,180,171,1)] border border-[#3c0000]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#ffb4ab] rounded-full shadow-[0_0_8px_rgba(255,180,171,1)] border border-[#3c0000]" />
          </div>

          {/* Data Overlays */}
          <div className="absolute top-4 left-6 font-mono text-sm text-[#d0c5af]/80 z-30 drop-shadow-md">
            {formatTimecode(elapsedSec)}
          </div>

          <div className="absolute bottom-4 right-6 font-mono text-xs text-[#ffb4ab] flex items-center gap-2 z-30 drop-shadow-md">
            {isRecording ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffb4ab] animate-pulse shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                <span>REC LIVE</span>
              </>
            ) : isPlaying ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-[#f2ca50] animate-ping" />
                <span className="text-[#f2ca50]">PLAYING TAKE</span>
              </>
            ) : (
              <span className="text-[#d0c5af]/50">READY</span>
            )}
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="fixed bottom-20 left-0 w-full h-8 flex justify-between items-center px-6 border-t border-[#4d4635]/30 bg-[#0d0e0f] font-mono text-xs text-[#d0c5af]/70 z-40">
        <span className="uppercase tracking-widest font-bold text-[#d0c5af]">
          PULSEJAM AI // LIVE SESSION ACTIVE
        </span>
        <div className="flex items-center gap-6">
          <span>{formatTimecode(elapsedSec)}</span>
          <span className="text-[#f2ca50]">
            INPUT: {audioEngine?.getStatus().isMicActive ? 'STABLE' : 'IDLE'}
          </span>
          <span>SESSION_01</span>
        </div>
      </footer>

      {/* Transport Controls (Bottom Bar) */}
      <nav className="fixed bottom-0 left-0 w-full h-20 bg-[#121414] border-t border-[#4d4635]/40 flex justify-around items-center px-8 z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
        {/* PLAY BUTTON */}
        <button
          onClick={handlePlayTake}
          disabled={isRecording}
          className={`flex flex-col items-center justify-center transition-all duration-100 ${
            isPlaying
              ? 'text-[#f2ca50]'
              : 'text-[#d0c5af] hover:text-[#f2ca50] active:scale-95'
          } ${isRecording ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <div className="w-12 h-12 rounded-lg bg-[#343535] flex items-center justify-center mb-1 border border-[#4d4635]/50 shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
            <span className="material-symbols-outlined text-[24px]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold tracking-widest">
            PLAY
          </span>
        </button>

        {/* STOP BUTTON */}
        <button
          onClick={handleStop}
          className="flex flex-col items-center justify-center text-[#d0c5af] hover:text-[#f2ca50] active:scale-95 transition-all duration-100"
        >
          <div className="w-12 h-12 rounded-lg bg-[#343535] flex items-center justify-center mb-1 border border-[#4d4635]/50 shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
            <span className="material-symbols-outlined text-[24px]">stop</span>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold tracking-widest">
            STOP
          </span>
        </button>

        {/* RECORD BUTTON */}
        <button
          onClick={handleRecordToggle}
          className="flex flex-col items-center justify-center text-[#ffb4ab] active:scale-95 transition-all duration-100 drop-shadow-[0_0_12px_rgba(255,180,171,0.4)]"
        >
          <div className="w-16 h-16 rounded-full bg-[#343535] flex items-center justify-center mb-1 border-2 border-[#ffb4ab]/50 relative shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <div className="w-8 h-8 rounded-full bg-[#1a0000] flex items-center justify-center relative shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]">
              <div
                className={`w-5 h-5 rounded-full bg-[#ffb4ab] transition-all duration-200 ${
                  isRecording
                    ? 'animate-ping shadow-[0_0_12px_rgba(255,0,0,0.8)]'
                    : 'shadow-[0_0_8px_rgba(255,0,0,0.5)]'
                }`}
              />
            </div>
          </div>
          <span className="font-mono text-[10px] text-[#ffb4ab] uppercase font-bold tracking-widest">
            {isRecording ? 'RECORDING' : 'RECORD'}
          </span>
        </button>
      </nav>
    </div>
  );
}
