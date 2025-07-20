// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import sharp from 'sharp';
import heicConvert from 'heic-convert';

export async function POST(req: Request) {
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

  // 1) HEIC/HEIF → JPEG
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

  // 2) Normalize via Sharp → always JPEG
  finalBuffer = await sharp(finalBuffer).jpeg({ quality: 90 }).toBuffer();
  finalExt = 'jpg';

  // 3) Write file
  const safeName = name.replace(/\s+/g, '_').toLowerCase();
  const fileName = `${safeName}_${Date.now()}.${finalExt}`;
  const imagePath = path.join(process.cwd(), 'public/faces-data', fileName);
  await writeFile(imagePath, finalBuffer);

  // 4) Update faces.json
  const dataPath = path.join(process.cwd(), 'public/faces-data', 'faces.json');
  let data: any = {};
  try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch {
    data = {};
  }
  if (!data[name]) data[name] = { relationship, images: [] };
  data[name].images.push(fileName);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  return NextResponse.json({ message: 'Upload successful', file: fileName });
}
