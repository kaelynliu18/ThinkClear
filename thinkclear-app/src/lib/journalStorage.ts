import { list, put } from '@vercel/blob';
import { randomUUID } from 'crypto';

export interface StoredJournalEntry {
  id: string;
  content: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredJournalData {
  entries: StoredJournalEntry[];
}

const JOURNAL_PATH = (userId: string) => `journal/${userId}/entries.json`;
const JOURNAL_LIMIT = 1000;

const tokenedHeaders = () =>
  process.env.BLOB_READ_WRITE_TOKEN
    ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
    : undefined;

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

async function ensureJournalBlob(userId: string): Promise<void> {
  const existing = await list({
    prefix: JOURNAL_PATH(userId),
    limit: 1,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (existing.blobs.length === 0) {
    await put(
      JOURNAL_PATH(userId),
      JSON.stringify({ entries: [] }),
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

const normalizeEntry = (value: Partial<StoredJournalEntry>): StoredJournalEntry | null => {
  const content = typeof value.content === 'string' ? value.content.trim() : '';
  if (!content) return null;

  const entryDateRaw = typeof value.entryDate === 'string' ? value.entryDate : value.createdAt;
  const entryDate = entryDateRaw ? new Date(entryDateRaw) : new Date();
  if (Number.isNaN(entryDate.getTime())) return null;

  const createdRaw = typeof value.createdAt === 'string' ? new Date(value.createdAt) : new Date();
  const createdAt = Number.isNaN(createdRaw.getTime()) ? new Date() : createdRaw;

  const updatedRaw = typeof value.updatedAt === 'string' ? new Date(value.updatedAt) : createdAt;
  const updatedAt = Number.isNaN(updatedRaw.getTime()) ? createdAt : updatedRaw;

  return {
    id: value.id ?? randomUUID(),
    content,
    entryDate: entryDate.toISOString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
};

const sortEntries = (entries: StoredJournalEntry[]): StoredJournalEntry[] => {
  return [...entries].sort((a, b) => {
    const entryDateA = new Date(a.entryDate).getTime();
    const entryDateB = new Date(b.entryDate).getTime();
    if (entryDateA !== entryDateB) {
      return entryDateB - entryDateA;
    }
    const createdA = new Date(a.createdAt).getTime();
    const createdB = new Date(b.createdAt).getTime();
    return createdB - createdA;
  });
};

const normalizeData = (data: StoredJournalData): StoredJournalData => {
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const normalized = entries
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is StoredJournalEntry => entry !== null);
  const limited = sortEntries(normalized).slice(0, JOURNAL_LIMIT);
  return { entries: limited };
};

async function loadJournalData(userId: string): Promise<StoredJournalData> {
  await ensureJournalBlob(userId);

  const { blobs } = await list({
    prefix: JOURNAL_PATH(userId),
    limit: 1,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (blobs.length === 0) {
    return { entries: [] };
  }

  try {
    const jsonString = await fetchBlobContent(blobs[0].downloadUrl ?? blobs[0].url);
    const parsed = JSON.parse(jsonString) as StoredJournalData;
    return normalizeData(parsed);
  } catch (error) {
    console.warn('Failed to read journal blob', error);
    return { entries: [] };
  }
}

async function saveJournalData(userId: string, data: StoredJournalData): Promise<void> {
  const normalized = normalizeData(data);
  await put(JOURNAL_PATH(userId), JSON.stringify(normalized), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export async function loadJournalEntries(userId: string): Promise<StoredJournalEntry[]> {
  const data = await loadJournalData(userId);
  return data.entries;
}

export async function appendJournalEntry(
  userId: string,
  entry: Omit<StoredJournalEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<StoredJournalEntry> {
  const data = await loadJournalData(userId);
  const now = new Date();
  const next = normalizeEntry({
    id: randomUUID(),
    content: entry.content,
    entryDate: entry.entryDate,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  if (!next) {
    throw new Error('Invalid journal entry');
  }

  const entries = [next, ...data.entries];
  await saveJournalData(userId, { entries });
  return next;
}

export async function removeJournalEntry(userId: string, id: string): Promise<void> {
  const data = await loadJournalData(userId);
  const filtered = data.entries.filter((entry) => entry.id !== id);
  await saveJournalData(userId, { entries: filtered });
}

export async function updateJournalEntry(
  userId: string,
  id: string,
  updates: Partial<Pick<StoredJournalEntry, 'content' | 'entryDate'>>
): Promise<StoredJournalEntry | null> {
  const data = await loadJournalData(userId);
  let updatedEntry: StoredJournalEntry | null = null;

  const updatedEntries = data.entries.map((entry) => {
    if (entry.id !== id) {
      return entry;
    }

    const merged = normalizeEntry({
      ...entry,
      ...updates,
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: new Date().toISOString(),
    });

    if (!merged) {
      return entry;
    }

    updatedEntry = merged;
    return merged;
  });

  await saveJournalData(userId, { entries: updatedEntries });
  return updatedEntry;
}
