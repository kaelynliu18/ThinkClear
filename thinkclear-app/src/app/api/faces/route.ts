import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { loadFaceMetadata } from '../../../lib/faceStorage';

export async function GET() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const metadata = await loadFaceMetadata(userId);
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Failed to load faces metadata', error);
    return NextResponse.json({ error: 'Failed to load faces' }, { status: 500 });
  }
}
