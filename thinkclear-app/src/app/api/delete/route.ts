import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { removeFace } from '../../../lib/faceStorage';
import { removeProgressForFace } from '../../../lib/progressStorage';
import { syncManager } from '../../../lib/syncManager';

export async function POST(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing face name' }, { status: 400 });
    }

    // Remove face from storage (this also deletes associated images)
    const version = await removeFace(userId, name);

    // Remove associated progress data
    await removeProgressForFace(userId, name);

    // Notify all connected clients about the deletion
    await syncManager.notifyFaceUpdate(userId, version, 'delete', name);

    return NextResponse.json({
      success: true,
      message: `Face '${name}' deleted successfully`,
      version
    });
  } catch (error) {
    console.error('Failed to delete face:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      error: 'Failed to delete face. Please try again.' 
    }, { status: 500 });
  }
}