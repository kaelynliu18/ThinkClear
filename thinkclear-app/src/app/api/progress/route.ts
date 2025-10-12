import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import {
  appendProgressEntry,
  computeAccuracyFromEntries,
  loadProgressData,
  saveProgressData,
} from '../../../lib/progressStorage';

export async function POST(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { face?: string; correct?: number; total?: number; playedAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { face, correct, total, playedAt } = body;
  if (!face || typeof correct !== 'number' || typeof total !== 'number') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const played = playedAt ? new Date(playedAt) : new Date();
  if (Number.isNaN(played.getTime())) {
    return NextResponse.json({ error: 'Invalid playedAt value' }, { status: 400 });
  }

  try {
    const data = await loadProgressData(userId);
    const updated = appendProgressEntry(data, {
      id: randomUUID(),
      face,
      correct,
      total,
      playedAt: played.toISOString(),
    });

    await saveProgressData(userId, updated);

    const res = NextResponse.json({ message: 'Logged' });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    console.error('Failed to log progress', error);
    return NextResponse.json({ error: 'Failed to log progress' }, { status: 500 });
  }
}

export async function GET() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await loadProgressData(userId);
    const accuracyMap = computeAccuracyFromEntries(data.entries);
    const accuracyArray = Object.values(accuracyMap).map((stat) => ({
      label: stat.label,
      type: 'face' as const,
      correct: stat.correct,
      total: stat.total,
    }));

    const res = NextResponse.json({ entries: data.entries, accuracy: accuracyArray });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    console.error('Failed to load progress', error);
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}
