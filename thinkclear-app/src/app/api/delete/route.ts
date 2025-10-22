import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { removeFace } from '../../../lib/faceStorage';
import { removeProgressForFace } from '../../../lib/progressStorage';

export async function DELETE(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name } = body;
  if (!name) {
    return NextResponse.json({ error: 'Missing face name' }, { status: 400 });
  }

  try {
    // Use the new removeFace function for atomic updates
    const updatedFaces = await removeFace(userId, name);
    
    // Also remove from progress data
    await removeProgressForFace(userId, name);

    return NextResponse.json({ 
      message: 'Delete successful',
      faces: updatedFaces // Return the updated faces for immediate UI update
    });
  } catch (error) {
    console.error('Failed to delete face', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Face not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Failed to delete face' }, { status: 500 });
  }
}
