import { list, put, del } from '@vercel/blob';
import { perf, CachePerformance, validatePerformance } from './performance';

export interface FaceData {
  relationship: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export type FaceMetadata = Record<string, FaceData>;

export interface FaceStoreVersion {
  version: number;
  lastModified: string;
  checksum: string;
}

export interface FaceStoreWithVersion {
  faces: FaceMetadata;
  version: FaceStoreVersion;
}

const metadataPathFor = (userId: string) => `faces/${userId}/faces.json`;
const versionPathFor = (userId: string) => `faces/${userId}/version.json`;

// In-memory cache for fast access
const faceCache = new Map<string, { data: FaceStoreWithVersion; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const authHeaders = () =>
  process.env.BLOB_READ_WRITE_TOKEN
    ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
    : undefined;

async function fetchBlobContent(downloadUrl: string): Promise<string> {
  const cacheBusted = downloadUrl.includes('?')
    ? `${downloadUrl}&ts=${Date.now()}`
    : `${downloadUrl}?ts=${Date.now()}`;
  const res = await fetch(cacheBusted, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch blob: ${res.status}`);
  }
  return await res.text();
}

function generateChecksum(data: FaceMetadata): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

async function loadVersion(userId: string): Promise<FaceStoreVersion> {
  try {
    const { blobs } = await list({
      prefix: versionPathFor(userId),
      limit: 1,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    if (blobs.length === 0) {
      return { version: 1, lastModified: new Date().toISOString(), checksum: '' };
    }
    
    const jsonString = await fetchBlobContent(blobs[0].downloadUrl ?? blobs[0].url);
    return JSON.parse(jsonString) as FaceStoreVersion;
  } catch (error) {
    console.warn('Failed to read version blob', error);
    return { version: 1, lastModified: new Date().toISOString(), checksum: '' };
  }
}

async function saveVersion(userId: string, version: FaceStoreVersion) {
  await put(versionPathFor(userId), JSON.stringify(version), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export async function loadFaceMetadata(userId: string): Promise<FaceMetadata> {
  const store = await loadFaceStoreWithVersion(userId);
  return store.faces;
}

export async function loadFaceStoreWithVersion(userId: string): Promise<FaceStoreWithVersion> {
  return await perf.measureAsync('face_fetch', async () => {
    // Check cache first
    const cacheStart = performance.now();
    const cached = faceCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const cacheTime = performance.now() - cacheStart;
      CachePerformance.recordHit(cacheTime);
      return cached.data;
    }
    CachePerformance.recordMiss(performance.now() - cacheStart);

    const { blobs } = await list({
      prefix: metadataPathFor(userId),
      limit: 1,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    let faces: FaceMetadata = {};
    if (blobs.length > 0) {
      try {
        const jsonString = await fetchBlobContent(blobs[0].downloadUrl ?? blobs[0].url);
        faces = JSON.parse(jsonString) as FaceMetadata;
      } catch (error) {
        console.warn('Failed to read metadata blob', error);
        faces = {};
      }
    }

    const version = await loadVersion(userId);
    const checksum = generateChecksum(faces);
    
    const store: FaceStoreWithVersion = {
      faces,
      version: {
        ...version,
        checksum,
        lastModified: new Date().toISOString()
      }
    };

    // Update cache
    faceCache.set(userId, { data: store, timestamp: Date.now() });
    
    return store;
  }, { userId });
}

export async function saveFaceMetadata(userId: string, data: FaceMetadata): Promise<FaceStoreVersion> {
  const currentStore = await loadFaceStoreWithVersion(userId);
  const newVersion = currentStore.version.version + 1;
  const checksum = generateChecksum(data);
  
  const version: FaceStoreVersion = {
    version: newVersion,
    lastModified: new Date().toISOString(),
    checksum
  };

  // Atomic update: save both metadata and version
  await Promise.all([
    put(metadataPathFor(userId), JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
    saveVersion(userId, version)
  ]);

  // Update cache
  const newStore: FaceStoreWithVersion = { faces: data, version };
  faceCache.set(userId, { data: newStore, timestamp: Date.now() });

  return version;
}

export async function addFace(userId: string, name: string, relationship: string, imageUrl: string): Promise<FaceStoreVersion> {
  const currentFaces = await loadFaceMetadata(userId);
  
  const now = new Date().toISOString();
  const faceData: FaceData = {
    relationship,
    images: [imageUrl],
    createdAt: now,
    updatedAt: now
  };

  if (currentFaces[name]) {
    // Update existing face
    currentFaces[name] = {
      ...currentFaces[name],
      relationship,
      images: [imageUrl, ...currentFaces[name].images.filter(url => url !== imageUrl)],
      updatedAt: now
    };
  } else {
    // Add new face
    currentFaces[name] = faceData;
  }

  return await saveFaceMetadata(userId, currentFaces);
}

export async function removeFace(userId: string, name: string): Promise<FaceStoreVersion> {
  const currentFaces = await loadFaceMetadata(userId);
  
  if (!currentFaces[name]) {
    throw new Error(`Face '${name}' not found`);
  }

  // Delete associated images from blob storage
  const faceData = currentFaces[name];
  await Promise.all(
    faceData.images.map(async (imageUrl) => {
      try {
        // Extract blob URL from the full URL
        const url = new URL(imageUrl);
        const pathname = url.pathname;
        await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (error) {
        console.warn(`Failed to delete image ${imageUrl}:`, error);
      }
    })
  );

  // Remove from metadata
  delete currentFaces[name];
  
  return await saveFaceMetadata(userId, currentFaces);
}

export async function updateFaceRelationship(userId: string, name: string, relationship: string): Promise<FaceStoreVersion> {
  const currentFaces = await loadFaceMetadata(userId);
  
  if (!currentFaces[name]) {
    throw new Error(`Face '${name}' not found`);
  }

  currentFaces[name] = {
    ...currentFaces[name],
    relationship,
    updatedAt: new Date().toISOString()
  };

  return await saveFaceMetadata(userId, currentFaces);
}

export function invalidateCache(userId: string) {
  faceCache.delete(userId);
}

export function getCacheStats() {
  return {
    size: faceCache.size,
    entries: Array.from(faceCache.keys())
  };
}
