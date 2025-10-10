import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
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

export async function DELETE(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: string; file?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const fileName = body.file ? body.file.split('/').pop() : undefined;

  if (!fileName) {
    return NextResponse.json({ error: 'Missing file identifier' }, { status: 400 });
  }

  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = raw ? JSON.parse(raw) : {};
    const userData = data[userId];

    if (!userData) {
      return NextResponse.json({ error: 'Face not found' }, { status: 404 });
    }

    const absolutePath = path.join(DATA_DIR, userId, fileName);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    for (const name of Object.keys(userData)) {
      userData[name].images = userData[name].images.filter((img: string) => !img.endsWith(fileName));
      if (userData[name].images.length === 0) {
        delete userData[name];
      }
    }

    data[userId] = userData;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    return NextResponse.json({ message: 'Delete successful', file: fileName });
  } catch (error) {
    console.error('Failed to delete face', error);
    return NextResponse.json({ error: 'Failed to delete face' }, { status: 500 });
  }
}
