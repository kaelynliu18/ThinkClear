import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { gameEngine, GameSession, GameRound, GameResult } from '../../../lib/gameEngine';
import { loadFaceMetadata } from '../../../lib/faceStorage';
import { appendMultipleProgressEntries } from '../../../lib/progressStorage';
import { withRetry, retryStrategies } from '../../../lib/retry';
import { perf } from '../../../lib/performance';

export async function POST(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, sessionId, difficulty, answer, responseTime } = body;

    switch (action) {
      case 'create':
        return await createGameSession(userId, difficulty);
      
      case 'get_round':
        return await getGameRound(sessionId);
      
      case 'submit_answer':
        return await submitAnswer(sessionId, answer, responseTime);
      
      case 'end_session':
        return await endGameSession(sessionId, userId);
      
      case 'get_stats':
        return await getSessionStats(sessionId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Game API error:', error);
    return NextResponse.json({ 
      error: 'Game operation failed' 
    }, { status: 500 });
  }
}

async function createGameSession(userId: string, difficulty: 'easy' | 'medium' | 'hard' = 'easy') {
  return await perf.measureAsync('create_game_session', async () => {
    const faces = await retryStrategies.apiCall(
      () => loadFaceMetadata(userId)
    );

    const faceEntries = Object.entries(faces);
    if (faceEntries.length < 6) {
      return NextResponse.json({ 
        error: 'Need at least 6 faces to start a game' 
      }, { status: 400 });
    }

    const session = gameEngine.createSession(userId, faces, difficulty);
    
    const res = NextResponse.json({
      sessionId: session.id,
      totalRounds: session.totalRounds,
      difficulty: session.difficulty,
      faces: session.faces.map(f => ({
        name: f.name,
        relationship: f.relationship
      }))
    });
    
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }, { userId, difficulty });
}

async function getGameRound(sessionId: string) {
  return await perf.measureAsync('get_game_round', async () => {
    const round = gameEngine.generateRound(sessionId);
    
    if (!round) {
      return NextResponse.json({ 
        error: 'No more rounds available' 
      }, { status: 404 });
    }

    const res = NextResponse.json({
      round: round.question,
      options: round.options,
      timeLimit: round.timeLimit,
      faceImage: round.face.imageUrl
    });
    
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }, { sessionId });
}

async function submitAnswer(sessionId: string, answer: string, responseTime: number) {
  return await perf.measureAsync('submit_answer', async () => {
    const result = gameEngine.submitAnswer(sessionId, answer, responseTime);
    
    if (!result) {
      return NextResponse.json({ 
        error: 'Invalid session or round' 
      }, { status: 404 });
    }

    const session = gameEngine.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    // Check if session is complete
    const isComplete = session.currentRound >= session.totalRounds;
    
    const res = NextResponse.json({
      correct: result.correct,
      score: session.score,
      streak: session.streak,
      maxStreak: session.maxStreak,
      isComplete,
      nextRound: !isComplete ? session.currentRound + 1 : null
    });
    
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }, { sessionId, answer, responseTime });
}

async function endGameSession(sessionId: string, userId: string) {
  return await perf.measureAsync('end_game_session', async () => {
    const session = gameEngine.endSession(sessionId);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    if (session.userId !== userId) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 403 });
    }

    // Convert session results to progress entries
    const progressEntries = session.faces
      .filter(face => face.totalCount > 0)
      .map(face => ({
        id: `game_${sessionId}_${face.name}`,
        face: face.name,
        correct: face.correctCount,
        total: face.totalCount,
        playedAt: session.startTime
      }));

    // Save progress data
    if (progressEntries.length > 0) {
      await retryStrategies.apiCall(
        () => appendMultipleProgressEntries(userId, progressEntries)
      );
    }

    const stats = gameEngine.getSessionStats(sessionId);
    
    const res = NextResponse.json({
      sessionId: session.id,
      finalScore: session.score,
      totalRounds: session.totalRounds,
      accuracy: stats?.accuracy || 0,
      maxStreak: session.maxStreak,
      duration: new Date().getTime() - new Date(session.startTime).getTime(),
      faceStats: stats?.faces || []
    });
    
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }, { sessionId, userId });
}

async function getSessionStats(sessionId: string) {
  return await perf.measureAsync('get_session_stats', async () => {
    const stats = gameEngine.getSessionStats(sessionId);
    
    if (!stats) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    const res = NextResponse.json(stats);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }, { sessionId });
}

export async function GET(req: Request) {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');

  if (sessionId) {
    // Get specific session
    const session = gameEngine.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const res = NextResponse.json({
      sessionId: session.id,
      currentRound: session.currentRound,
      totalRounds: session.totalRounds,
      score: session.score,
      streak: session.streak,
      maxStreak: session.maxStreak,
      difficulty: session.difficulty,
      startTime: session.startTime,
      lastActivity: session.lastActivity
    });
    
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } else {
    // Get user's active sessions
    const sessions = gameEngine.getUserSessions(userId);
    
    const res = NextResponse.json({
      sessions: sessions.map(session => ({
        sessionId: session.id,
        currentRound: session.currentRound,
        totalRounds: session.totalRounds,
        score: session.score,
        streak: session.streak,
        difficulty: session.difficulty,
        startTime: session.startTime,
        lastActivity: session.lastActivity
      }))
    });
    
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }
}
