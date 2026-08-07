import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type InputMode = 'acoustic' | 'interface';

export interface AudioSettingsState {
  selectedDeviceId: string | null;
  inputGainDb: number;
  inputMode: InputMode;
  phantomPower: boolean;
  lowCutFilter: boolean;

  setSelectedDeviceId: (deviceId: string | null) => void;
  setInputGainDb: (gainDb: number) => void;
  setInputMode: (mode: InputMode) => void;
  setPhantomPower: (enabled: boolean) => void;
  setLowCutFilter: (enabled: boolean) => void;
}

export const useAudioSettingsStore = create<AudioSettingsState>()(
  persist(
    (set) => ({
      selectedDeviceId: null,
      inputGainDb: 12,
      inputMode: 'acoustic',
      phantomPower: false,
      lowCutFilter: true,

      setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
      setInputGainDb: (gainDb) => set({ inputGainDb: gainDb }),
      setInputMode: (mode) => set({ inputMode: mode }),
      setPhantomPower: (enabled) => set({ phantomPower: enabled }),
      setLowCutFilter: (enabled) => set({ lowCutFilter: enabled }),
    }),
    {
      name: 'pulsejam-audio-settings',
    }
  )
);
