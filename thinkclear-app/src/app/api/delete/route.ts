// src/app/api/delete/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function DELETE(req: Request) {
  let body: { name?: string; file?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, file: fileName } = body;
  if (!name || !fileName) {
    return NextResponse.json({ error: 'Missing name or file' }, { status: 400 });
  }

  // Read & parse faces.json
  const dataPath = path.join(process.cwd(), 'public', 'faces-data', 'faces.json');
  let data: Record<string, { relationship: string; images: string[] }>;
  try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch {
    return NextResponse.json({ error: 'Could not read faces.json' }, { status: 500 });
  }

  // Remove the file
  const imagePath = path.join(process.cwd(), 'public', 'faces-data', fileName);
  if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

  // Update JSON
  data[name].images = data[name].images.filter(img => img !== fileName);
  if (data[name].images.length === 0) delete data[name];
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');

  return NextResponse.json({ message: 'Delete successful', name, file: fileName });
}
