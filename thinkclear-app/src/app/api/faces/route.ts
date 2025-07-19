// src/app/api/faces/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'public', 'faces-data', 'faces.json'),
      'utf8'
    );
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Failed to load faces.json', err);
    return NextResponse.json({}, { status: 500 });
  }
}
