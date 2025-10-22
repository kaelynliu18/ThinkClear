import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { loadFaceMetadata } from '../../../lib/faceStorage';
import fs from 'fs';
import path from 'path';

const DEFAULT_FACES_FILE = path.join(process.cwd(), 'public', 'default-faces.json');

function loadDefaultFaces() {
  try {
    if (fs.existsSync(DEFAULT_FACES_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEFAULT_FACES_FILE, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Failed to load default faces:', error);
  }
  
  // Fallback to hardcoded data with new structure
  const now = new Date().toISOString();
  return {
    "Hangyl": {
      "relationship": "Co-founder & CEO",
      "images": ["Hangyl-1752811845862.png"],
      "createdAt": now,
      "updatedAt": now
    },
    "Isaac": {
      "relationship": "Co-founder & CTO", 
      "images": ["isaac_1752987515197.jpg"],
      "createdAt": now,
      "updatedAt": now
    },
    "Kaelyn": {
      "relationship": "Co-founder & Head of Design",
      "images": ["kaelyn_1752939468706.jpg"],
      "createdAt": now,
      "updatedAt": now
    },
    "Tanuj": {
      "relationship": "Co-founder & Head of Product",
      "images": ["Tanuj-1752812456575.png"],
      "createdAt": now,
      "updatedAt": now
    },
    "Vedant": {
      "relationship": "Co-founder & Head of Engineering",
      "images": ["vedant_1752839826214.jpg"],
      "createdAt": now,
      "updatedAt": now
    }
  };
}

export async function GET() {
  try {
    const user = await currentUser();
    const userId = user?.id;

    if (!userId) {
      const defaultFaces = loadDefaultFaces();
      const res = NextResponse.json(defaultFaces);
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }

    const metadata = await loadFaceMetadata(userId);
    const res = NextResponse.json(metadata);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    console.error('Failed to load faces metadata', error);
    const defaultFaces = loadDefaultFaces();
    const res = NextResponse.json(defaultFaces);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }
}
