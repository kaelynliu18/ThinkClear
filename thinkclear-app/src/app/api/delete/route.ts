import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { del } from '@vercel/blob';
import { loadFaceMetadata, saveFaceMetadata } from '../../../lib/faceStorage';

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
    const metadata = await loadFaceMetadata(userId);
    const entry = metadata[name];
    if (!entry) {
      return NextResponse.json({ error: 'Face not found' }, { status: 404 });
    }

    entry.images = entry.images.filter((url) => url !== file);
    if (entry.images.length === 0) {
      delete metadata[name];
    }

    await del(file, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch((error) => {
      console.warn('Failed to delete blob', error);
    });

    await saveFaceMetadata(userId, metadata);
    return NextResponse.json({ message: 'Delete successful' });
  } catch (error) {
    console.error('Failed to delete face', error);
    return NextResponse.json({ error: 'Failed to delete face' }, { status: 500 });
  }
}
