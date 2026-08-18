'use client';

import React, { useState } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';

interface AssetsLibraryScreenProps {
  audioEngine: AudioEngine | null;
  onLaunchStudio?: () => void;
}

interface AudioAssetItem {
  id: string;
  name: string;
  category: 'neural-model' | 'ir-reverb' | 'stem-pack' | 'preset';
  sizeMb: number;
  format: string;
  description: string;
  isActive: boolean;
  accentColor: string;
  icon: string;
}

export const AssetsLibraryScreen: React.FC<AssetsLibraryScreenProps> = ({
  audioEngine: _audioEngine,
  onLaunchStudio,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);

  const [assets, setAssets] = useState<AudioAssetItem[]>([
    {
      id: 'asset-mrt2-small',
      name: 'Magenta RealTime 2 (Small-MLX)',
      category: 'neural-model',
      sizeMb: 420,
      format: 'Apple Silicon MLX Weights',
      description: 'Ultra-low latency transformer model optimized for Apple Silicon Neural Engine & GPU (14ms inference).',
      isActive: true,
      accentColor: '#38bdf8',
      icon: '🧠',
    },
    {
      id: 'asset-ir-studio',
      name: 'Abbey Road Inspired Studio Room',
      category: 'ir-reverb',
      sizeMb: 12,
      format: '48kHz 24-bit True Stereo WAV IR',
      description: 'Rich, natural acoustic reflections with warm analog high-frequency roll-off (0.9s decay).',
      isActive: true,
      accentColor: '#f2ca50',
      icon: '🏛️',
    },
    {
      id: 'asset-ir-plate',
      name: 'Vintage EMT 140 Tube Plate',
      category: 'ir-reverb',
      sizeMb: 18,
      format: '48kHz 24-bit True Stereo WAV IR',
      description: 'Lush vintage mechanical plate reverberation with subtle tube harmonic saturation.',
      isActive: false,
      accentColor: '#f2ca50',
      icon: '🎛️',
    },
    {
      id: 'asset-ir-ambient',
      name: 'Celestial Ambient Cathedral',
      category: 'ir-reverb',
      sizeMb: 24,
      format: '48kHz 24-bit True Stereo WAV IR',
      description: 'Expansive 3.8-second decay time with shimmering harmonic tails for cinematic pads.',
      isActive: false,
      accentColor: '#f2ca50',
      icon: '✨',
    },
    {
      id: 'asset-stem-groove',
      name: 'Groove & Pocket Rhythmic Stems',
      category: 'stem-pack',
      sizeMb: 85,
      format: 'Multi-Track Stems (Drums/Bass)',
      description: 'Tight syncopated funk and neo-soul rhythm tracks designed for dynamic crossfading.',
      isActive: true,
      accentColor: '#22c55e',
      icon: '🥁',
    },
    {
      id: 'asset-stem-chill',
      name: 'Lo-Fi Midnight Acoustic Stems',
      category: 'stem-pack',
      sizeMb: 64,
      format: 'Multi-Track Stems (Drums/Bass/Keys)',
      description: 'Mellow, vinyl-textured chord backdrops for late-night guitar and piano improvisation.',
      isActive: false,
      accentColor: '#22c55e',
      icon: '🌙',
    },
  ]);

  const [selectedAsset, setSelectedAsset] = useState<AudioAssetItem>(assets[0]);

  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.format.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeCategory === 'all') return matchesSearch;
    return matchesSearch && a.category === activeCategory;
  });

  const totalStorageMb = assets.reduce((acc, a) => acc + a.sizeMb, 0);

  const handleToggleActive = (id: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  const handleTogglePreview = (id: string) => {
    setPlayingAssetId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#110e07] text-[#eae1d4] overflow-hidden select-none font-sans">
      {/* Top Header */}
      <header className="h-16 px-8 bg-[#16130b] border-b border-[#4d4635]/40 flex items-center justify-between shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-[#231f17] border border-[#f2ca50]/40 flex items-center justify-center text-[#f2ca50] shadow-[0_0_12px_rgba(242,202,80,0.2)] font-mono font-bold text-sm">
            🗂️
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold tracking-widest text-[#f2ca50] uppercase">
              SOUND LIBRARY & NEURAL ASSETS
            </h1>
            <p className="font-mono text-[10px] text-[#d0c5af]/60 tracking-tight">
              LOCAL ENGINE CACHE • {totalStorageMb} MB USED (10.0 GB ALLOCATED)
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search models, IR spaces, stems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1f1b13] border border-[#4d4635]/50 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono text-[#eae1d4] placeholder-[#d0c5af]/40 focus:outline-none focus:border-[#f2ca50]/70 w-64 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#d0c5af]/50">🔍</span>
          </div>

          <button
            onClick={() => alert('Custom impulse responses (.wav) and model weights (.mlx) can be imported into the local engine cache.')}
            className="bg-[#231f17] hover:bg-[#2d2a21] text-[#f2ca50] border border-[#f2ca50]/40 font-mono text-xs font-bold px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>+ IMPORT ASSET</span>
          </button>

          {onLaunchStudio && (
            <button
              onClick={onLaunchStudio}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-[#241a00] font-mono text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-[0_0_12px_rgba(242,202,80,0.3)] flex items-center gap-1.5 cursor-pointer"
            >
              <span>OPEN STUDIO ↗</span>
            </button>
          )}
        </div>
      </header>

      {/* Category Tabs */}
      <div className="px-8 py-3 bg-[#16130b] border-b border-[#4d4635]/30 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[10px] font-mono text-[#d0c5af]/60 font-bold uppercase mr-2">CATEGORIES:</span>
        {[
          { id: 'all', label: 'All Assets' },
          { id: 'neural-model', label: '🧠 Neural Models (MLX)' },
          { id: 'ir-reverb', label: '🏛️ IR Reverbs (48kHz)' },
          { id: 'stem-pack', label: '🥁 Accompaniment Stems' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition cursor-pointer border ${
              activeCategory === tab.id
                ? 'bg-[#231f17] text-[#f2ca50] border-[#f2ca50]/50 shadow-[0_0_8px_rgba(242,202,80,0.2)]'
                : 'bg-[#1f1b13] text-[#d0c5af]/60 border-[#4d4635]/40 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content: Asset Grid (Left) + Asset Inspector (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Asset Cards */}
        <div className="w-7/12 border-r border-[#4d4635]/40 flex flex-col bg-[#16130b] overflow-y-auto p-6 space-y-3">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAsset?.id === asset.id;
            const isPlaying = playingAssetId === asset.id;
            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-md ${
                  isSelected
                    ? 'bg-[#231f17] border-[#f2ca50]/60 shadow-[0_0_16px_rgba(242,202,80,0.15)]'
                    : 'bg-[#1f1b13] border-[#4d4635]/40 hover:border-[#4d4635] hover:bg-[#28241b]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{asset.icon}</span>
                    <h3 className="font-mono text-xs font-bold text-[#eae1d4]">{asset.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#d0c5af]/50">{asset.sizeMb} MB</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(asset.id);
                      }}
                      className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase transition cursor-pointer border ${
                        asset.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-[#16130b] text-[#d0c5af]/50 border-[#4d4635]/40'
                      }`}
                    >
                      {asset.isActive ? 'ACTIVE IN STUDIO' : 'INACTIVE'}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] font-mono text-[#d0c5af]/70 leading-relaxed mb-3">
                  {asset.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#4d4635]/20 font-mono text-[10px]">
                  <span className="text-[#d0c5af]/60">{asset.format}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePreview(asset.id);
                    }}
                    className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 font-bold ${
                      isPlaying
                        ? 'bg-[#f2ca50] text-[#241a00]'
                        : 'bg-[#2d2a21] text-[#d0c5af] hover:text-[#f2ca50]'
                    }`}
                  >
                    <span>{isPlaying ? '⏸ PAUSE' : '▶ PREVIEW SOUND'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Selected Asset Inspector & Macro Parameter Controls */}
        <div className="w-5/12 flex flex-col bg-[#110e07] overflow-y-auto p-6 space-y-6">
          <div className="bg-[#1f1b13] border border-[#4d4635]/40 rounded-xl p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#231f17] border border-[#f2ca50]/40 flex items-center justify-center text-xl shadow-md">
                {selectedAsset.icon}
              </div>
              <div>
                <span className="text-[9px] font-mono text-[#d0c5af]/60 block uppercase">SELECTED ENGINE ASSET</span>
                <h2 className="font-mono text-sm font-bold text-[#ffe9b0]">{selectedAsset.name}</h2>
              </div>
            </div>

            <p className="font-mono text-xs text-[#d0c5af]/80 leading-relaxed mb-4">
              {selectedAsset.description}
            </p>

            <div className="space-y-2 pt-3 border-t border-[#4d4635]/30 font-mono text-xs">
              <div className="flex justify-between text-[#d0c5af]/70">
                <span>FORMAT:</span>
                <span className="text-white font-bold">{selectedAsset.format}</span>
              </div>
              <div className="flex justify-between text-[#d0c5af]/70">
                <span>MEMORY FOOTPRINT:</span>
                <span className="text-amber-300 font-bold">{selectedAsset.sizeMb} MB</span>
              </div>
              <div className="flex justify-between text-[#d0c5af]/70">
                <span>EXECUTION TARGET:</span>
                <span className="text-[#7bd0ff] font-bold">On-Device Apple Silicon / WebAudio DSP</span>
              </div>
            </div>
          </div>

          {/* Macro Parameter Sliders */}
          <div className="bg-[#1f1b13] border border-[#4d4635]/40 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="font-mono text-xs font-bold text-[#f2ca50] uppercase flex items-center gap-1.5">
              <span>🎛️</span> MACRO ENGINE PARAMETERS
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-[10px] text-[#d0c5af]/70 mb-1">
                  <span>WARMTH DRIVE / SATURATION</span>
                  <span className="text-amber-300">45%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="45"
                  className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer accent-[#f2ca50]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-[#d0c5af]/70 mb-1">
                  <span>WET / DRY REVERB BLEND</span>
                  <span className="text-emerald-300">18%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="18"
                  className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-[#d0c5af]/70 mb-1">
                  <span>STEREO SPREAD COEFFICIENT</span>
                  <span className="text-[#7bd0ff]">125%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  defaultValue="125"
                  className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer accent-[#7bd0ff]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
