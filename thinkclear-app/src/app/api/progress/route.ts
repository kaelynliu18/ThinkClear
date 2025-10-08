import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import db from '../../../lib/db';
import { randomUUID } from 'crypto';

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

  const { mode, correct, total, playedAt } = body;
  if (!mode || typeof correct !== 'number' || typeof total !== 'number') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const played = playedAt ? new Date(playedAt) : new Date();
  if (Number.isNaN(played.getTime())) {
    return NextResponse.json({ error: 'Invalid playedAt value' }, { status: 400 });
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO progress_entries (id, user_id, mode, correct, total, played_at, created_at)
    VALUES (@id, @userId, @mode, @correct, @total, @playedAt, @createdAt)
  `).run({
    id: randomUUID(),
    userId,
    mode,
    correct,
    total,
    playedAt: played.toISOString(),
    createdAt: now,
  });

  return NextResponse.json({ message: 'Logged' });
}

export async function GET() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entries = db
    .prepare('SELECT id, mode, correct, total, played_at as playedAt FROM progress_entries WHERE user_id = ? ORDER BY played_at ASC')
    .all(userId);

  const accuracy = db
    .prepare('SELECT label, type, correct, total FROM accuracy_stats WHERE user_id = ?')
    .all(userId);

  return NextResponse.json({ entries, accuracy });
}
