import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import {
  appendProgressEntry,
  loadProgressData,
  saveProgressData,
} from '../../../lib/progressStorage';

export async function POST(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { mode?: string; correct?: number; total?: number; playedAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { correct, total, playedAt } = body;
  if (typeof correct !== 'number' || typeof total !== 'number') {
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
      correct,
      total,
      playedAt: played.toISOString(),
    });

    await saveProgressData(userId, updated);
    return NextResponse.json({ message: 'Logged' });
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
    const accuracyArray = Object.entries(data.accuracy).map(([label, stat]) => ({
      label,
      type: 'face' as const,
      correct: stat.correct,
      total: stat.total,
    }));

    return NextResponse.json({ entries: data.entries, accuracy: accuracyArray });
  } catch (error) {
    console.error('Failed to load progress', error);
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}
