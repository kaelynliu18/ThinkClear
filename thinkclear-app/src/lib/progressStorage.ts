import { randomUUID } from 'crypto';
import { list, put } from '@vercel/blob';

export interface StoredProgressEntry {
  id: string;
  face: string;
  correct: number;
  total: number;
  playedAt: string;
}

export interface StoredAccuracyStat {
  label: string;
  correct: number;
  total: number;
}

export interface StoredProgressData {
  entries: StoredProgressEntry[];
  accuracy: Record<string, StoredAccuracyStat>;
  version: number;
  lastUpdated: string;
}

const PROGRESS_PATH = (userId: string) => `progress/${userId}/progress.json`;
const PROGRESS_LIMIT = 500;

// In-memory cache for ultra-fast access
const progressCache = new Map<string, { data: StoredProgressData; timestamp: number }>();
const CACHE_TTL = 15000; // 15 seconds for progress data

const tokenedHeaders = () =>
  process.env.BLOB_READ_WRITE_TOKEN
    ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
    : undefined;

const normalizeLabel = (label: string) => label.trim().toLowerCase();

async function fetchBlobContent(url: string): Promise<string> {
  const cacheBustedUrl = url.includes('?') ? `${url}&ts=${Date.now()}` : `${url}?ts=${Date.now()}`;
  const res = await fetch(cacheBustedUrl, {
    headers: tokenedHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch blob: ${res.status}`);
  }

  return await res.text();
}

async function ensureProgressBlob(userId: string): Promise<void> {
  const existing = await list({
    prefix: PROGRESS_PATH(userId),
    limit: 1,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (existing.blobs.length === 0) {
    const initialData: StoredProgressData = {
      entries: [],
      accuracy: {},
      version: 1,
      lastUpdated: new Date().toISOString()
    };
    
    await put(
      PROGRESS_PATH(userId),
      JSON.stringify(initialData),
      {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    );
  }
}

const normalizeEntry = (entry: Partial<StoredProgressEntry>, fallbackId: string): StoredProgressEntry | null => {
  const faceRaw = typeof entry.face === 'string' ? entry.face.trim() : '';
  if (!faceRaw) return null;

  return {
    id: entry.id ?? fallbackId,
    face: faceRaw,
    correct: Number(entry.correct ?? 0),
    total: Number(entry.total ?? 0) || 0,
    playedAt: entry.playedAt ?? new Date().toISOString(),
  };
};

export const computeAccuracyFromEntries = (
  entries: StoredProgressEntry[]
): Record<string, StoredAccuracyStat> => {
  return entries.reduce<Record<string, StoredAccuracyStat>>((acc, entry) => {
    const key = normalizeLabel(entry.face);
    const display = entry.face.trim();
    if (!display) return acc;

    const current = acc[key] ?? { label: display, correct: 0, total: 0 };
    current.label = display;
    current.correct += entry.correct > 0 ? entry.correct : 0;
    current.total += entry.total > 0 ? entry.total : 0;
    acc[key] = current;
    return acc;
  }, {});
};

const normalizeData = (data: StoredProgressData): StoredProgressData => {
  const entries = (data.entries ?? [])
    .map((entry, idx) => normalizeEntry(entry, `legacy-${idx}`))
    .filter((entry): entry is StoredProgressEntry => entry !== null)
    .map((entry) => ({
      ...entry,
      total: entry.total || 1,
      correct: entry.correct > entry.total ? entry.total : entry.correct,
    }));

  const limitedEntries = entries.slice(-PROGRESS_LIMIT);
  const accuracy = computeAccuracyFromEntries(limitedEntries);

  return {
    entries: limitedEntries,
    accuracy,
    version: data.version || 1,
    lastUpdated: new Date().toISOString()
  };
};

export async function loadProgressData(userId: string): Promise<StoredProgressData> {
  // Check cache first for ultra-fast access
  const cached = progressCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  await ensureProgressBlob(userId);

  const { blobs } = await list({
    prefix: PROGRESS_PATH(userId),
    limit: 1,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  let data: StoredProgressData;
  if (blobs.length === 0) {
    data = { entries: [], accuracy: {}, version: 1, lastUpdated: new Date().toISOString() };
  } else {
    try {
      const jsonString = await fetchBlobContent(blobs[0].downloadUrl ?? blobs[0].url);
      const parsed = JSON.parse(jsonString) as StoredProgressData;
      data = normalizeData(parsed);
    } catch (error) {
      console.warn('Failed to parse progress data blob', error);
      data = { entries: [], accuracy: {}, version: 1, lastUpdated: new Date().toISOString() };
    }
  }

  // Update cache
  progressCache.set(userId, { data, timestamp: Date.now() });
  
  return data;
}

export async function saveProgressData(userId: string, data: StoredProgressData): Promise<StoredProgressData> {
  const normalized = normalizeData(data);
  normalized.version = (normalized.version || 1) + 1;
  normalized.lastUpdated = new Date().toISOString();
  
  await put(PROGRESS_PATH(userId), JSON.stringify(normalized), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  // Update cache
  progressCache.set(userId, { data: normalized, timestamp: Date.now() });
  
  return normalized;
}

export function appendProgressEntry(
  data: StoredProgressData,
  entry: StoredProgressEntry
): StoredProgressData {
  const normalizedEntry = normalizeEntry(entry, entry.id ?? randomUUID());
  if (!normalizedEntry) {
    return data;
  }

  const entries = [...(data.entries ?? []), normalizedEntry];
  const normalized = normalizeData({ 
    entries, 
    accuracy: data.accuracy ?? {},
    version: data.version || 1,
    lastUpdated: data.lastUpdated || new Date().toISOString()
  });
  return normalized;
}

export function getAccuracyStat(data: StoredProgressData, label: string): StoredAccuracyStat {
  const key = normalizeLabel(label);
  const stat = data.accuracy[key];
  const trimmed = label.trim();
  return stat ?? { label: trimmed, correct: 0, total: 0 };
}

export async function removeProgressForFace(userId: string, faceLabel: string): Promise<void> {
  const data = await loadProgressData(userId);
  const filtered = data.entries.filter((entry) => entry.face !== faceLabel);

  if (filtered.length === data.entries.length) {
    return;
  }

  const normalized = normalizeData({ 
    entries: filtered, 
    accuracy: {},
    version: data.version || 1,
    lastUpdated: data.lastUpdated || new Date().toISOString()
  });
  await saveProgressData(userId, normalized);
}

export function invalidateProgressCache(userId: string) {
  progressCache.delete(userId);
}

export function getProgressCacheStats() {
  return {
    size: progressCache.size,
    entries: Array.from(progressCache.keys())
  };
}

// Fast batch operations for game sessions
export async function appendMultipleProgressEntries(
  userId: string,
  entries: StoredProgressEntry[]
): Promise<StoredProgressData> {
  const data = await loadProgressData(userId);
  
  const normalizedEntries = entries
    .map(entry => normalizeEntry(entry, entry.id ?? randomUUID()))
    .filter((entry): entry is StoredProgressEntry => entry !== null);
  
  const newEntries = [...(data.entries ?? []), ...normalizedEntries];
  const normalized = normalizeData({ 
    entries: newEntries, 
    accuracy: data.accuracy ?? {},
    version: data.version || 1,
    lastUpdated: data.lastUpdated || new Date().toISOString()
  });
  
  return await saveProgressData(userId, normalized);
}
