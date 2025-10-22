import { NextResponse } from 'next/server';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { currentUser } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { addFace } from '../../../lib/faceStorage';
import { syncManager } from '../../../lib/syncManager';

export async function POST(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string;
  const relationship = formData.get('relationship') as string;

  if (!file || !name || !relationship) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ 
      error: 'Invalid file type. Only JPEG, PNG, and HEIC files are allowed.' 
    }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  let finalBuffer: Buffer = Buffer.from(bytes);
  let finalExt = file.name.split('.').pop()?.toLowerCase() || 'png';

  // HEIC/HEIF conversion with retry logic
  if (['heic', 'heif'].includes(finalExt)) {
    try {
      const converted = await heicConvert({
        buffer: finalBuffer,
        format: 'JPEG',
        quality: 1,
      });
      finalBuffer = Buffer.from(converted);
      finalExt = 'jpg';
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      return NextResponse.json({ error: 'HEIC conversion failed. Please try a different image.' }, { status: 500 });
    }
  }

  // Image processing with error handling
  try {
    finalBuffer = await sharp(finalBuffer)
      .rotate() // Auto-rotate based on EXIF
      .resize(800, 800, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 90,
        progressive: true 
      })
      .toBuffer();
    finalExt = 'jpg';
  } catch (error) {
    console.error('Image processing failed:', error);
    return NextResponse.json({ error: 'Image processing failed. Please try a different image.' }, { status: 500 });
  }

  const safeName = name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase();
  const fileName = `${safeName}_${Date.now()}.${finalExt}`;
  const imagePath = `faces/${userId}/images/${fileName}`;

  try {
    // Upload to blob storage with retry logic
    let uploadAttempts = 0;
    const maxUploadAttempts = 3;
    let uploadResult;

    while (uploadAttempts < maxUploadAttempts) {
      try {
        uploadResult = await put(imagePath, finalBuffer, {
          access: 'public',
          contentType: 'image/jpeg',
          addRandomSuffix: false,
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        break;
      } catch (error) {
        uploadAttempts++;
        if (uploadAttempts >= maxUploadAttempts) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, uploadAttempts) * 1000));
      }
    }

    if (!uploadResult?.url) {
      throw new Error('Upload failed - no URL returned');
    }

    // Add face to storage with versioning
    const version = await addFace(userId, name, relationship, uploadResult.url);

    // Notify all connected clients about the update
    await syncManager.notifyFaceUpdate(userId, version, 'add', name);

    return NextResponse.json({
      message: 'Upload successful',
      face: {
        name,
        relationship,
        imageUrl: uploadResult.url,
      },
      version,
    });
  } catch (error) {
    console.error('Failed to upload face image:', error);
    
    // Clean up any partial uploads
    try {
      await put(imagePath, Buffer.alloc(0), {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch (cleanupError) {
      console.warn('Failed to cleanup partial upload:', cleanupError);
    }

    return NextResponse.json({ 
      error: 'Failed to store face image. Please try again.' 
    }, { status: 500 });
  }
}
