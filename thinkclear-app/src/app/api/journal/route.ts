import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import {
  appendJournalEntry,
  loadJournalEntries,
  removeJournalEntry,
} from '../../../lib/journalStorage';

export async function GET() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entries = await loadJournalEntries(userId);
  const res = NextResponse.json({ entries });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res;
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

  const saved = await appendJournalEntry(userId, {
    content,
    entryDate: entry.toISOString(),
  });

  const res = NextResponse.json({ entry: saved });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res;
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

  await removeJournalEntry(userId, body.id);
  return NextResponse.json({ message: 'Deleted' });
}
