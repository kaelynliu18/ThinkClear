import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import {
  appendProgressEntry,
  appendMultipleProgressEntries,
  computeAccuracyFromEntries,
  loadProgressData,
  saveProgressData,
} from '../../../lib/progressStorage';
import { loadFaceMetadata } from '../../../lib/faceStorage';

export async function POST(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { 
    face?: string; 
    correct?: number; 
    total?: number; 
    playedAt?: string;
    entries?: Array<{ face: string; correct: number; total: number; playedAt?: string }>;
  };
  
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { face, correct, total, playedAt, entries } = body;

  try {
    // Handle batch entries for game sessions
    if (entries && Array.isArray(entries)) {
      if (entries.length === 0) {
        return NextResponse.json({ error: 'Empty entries array' }, { status: 400 });
      }

      // Validate all entries
      for (const entry of entries) {
        if (!entry.face || typeof entry.correct !== 'number' || typeof entry.total !== 'number') {
          return NextResponse.json({ error: 'Invalid entry format' }, { status: 400 });
        }
      }

      const normalizedEntries = entries.map(entry => ({
        id: randomUUID(),
        face: entry.face,
        correct: entry.correct,
        total: entry.total,
        playedAt: entry.playedAt ? new Date(entry.playedAt).toISOString() : new Date().toISOString(),
      }));

      const updated = await appendMultipleProgressEntries(userId, normalizedEntries);

      const res = NextResponse.json({ 
        message: 'Batch logged', 
        count: entries.length,
        version: updated.version 
      });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }

    // Handle single entry
    if (!face || typeof correct !== 'number' || typeof total !== 'number') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const played = playedAt ? new Date(playedAt) : new Date();
    if (Number.isNaN(played.getTime())) {
      return NextResponse.json({ error: 'Invalid playedAt value' }, { status: 400 });
    }

    const data = await loadProgressData(userId);
    const updated = appendProgressEntry(data, {
      id: randomUUID(),
      face,
      correct,
      total,
      playedAt: played.toISOString(),
    });

    const saved = await saveProgressData(userId, updated);

    const res = NextResponse.json({ 
      message: 'Logged',
      version: saved.version 
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    console.error('Failed to log progress', error);
    return NextResponse.json({ error: 'Failed to log progress' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const includeVersion = url.searchParams.get('includeVersion') === 'true';

  try {
    const data = await loadProgressData(userId);
    const accuracyMap = computeAccuracyFromEntries(data.entries);
    const metadata = await loadFaceMetadata(userId);

    // Ensure all faces in metadata have accuracy stats
    Object.keys(metadata).forEach((name) => {
      const key = name.trim().toLowerCase();
      if (!accuracyMap[key]) {
        accuracyMap[key] = {
          label: name,
          correct: 0,
          total: 0,
        };
      }
    });

    const accuracyArray = Object.values(accuracyMap).map((stat) => ({
      label: stat.label,
      type: 'face' as const,
      correct: stat.correct,
      total: stat.total,
    }));

    const response = includeVersion 
      ? { 
          entries: data.entries, 
          accuracy: accuracyArray,
          version: data.version,
          lastUpdated: data.lastUpdated
        }
      : { 
          entries: data.entries, 
          accuracy: accuracyArray 
        };

    const res = NextResponse.json(response);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    console.error('Failed to load progress', error);
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}
