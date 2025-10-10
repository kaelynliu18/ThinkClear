import { NextResponse } from 'next/server';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { currentUser } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import db from '../../../lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string;
  const relationship = formData.get('relationship') as string;

  if (!file || !name || !relationship) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  let finalBuffer: Buffer = Buffer.from(bytes);
  let finalExt = file.name.split('.').pop()?.toLowerCase() || 'png';

  if (['heic', 'heif'].includes(finalExt)) {
    try {
      const converted = await heicConvert({
        buffer: finalBuffer,
        format: 'JPEG',
        quality: 1,
      });
      finalBuffer = Buffer.from(converted);
      finalExt = 'jpg';
    } catch {
      return NextResponse.json({ error: 'HEIC conversion failed' }, { status: 500 });
    }
  }

  finalBuffer = await sharp(finalBuffer).jpeg({ quality: 90 }).toBuffer();
  finalExt = 'jpg';

  const safeName = name.replace(/\s+/g, '_').toLowerCase();
  const fileName = `${safeName}_${Date.now()}.${finalExt}`;

  let blobUrl: string;
  try {
    const result = await put(`faces/${userId}/${fileName}`, finalBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });
    blobUrl = result.url;
  } catch (error) {
    console.error('Failed to upload face image', error);
    return NextResponse.json({ error: 'Failed to store face image' }, { status: 500 });
  }

  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO face_entries (id, user_id, name, relationship, image_url, created_at, updated_at)
      VALUES (@id, @userId, @name, @relationship, @imageUrl, @createdAt, @updatedAt)
      ON CONFLICT(user_id, name) DO UPDATE SET
        relationship = excluded.relationship,
        image_url = excluded.image_url,
        updated_at = excluded.updated_at
    `).run({
      id: randomUUID(),
      userId,
      name,
      relationship,
      imageUrl: blobUrl,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: 'Upload successful',
      face: {
        name,
        relationship,
        imageUrl: blobUrl,
      },
    });
  } catch (error) {
    console.error('Failed to persist face metadata', error);
    return NextResponse.json({ error: 'Failed to save face' }, { status: 500 });
  }
}
