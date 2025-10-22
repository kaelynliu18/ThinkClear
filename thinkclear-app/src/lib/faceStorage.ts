import { list, put, del } from '@vercel/blob';

export interface FaceData {
  relationship: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export type FaceMetadata = Record<string, FaceData>;

const metadataPathFor = (userId: string) => `faces/${userId}/faces.json`;

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

export async function loadFaceMetadata(userId: string): Promise<FaceMetadata> {
  const { blobs } = await list({
    prefix: metadataPathFor(userId),
    limit: 1,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (blobs.length === 0) {
    return {};
  }
  try {
    const jsonString = await fetchBlobContent(blobs[0].downloadUrl ?? blobs[0].url);
    return JSON.parse(jsonString) as FaceMetadata;
  } catch (error) {
    console.warn('Failed to read metadata blob', error);
    return {};
  }
}

export async function saveFaceMetadata(userId: string, data: FaceMetadata) {
  await put(metadataPathFor(userId), JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export async function addFace(userId: string, name: string, relationship: string, imageUrl: string): Promise<FaceMetadata> {
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

  await saveFaceMetadata(userId, currentFaces);
  return currentFaces;
}

export async function removeFace(userId: string, name: string): Promise<FaceMetadata> {
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
  
  await saveFaceMetadata(userId, currentFaces);
  return currentFaces;
}
