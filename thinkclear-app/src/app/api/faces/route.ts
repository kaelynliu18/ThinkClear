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
  
  // Fallback to hardcoded data
  return {
    "Hangyl": {
      "relationship": "Co-founder & CEO",
      "images": ["Hangyl-1752811845862.png"]
    },
    "Isaac": {
      "relationship": "Co-founder & CTO", 
      "images": ["isaac_1752987515197.jpg"]
    },
    "Kaelyn": {
      "relationship": "Co-founder & Head of Design",
      "images": ["kaelyn_1752939468706.jpg"]
    },
    "Tanuj": {
      "relationship": "Co-founder & Head of Product",
      "images": ["Tanuj-1752812456575.png"]
    },
    "Vedant": {
      "relationship": "Co-founder & Head of Engineering",
      "images": ["vedant_1752839826214.jpg"]
    }
  };
}

export async function GET() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    const defaultFaces = loadDefaultFaces();
    return NextResponse.json(defaultFaces);
  }

  try {
    const metadata = await loadFaceMetadata(userId);
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Failed to load faces metadata', error);
    const defaultFaces = loadDefaultFaces();
    return NextResponse.json(defaultFaces);
  }
}
