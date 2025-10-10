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

  let body: { label?: string; correct?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { label, correct } = body;
  if (!label || typeof correct !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const statType = 'face';

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO accuracy_stats (id, user_id, label, type, correct, total, updated_at)
    VALUES (@id, @userId, @label, @type, @correct, @total, @updatedAt)
    ON CONFLICT(user_id, label, type) DO UPDATE SET
      correct = accuracy_stats.correct + excluded.correct,
      total = accuracy_stats.total + excluded.total,
      updated_at = excluded.updated_at
  `);

  insert.run({
    id: randomUUID(),
    userId,
    label,
    type: statType,
    correct: correct ? 1 : 0,
    total: 1,
    updatedAt: now,
  });

  const stat = db
    .prepare('SELECT label, type, correct, total FROM accuracy_stats WHERE user_id = ? AND label = ? AND type = ?')
    .get(userId, label, statType);

  return NextResponse.json({ stat });
}

export async function GET() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = db
    .prepare('SELECT label, type, correct, total FROM accuracy_stats WHERE user_id = ? AND type = ?')
    .all(userId, 'face');

  return NextResponse.json({ stats });
}
