import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import db from '../../../lib/db';

export async function GET() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = db
      .prepare('SELECT name, relationship, image_url as imageUrl FROM face_entries WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId) as Array<{ name: string; relationship: string; imageUrl: string }>;

    const response = rows.reduce<Record<string, { relationship: string; images: string[] }>>((acc, row) => {
      acc[row.name] = {
        relationship: row.relationship,
        images: [row.imageUrl],
      };
      return acc;
    }, {});

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to load faces', error);
    return NextResponse.json({ error: 'Failed to load faces' }, { status: 500 });
  }
}
