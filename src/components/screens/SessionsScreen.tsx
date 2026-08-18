'use client';

import React, { useState } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { JamTakeMetadata } from '@/lib/audio/types';
import { StemExporter } from '@/lib/audio/StemExporter';

interface SessionsScreenProps {
  audioEngine: AudioEngine | null;
  onLaunchStudio?: () => void;
}

interface DemoSessionTake {
  takeId: string;
  takeNumber: number;
  startTime: number;
  durationMs: number;
  chunkCount: number;
  sampleRate: number;
  channelCount: number;
  fileSizeEstimate: number;
  sessionTitle: string;
  stylePreset: string;
  detectedKey: string;
  bpm: number;
  tags: string[];
}

export const SessionsScreen: React.FC<SessionsScreenProps> = ({
  audioEngine: _audioEngine,
  onLaunchStudio,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null);

  // Initial demo + live recorded takes
  const [sessions, setSessions] = useState<DemoSessionTake[]>([
    {
      takeId: 'take-live-01',
      takeNumber: 1,
      startTime: Date.now() - 1000 * 60 * 45,
      durationMs: 142000,
      chunkCount: 3550,
      sampleRate: 48000,
      channelCount: 2,
      fileSizeEstimate: 27264000,
      sessionTitle: 'Midnight Neo-Soul Jam & Solo',
      stylePreset: 'Neo-Soul Warmth',
      detectedKey: 'A Minor',
      bpm: 92,
      tags: ['Guitar Solo', 'Retrospective Take', 'Dorian'],
    },
    {
      takeId: 'take-live-02',
      takeNumber: 2,
      startTime: Date.now() - 1000 * 60 * 180,
      durationMs: 215000,
      chunkCount: 5375,
      sampleRate: 48000,
      channelCount: 2,
      fileSizeEstimate: 41280000,
      sessionTitle: 'Lo-Fi Chill Progression in Dm',
      stylePreset: 'Lo-Fi Midnight',
      detectedKey: 'D Minor',
      bpm: 78,
      tags: ['Acoustic Fingerstyle', 'Mastering Warmth'],
    },
    {
      takeId: 'take-live-03',
      takeNumber: 3,
      startTime: Date.now() - 1000 * 60 * 60 * 24,
      durationMs: 98000,
      chunkCount: 2450,
      sampleRate: 48000,
      channelCount: 2,
      fileSizeEstimate: 18816000,
      sessionTitle: 'Indie Rock Energy Drive',
      stylePreset: 'Indie Rock Drive',
      detectedKey: 'E Minor',
      bpm: 128,
      tags: ['Drum Fills', '8-Bar Loop'],
    },
    {
      takeId: 'take-live-04',
      takeNumber: 4,
      startTime: Date.now() - 1000 * 60 * 60 * 48,
      durationMs: 180000,
      chunkCount: 4500,
      sampleRate: 48000,
      channelCount: 2,
      fileSizeEstimate: 34560000,
      sessionTitle: '80s Synthwave Sunset Improv',
      stylePreset: 'Synthwave 80s',
      detectedKey: 'F# Minor',
      bpm: 116,
      tags: ['Stereo Imager', 'Limiter -0.1dB'],
    },
  ]);

  const [selectedTake, setSelectedTake] = useState<DemoSessionTake>(sessions[0]);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.detectedKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.stylePreset.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedFilter === 'all') return matchesSearch;
    return matchesSearch && s.stylePreset.toLowerCase().includes(selectedFilter.toLowerCase());
  });

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExportWav = (take: DemoSessionTake) => {
    // Generate high-resolution 48kHz WAV take file
    const sampleRate = 48000;
    const len = Math.floor((take.durationMs / 1000) * sampleRate);
    const left = new Float32Array(Math.min(len, sampleRate * 10));
    const right = new Float32Array(Math.min(len, sampleRate * 10));

    // Synthesize gentle musical tone for exported WAV take demonstration
    for (let i = 0; i < left.length; i++) {
      const t = i / sampleRate;
      left[i] = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 0.5) * 0.25;
      right[i] = Math.sin(2 * Math.PI * 330 * t) * Math.exp(-t * 0.5) * 0.25;
    }

    const file = StemExporter.createExportFile(left, right, `${take.sessionTitle.replace(/\s+/g, '_')}_Take_${take.takeNumber}.wav`, sampleRate);
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTogglePlay = (takeId: string) => {
    if (playingTakeId === takeId) {
      setPlayingTakeId(null);
    } else {
      setPlayingTakeId(takeId);
    }
  };

  const handleDeleteTake = (takeId: string) => {
    const updated = sessions.filter((s) => s.takeId !== takeId);
    setSessions(updated);
    if (selectedTake.takeId === takeId && updated.length > 0) {
      setSelectedTake(updated[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#110e07] text-[#eae1d4] overflow-hidden select-none font-sans">
      {/* Top Header */}
      <header className="h-16 px-8 bg-[#16130b] border-b border-[#4d4635]/40 flex items-center justify-between shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-[#231f17] border border-[#f2ca50]/40 flex items-center justify-center text-[#f2ca50] shadow-[0_0_12px_rgba(242,202,80,0.2)] font-mono font-bold text-sm">
            💾
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold tracking-widest text-[#f2ca50] uppercase">
              SESSIONS & TAKE ARCHIVE
            </h1>
            <p className="font-mono text-[10px] text-[#d0c5af]/60 tracking-tight">
              LOCAL OPFS TAKE STORAGE • {sessions.length} TAKES SAVED
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search takes, keys, styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1f1b13] border border-[#4d4635]/50 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono text-[#eae1d4] placeholder-[#d0c5af]/40 focus:outline-none focus:border-[#f2ca50]/70 w-64 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#d0c5af]/50">🔍</span>
          </div>

          {onLaunchStudio && (
            <button
              onClick={onLaunchStudio}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-[#241a00] font-mono text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-[0_0_12px_rgba(242,202,80,0.3)] flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ NEW SESSION</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content: Takes List (Left) + Selected Take Inspector (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Session Cards List */}
        <div className="w-1/2 border-r border-[#4d4635]/40 flex flex-col bg-[#16130b] overflow-hidden">
          {/* Style Filters */}
          <div className="p-4 border-b border-[#4d4635]/30 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[10px] font-mono text-[#d0c5af]/60 font-bold uppercase mr-1">FILTER:</span>
            {['all', 'Neo-Soul', 'Lo-Fi', 'Rock', 'Synthwave'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition cursor-pointer border ${
                  selectedFilter === filter
                    ? 'bg-[#231f17] text-[#f2ca50] border-[#f2ca50]/50 shadow-[0_0_8px_rgba(242,202,80,0.2)]'
                    : 'bg-[#1f1b13] text-[#d0c5af]/60 border-[#4d4635]/40 hover:text-white'
                }`}
              >
                {filter.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Takes Scroll List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredSessions.map((take) => {
              const isSelected = selectedTake?.takeId === take.takeId;
              const isPlaying = playingTakeId === take.takeId;
              return (
                <div
                  key={take.takeId}
                  onClick={() => setSelectedTake(take)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer shadow-md relative ${
                    isSelected
                      ? 'bg-[#231f17] border-[#f2ca50]/60 shadow-[0_0_16px_rgba(242,202,80,0.15)]'
                      : 'bg-[#1f1b13] border-[#4d4635]/40 hover:border-[#4d4635] hover:bg-[#28241b]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                        TAKE {take.takeNumber}
                      </span>
                      <h3 className="font-mono text-xs font-bold text-[#eae1d4]">{take.sessionTitle}</h3>
                    </div>
                    <span className="text-[10px] font-mono text-[#d0c5af]/50">{formatDate(take.startTime)}</span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-3 font-mono text-[10px] text-[#d0c5af]/70 mb-3">
                    <span className="text-amber-300 font-bold">⏱ {formatDuration(take.durationMs)}</span>
                    <span>•</span>
                    <span className="text-[#7bd0ff] font-bold">KEY: {take.detectedKey}</span>
                    <span>•</span>
                    <span className="text-[#a2ffaf] font-bold">{take.bpm} BPM</span>
                    <span>•</span>
                    <span className="text-[#d0c5af]/60">{take.stylePreset}</span>
                  </div>

                  {/* Waveform Visualizer Thumbnail */}
                  <div className="h-10 bg-black/50 rounded-lg border border-[#4d4635]/30 p-1 flex items-center gap-0.5 overflow-hidden mb-3">
                    {Array.from({ length: 48 }).map((_, idx) => {
                      const height = 20 + Math.sin((idx / 48) * Math.PI * 4 + take.takeNumber) * 40 + (idx % 3) * 15;
                      return (
                        <div
                          key={`thumb-bar-${idx}`}
                          style={{ height: `${Math.max(10, Math.min(95, height))}%` }}
                          className={`flex-1 rounded-full transition-all ${
                            isPlaying ? 'bg-[#f2ca50] shadow-[0_0_4px_rgba(242,202,80,0.6)]' : 'bg-[#d0c5af]/40'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#4d4635]/20">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePlay(take.takeId);
                        }}
                        className={`px-3 py-1 rounded-md text-[10px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isPlaying
                            ? 'bg-[#f2ca50] text-[#241a00]'
                            : 'bg-[#2d2a21] text-[#eae1d4] hover:bg-[#3d392f]'
                        }`}
                      >
                        <span>{isPlaying ? '⏸ PAUSE' : '▶ PLAY PREVIEW'}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportWav(take);
                        }}
                        className="px-2.5 py-1 rounded-md text-[10px] font-mono text-[#f2ca50] bg-[#231f17] hover:bg-[#2d2a21] border border-[#f2ca50]/30 transition flex items-center gap-1 cursor-pointer"
                        title="Export 16-bit 48kHz WAV audio take"
                      >
                        <span>💾 EXPORT .WAV</span>
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTake(take.takeId);
                      }}
                      className="text-[#d0c5af]/40 hover:text-red-400 p-1 text-xs transition cursor-pointer"
                      title="Delete Take from Archive"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Take Detailed Inspector & Stem Slices */}
        <div className="w-1/2 flex flex-col bg-[#110e07] overflow-y-auto p-6 space-y-6">
          {/* Header Card */}
          <div className="bg-[#1f1b13] border border-[#4d4635]/40 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                ACTIVE INSPECTOR
              </span>
              <span className="text-xs font-mono text-[#f2ca50] font-bold">TAKE #{selectedTake.takeNumber}</span>
            </div>
            <h2 className="font-mono text-lg font-bold text-[#ffe9b0]">{selectedTake.sessionTitle}</h2>
            <p className="font-mono text-xs text-[#d0c5af]/70 mt-1">
              Captured via OPFS Circular Rolling Take Buffer • Recorded at 48,000 Hz Stereo
            </p>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#4d4635]/30 text-center font-mono">
              <div className="bg-[#16130b] p-2 rounded-lg border border-[#4d4635]/30">
                <span className="text-[9px] text-[#d0c5af]/50 block">KEY CENTER</span>
                <span className="text-sm font-bold text-[#7bd0ff]">{selectedTake.detectedKey}</span>
              </div>
              <div className="bg-[#16130b] p-2 rounded-lg border border-[#4d4635]/30">
                <span className="text-[9px] text-[#d0c5af]/50 block">TEMPO</span>
                <span className="text-sm font-bold text-[#f2ca50]">{selectedTake.bpm} BPM</span>
              </div>
              <div className="bg-[#16130b] p-2 rounded-lg border border-[#4d4635]/30">
                <span className="text-[9px] text-[#d0c5af]/50 block">DURATION</span>
                <span className="text-sm font-bold text-[#a2ffaf]">{formatDuration(selectedTake.durationMs)}</span>
              </div>
              <div className="bg-[#16130b] p-2 rounded-lg border border-[#4d4635]/30">
                <span className="text-[9px] text-[#d0c5af]/50 block">CHUNKS</span>
                <span className="text-sm font-bold text-[#d0c5af]">{selectedTake.chunkCount}</span>
              </div>
            </div>
          </div>

          {/* Stems Multi-Track Breakdown */}
          <div className="bg-[#1f1b13] border border-[#4d4635]/40 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold text-[#f2ca50] uppercase flex items-center gap-1.5">
                <span>🎚️</span> STEM TRACK SEPARATION
              </h3>
              <button
                onClick={() => handleExportWav(selectedTake)}
                className="text-[10px] font-mono text-amber-300 hover:underline cursor-pointer"
              >
                DOWNLOAD ALL STEMS (.ZIP) ↗
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { name: 'Live Acoustic Instrument', icon: '🎤', color: '#f2ca50', format: '16-bit 48kHz Stereo' },
                { name: 'Neural AI Accompaniment (MRT2)', icon: '🧠', color: '#7bd0ff', format: '16-bit 48kHz Stereo' },
                { name: 'Sub Bass Foundation Stem', icon: '🎸', color: '#a2ffaf', format: '16-bit 48kHz Mono' },
                { name: 'Dynamic Drum Bus & Transitions', icon: '🥁', color: '#ffb4ab', format: '16-bit 48kHz Stereo' },
              ].map((stem, sIdx) => (
                <div
                  key={`stem-${sIdx}`}
                  className="bg-[#16130b] border border-[#4d4635]/30 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{stem.icon}</span>
                    <div>
                      <h4 className="font-mono text-xs font-bold text-[#eae1d4]">{stem.name}</h4>
                      <p className="font-mono text-[9px] text-[#d0c5af]/50">{stem.format}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExportWav(selectedTake)}
                    className="px-2 py-1 rounded bg-[#231f17] hover:bg-[#2d2a21] text-xs font-mono text-[#d0c5af] hover:text-[#f2ca50] border border-[#4d4635]/40 transition cursor-pointer"
                  >
                    ⬇ STEM
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
