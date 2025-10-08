import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import fs from 'fs';
import path from 'path';

type GalleryEntry = {
  relationship: string;
  images: string[];
};

type GalleryData = Record<string, GalleryEntry>;

const DATA_DIR = path.join(process.cwd(), 'public', 'faces-data');
const DATA_FILE = path.join(DATA_DIR, 'faces.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf8');
  }
}

export async function GET() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data: GalleryData = JSON.parse(raw);
    const userData = data[userId] ?? {};
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Failed to load faces.json', error);
    return NextResponse.json({ error: 'Failed to load faces' }, { status: 500 });
  }
}
