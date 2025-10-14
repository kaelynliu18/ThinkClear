import { NextResponse } from 'next/server';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { currentUser } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { loadFaceMetadata, saveFaceMetadata } from '../../../lib/faceStorage';

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

  finalBuffer = await sharp(finalBuffer).rotate().jpeg({ quality: 90 }).toBuffer();
  finalExt = 'jpg';

  const safeName = name.replace(/\s+/g, '_').toLowerCase();
  const fileName = `${safeName}_${Date.now()}.${finalExt}`;
  const imagePath = `faces/${userId}/images/${fileName}`;

  try {
    const { url } = await put(imagePath, finalBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const metadata = await loadFaceMetadata(userId);
    if (!metadata[name]) {
      metadata[name] = { relationship, images: [] };
    }
    metadata[name].relationship = relationship;
    metadata[name].images = [url, ...metadata[name].images.filter((existing) => existing !== url)];

    await saveFaceMetadata(userId, metadata);

    return NextResponse.json({
      message: 'Upload successful',
      face: {
        name,
        relationship,
        imageUrl: url,
      },
    });
  } catch (error) {
    console.error('Failed to upload face image', error);
    return NextResponse.json({ error: 'Failed to store face image' }, { status: 500 });
  }
}
