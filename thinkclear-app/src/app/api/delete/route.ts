import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { del } from '@vercel/blob';
import db from '../../../lib/db';

export async function DELETE(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string; file?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, file } = body;
  if (!name || !file) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    await del(file);
  } catch (error) {
    console.error('Failed to delete blob', error);
  }

  try {
    db.prepare('DELETE FROM face_entries WHERE user_id = ? AND name = ?').run(userId, name);
    return NextResponse.json({ message: 'Delete successful' });
  } catch (error) {
    console.error('Failed to delete face entry', error);
    return NextResponse.json({ error: 'Failed to delete face' }, { status: 500 });
  }
}
