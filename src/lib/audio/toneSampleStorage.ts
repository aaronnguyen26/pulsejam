/**
 * PulseJam Stage 1 Tone Sample Audio Clip Storage (IndexedDB)
 *
 * Stores raw PCM audio clips captured during calibration in IndexedDB,
 * referenced by `toneSampleRef` in CalibrationData.
 */

const DB_NAME = 'pulsejam-tone-samples';
const DB_VERSION = 1;
const STORE_NAME = 'samples';

export interface StoredToneSample {
  key: string;
  pcmData: Float32Array;
  sampleRate: number;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb =
      typeof window !== 'undefined' && window.indexedDB
        ? window.indexedDB
        : (globalThis as any).indexedDB;

    if (!idb) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToneSample(
  key: string,
  pcmData: Float32Array,
  sampleRate: number = 44100
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredToneSample = {
        key,
        pcmData,
        sampleRate,
        createdAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save tone sample in IndexedDB:', err);
  }
}

export async function getToneSample(
  key: string
): Promise<{ pcmData: Float32Array; sampleRate: number } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const res = req.result as StoredToneSample | undefined;
        if (res) {
          resolve({ pcmData: res.pcmData, sampleRate: res.sampleRate });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve tone sample from IndexedDB:', err);
    return null;
  }
}

export async function deleteToneSample(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete tone sample from IndexedDB:', err);
  }
}
