import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import db from '../../../lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entries = db
    .prepare('SELECT id, content, entry_date as entryDate, created_at as createdAt, updated_at as updatedAt FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC, created_at DESC')
    .all(userId);

  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { content?: string; entryDate?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { content, entryDate } = body;
  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }

  const entry = entryDate ? new Date(entryDate) : new Date();
  if (Number.isNaN(entry.getTime())) {
    return NextResponse.json({ error: 'Invalid entryDate value' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(`
    INSERT INTO journal_entries (id, user_id, content, entry_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, content, entry.toISOString(), now, now);

  return NextResponse.json({ id });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
  }

  db.prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?').run(body.id, userId);

  return NextResponse.json({ message: 'Deleted' });
}
