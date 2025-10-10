import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { currentUser } from '@clerk/nextjs/server';

const DATA_DIR = path.join(process.cwd(), 'data', 'faces-data');
const DATA_FILE = path.join(DATA_DIR, 'faces.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf8');
  }
}

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

  const userDir = path.join(DATA_DIR, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const filePath = path.join(userDir, fileName);
  try {
    await writeFile(filePath, finalBuffer);
  } catch (error) {
    console.error('Failed to write face image', error);
    return NextResponse.json({ error: 'Failed to store face image' }, { status: 500 });
  }

  const storedPath = `${userId}/${fileName}`;

  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = raw ? JSON.parse(raw) : {};
    if (!data[userId]) data[userId] = {};
    if (!data[userId][name]) {
      data[userId][name] = { relationship, images: [] };
    }
    data[userId][name].relationship = relationship;
    data[userId][name].images.unshift(storedPath);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    return NextResponse.json({
      message: 'Upload successful',
      file: fileName,
    });
  } catch (error) {
    console.error('Failed to persist face metadata', error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return NextResponse.json({ error: 'Failed to save face' }, { status: 500 });
  }
}
