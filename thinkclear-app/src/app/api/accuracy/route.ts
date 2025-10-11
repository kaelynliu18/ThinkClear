import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import {
  loadProgressData,
  saveProgressData,
  updateAccuracyStat,
} from '../../../lib/progressStorage';

export async function POST(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { label?: string; correct?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { label, correct } = body;
  if (!label || typeof correct !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const data = await loadProgressData(userId);
    const updated = updateAccuracyStat(data, label, correct);
    await saveProgressData(userId, updated);

    const stat = {
      label,
      type: 'face' as const,
      correct: updated.accuracy[label]?.correct ?? 0,
      total: updated.accuracy[label]?.total ?? 0,
    };

    return NextResponse.json({ stat });
  } catch (error) {
    console.error('Failed to record accuracy', error);
    return NextResponse.json({ error: 'Failed to record accuracy' }, { status: 500 });
  }
}

export async function GET() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await loadProgressData(userId);
    const stats = Object.entries(data.accuracy).map(([label, stat]) => ({
      label,
      type: 'face' as const,
      correct: stat.correct,
      total: stat.total,
    }));

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to load accuracy stats', error);
    return NextResponse.json({ error: 'Failed to load accuracy stats' }, { status: 500 });
  }
}
