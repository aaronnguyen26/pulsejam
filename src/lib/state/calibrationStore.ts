import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CalibrationData } from '../audio/types';

export interface CalibrationState {
  calibration: CalibrationData | null;
  setCalibration: (calibration: CalibrationData | null) => void;
  clearCalibration: () => void;
}

const customStorage = {
  getItem: (name: string): string | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(name);
    }
    return null;
  },
  setItem: (name: string, value: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(name);
    }
  },
};

export const useCalibrationStore = create<CalibrationState>()(
  persist(
    (set) => ({
      calibration: null,
      setCalibration: (cal) => set({ calibration: cal }),
      clearCalibration: () => set({ calibration: null }),
    }),
    {
      name: 'pulsejam-calibration-store',
      storage: createJSONStorage(() => customStorage),
    }
  )
);
