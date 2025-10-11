import { list, put } from '@vercel/blob';

export interface StoredProgressEntry {
  id: string;
  face: string;
  correct: number;
  total: number;
  playedAt: string;
}

export interface StoredAccuracyStat {
  correct: number;
  total: number;
}

export interface StoredProgressData {
  entries: StoredProgressEntry[];
  accuracy: Record<string, StoredAccuracyStat>;
}

const PROGRESS_PATH = (userId: string) => `progress/${userId}/progress.json`;
const PROGRESS_LIMIT = 500;

function tokenedHeaders() {
  return process.env.BLOB_READ_WRITE_TOKEN
    ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
    : undefined;
}

async function fetchBlobContent(url: string): Promise<string> {
  const res = await fetch(url, { headers: tokenedHeaders() });

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
    await put(PROGRESS_PATH(userId), JSON.stringify({ entries: [], accuracy: {} }), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  }
}

export async function loadProgressData(userId: string): Promise<StoredProgressData> {
  await ensureProgressBlob(userId);

  const { blobs } = await list({
    prefix: PROGRESS_PATH(userId),
    limit: 1,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (blobs.length === 0) {
    return { entries: [], accuracy: {} };
  }

  try {
    const jsonString = await fetchBlobContent(blobs[0].downloadUrl ?? blobs[0].url);
    const parsed = JSON.parse(jsonString) as StoredProgressData;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      accuracy: typeof parsed.accuracy === 'object' && parsed.accuracy
        ? parsed.accuracy
        : {},
    };
  } catch (error) {
    console.warn('Failed to parse progress data blob', error);
    return { entries: [], accuracy: {} };
  }
}

export async function saveProgressData(userId: string, data: StoredProgressData) {
  await put(PROGRESS_PATH(userId), JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export function appendProgressEntry(
  data: StoredProgressData,
  entry: StoredProgressEntry
): StoredProgressData {
  const entries = [...data.entries, entry];
  const limitedEntries = entries.slice(-PROGRESS_LIMIT);
  return {
    ...data,
    entries: limitedEntries,
  };
}

export function updateAccuracyStat(
  data: StoredProgressData,
  label: string,
  isCorrect: boolean
): StoredProgressData {
  const current = data.accuracy[label] ?? { correct: 0, total: 0 };
  const next: StoredAccuracyStat = {
    correct: current.correct + (isCorrect ? 1 : 0),
    total: current.total + 1,
  };

  return {
    ...data,
    accuracy: {
      ...data.accuracy,
      [label]: next,
    },
  };
}
