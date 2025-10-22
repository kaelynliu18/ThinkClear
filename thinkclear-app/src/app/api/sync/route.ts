import { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { handleSSERequest } from '../../../lib/syncManager';

export async function GET(req: NextRequest) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    return await handleSSERequest(req, userId);
  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
