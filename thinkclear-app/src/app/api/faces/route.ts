import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { loadFaceStoreWithVersion, addFace, removeFace, updateFaceRelationship } from '../../../lib/faceStorage';
import { syncManager } from '../../../lib/syncManager';
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

export async function GET(req: Request) {
  const user = await currentUser();
  const userId = user?.id;
  const url = new URL(req.url);
  const includeVersion = url.searchParams.get('includeVersion') === 'true';

  if (!userId) {
    const defaultFaces = loadDefaultFaces();
    const res = NextResponse.json(includeVersion ? { faces: defaultFaces, version: { version: 1, lastModified: new Date().toISOString(), checksum: 'default' } } : defaultFaces);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }

  try {
    if (includeVersion) {
      const store = await loadFaceStoreWithVersion(userId);
      const res = NextResponse.json(store);
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    } else {
      const store = await loadFaceStoreWithVersion(userId);
      const res = NextResponse.json(store.faces);
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }
  } catch (error) {
    console.error('Failed to load faces metadata', error);
    const defaultFaces = loadDefaultFaces();
    const res = NextResponse.json(includeVersion ? { faces: defaultFaces, version: { version: 1, lastModified: new Date().toISOString(), checksum: 'default' } } : defaultFaces);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }
}

export async function POST(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, name, relationship, imageUrl } = body;

    let version;
    switch (action) {
      case 'add':
        if (!name || !relationship || !imageUrl) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        version = await addFace(userId, name, relationship, imageUrl);
        await syncManager.notifyFaceUpdate(userId, version, 'add', name);
        break;

      case 'remove':
        if (!name) {
          return NextResponse.json({ error: 'Missing face name' }, { status: 400 });
        }
        version = await removeFace(userId, name);
        await syncManager.notifyFaceUpdate(userId, version, 'delete', name);
        break;

      case 'update_relationship':
        if (!name || !relationship) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        version = await updateFaceRelationship(userId, name, relationship);
        await syncManager.notifyFaceUpdate(userId, version, 'update', name);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      version,
      message: `Face ${action} successful` 
    });
  } catch (error) {
    console.error('Failed to update face:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update face' 
    }, { status: 500 });
  }
}
