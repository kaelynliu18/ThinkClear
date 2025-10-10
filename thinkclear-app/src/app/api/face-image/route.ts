import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'faces-data');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawPath = searchParams.get('path');

  if (!rawPath) {
    return NextResponse.json({ error: 'Missing image path' }, { status: 400 });
  }

  const normalized = rawPath.replace(/^\/+/, '');
  const resolvedPath = path.join(DATA_DIR, normalized);

  if (!resolvedPath.startsWith(DATA_DIR)) {
    return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
  }

  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!normalized.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = fs.readFileSync(resolvedPath);
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to load face image', error);
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
}
