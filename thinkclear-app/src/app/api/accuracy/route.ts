import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getAccuracyStat, loadProgressData, saveProgressData } from '../../../lib/progressStorage';

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
    const statData = getAccuracyStat(data, label);

    // No mutation occurs here because accuracy is derived from entries.
    await saveProgressData(userId, data);

    const res = NextResponse.json({
      stat: {
        label: statData.label,
        type: 'face' as const,
        correct: statData.correct,
        total: statData.total,
      },
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    console.error('Failed to load accuracy stats', error);
    return NextResponse.json({ error: 'Failed to load accuracy stats' }, { status: 500 });
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
    const stats = Object.values(data.accuracy).map((stat) => ({
      label: stat.label,
      type: 'face' as const,
      correct: stat.correct,
      total: stat.total,
    }));

    const res = NextResponse.json({ stats });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    console.error('Failed to load accuracy stats', error);
    return NextResponse.json({ error: 'Failed to load accuracy stats' }, { status: 500 });
  }
}
