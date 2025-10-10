import { list, put } from '@vercel/blob';

export type FaceMetadata = Record<string, { relationship: string; images: string[] }>;

const metadataPathFor = (userId: string) => `faces/${userId}/faces.json`;

async function fetchBlobContent(downloadUrl: string): Promise<string> {
  const res = await fetch(downloadUrl);
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
