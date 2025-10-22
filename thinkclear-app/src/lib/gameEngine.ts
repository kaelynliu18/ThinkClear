import { FaceData } from './faceStorage';
import { StoredProgressEntry } from './progressStorage';
import { perf } from './performance';

export interface GameSession {
  id: string;
  userId: string;
  faces: GameFace[];
  currentRound: number;
  totalRounds: number;
  score: number;
  startTime: string;
  lastActivity: string;
  difficulty: 'easy' | 'medium' | 'hard';
  streak: number;
  maxStreak: number;
}

export interface GameFace {
  name: string;
  relationship: string;
  imageUrl: string;
  correctCount: number;
  totalCount: number;
  lastPlayed?: string;
}

export interface GameRound {
  question: string;
  correctAnswer: string;
  options: string[];
  correctIndex: number;
  face: GameFace;
  timeLimit?: number;
}

export interface GameResult {
  sessionId: string;
  round: number;
  face: string;
  correct: boolean;
  responseTime: number;
  difficulty: string;
  timestamp: string;
}

class GameEngine {
  private activeSessions = new Map<string, GameSession>();
  private readonly MIN_FACES_FOR_GAME = 6;
  private readonly MAX_ROUNDS = 20;
  private readonly ROUND_TIME_LIMITS = {
    easy: 10000,    // 10 seconds
    medium: 7000,   // 7 seconds
    hard: 5000      // 5 seconds
  };

  createSession(
    userId: string, 
    faces: Record<string, FaceData>, 
    difficulty: 'easy' | 'medium' | 'hard' = 'easy'
  ): GameSession {
    const faceEntries = Object.entries(faces);
    
    if (faceEntries.length < this.MIN_FACES_FOR_GAME) {
      throw new Error(`Need at least ${this.MIN_FACES_FOR_GAME} faces to start a game`);
    }

    const gameFaces: GameFace[] = faceEntries.map(([name, data]) => ({
      name,
      relationship: data.relationship,
      imageUrl: data.images[0], // Use first image
      correctCount: 0,
      totalCount: 0
    }));

    const session: GameSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      faces: gameFaces,
      currentRound: 0,
      totalRounds: Math.min(faceEntries.length * 2, this.MAX_ROUNDS),
      score: 0,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      difficulty,
      streak: 0,
      maxStreak: 0
    };

    this.activeSessions.set(session.id, session);
    return session;
  }

  generateRound(sessionId: string): GameRound | null {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.currentRound >= session.totalRounds) {
      return null;
    }

    return perf.measure('generate_round', () => {
      // Select a random face for this round
      const face = session.faces[Math.floor(Math.random() * session.faces.length)];
      
      // Generate wrong answers (other faces)
      const wrongAnswers = session.faces
        .filter(f => f.name !== face.name)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2); // 2 wrong answers for 3 total options

      const options = [face.name, ...wrongAnswers.map(f => f.name)]
        .sort(() => Math.random() - 0.5);

      const correctIndex = options.indexOf(face.name);

      // Generate question based on difficulty
      const questions = this.generateQuestions(face, session.difficulty);
      const question = questions[Math.floor(Math.random() * questions.length)];

      session.currentRound++;
      session.lastActivity = new Date().toISOString();

      return {
        question,
        correctAnswer: face.name,
        options,
        correctIndex,
        face,
        timeLimit: this.ROUND_TIME_LIMITS[session.difficulty]
      };
    }, { sessionId, difficulty: session.difficulty });
  }

  private generateQuestions(face: GameFace, difficulty: string): string[] {
    const baseQuestions = [
      `Who is this person?`,
      `What is this person's name?`,
      `Can you identify this person?`
    ];

    if (difficulty === 'easy') {
      return baseQuestions;
    }

    const relationshipQuestions = [
      `What is ${face.name}'s relationship to you?`,
      `How do you know ${face.name}?`,
      `What is ${face.name}'s role?`
    ];

    if (difficulty === 'medium') {
      return [...baseQuestions, ...relationshipQuestions];
    }

    // Hard difficulty
    const contextQuestions = [
      `Based on the image, who is this person?`,
      `Identify this person from your contacts`,
      `Who is this familiar face?`
    ];

    return [...baseQuestions, ...relationshipQuestions, ...contextQuestions];
  }

  submitAnswer(
    sessionId: string, 
    answer: string, 
    responseTime: number
  ): GameResult | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    return perf.measure('submit_answer', () => {
      const currentRound = session.currentRound - 1;
      const face = session.faces.find(f => f.name === answer);
      const isCorrect = face !== undefined;

      if (isCorrect) {
        session.score++;
        session.streak++;
        session.maxStreak = Math.max(session.maxStreak, session.streak);
        if (face) {
          face.correctCount++;
        }
      } else {
        session.streak = 0;
      }

      if (face) {
        face.totalCount++;
      }

      const result: GameResult = {
        sessionId,
        round: currentRound,
        face: answer,
        correct: isCorrect,
        responseTime,
        difficulty: session.difficulty,
        timestamp: new Date().toISOString()
      };

      session.lastActivity = new Date().toISOString();
      return result;
    }, { sessionId, answer });
  }

  getSession(sessionId: string): GameSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  endSession(sessionId: string): GameSession | null {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.activeSessions.delete(sessionId);
      return session;
    }
    return null;
  }

  getSessionStats(sessionId: string): {
    accuracy: number;
    averageResponseTime: number;
    streak: number;
    maxStreak: number;
    faces: Array<{
      name: string;
      accuracy: number;
      attempts: number;
    }>;
  } | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const totalAttempts = session.faces.reduce((sum, face) => sum + face.totalCount, 0);
    const totalCorrect = session.faces.reduce((sum, face) => sum + face.correctCount, 0);
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    const faces = session.faces.map(face => ({
      name: face.name,
      accuracy: face.totalCount > 0 ? (face.correctCount / face.totalCount) * 100 : 0,
      attempts: face.totalCount
    }));

    return {
      accuracy,
      averageResponseTime: 0, // Would need to track this separately
      streak: session.streak,
      maxStreak: session.maxStreak,
      faces
    };
  }

  // Adaptive difficulty based on performance
  adjustDifficulty(sessionId: string): 'easy' | 'medium' | 'hard' {
    const session = this.activeSessions.get(sessionId);
    if (!session) return 'easy';

    const stats = this.getSessionStats(sessionId);
    if (!stats) return 'easy';

    if (stats.accuracy >= 80 && session.streak >= 5) {
      return 'hard';
    } else if (stats.accuracy >= 60 && session.streak >= 3) {
      return 'medium';
    } else {
      return 'easy';
    }
  }

  // Clean up old sessions
  cleanupOldSessions(maxAgeMs: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.activeSessions) {
      const sessionAge = now - new Date(session.lastActivity).getTime();
      if (sessionAge > maxAgeMs) {
        this.activeSessions.delete(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Get all active sessions for a user
  getUserSessions(userId: string): GameSession[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId);
  }

  // Batch submit multiple results (for offline sync)
  batchSubmitResults(results: GameResult[]): void {
    const resultsBySession = new Map<string, GameResult[]>();
    
    // Group results by session
    results.forEach(result => {
      if (!resultsBySession.has(result.sessionId)) {
        resultsBySession.set(result.sessionId, []);
      }
      resultsBySession.get(result.sessionId)!.push(result);
    });

    // Process each session's results
    resultsBySession.forEach((sessionResults, sessionId) => {
      const session = this.activeSessions.get(sessionId);
      if (!session) return;

      sessionResults.forEach(result => {
        const face = session.faces.find(f => f.name === result.face);
        if (face) {
          if (result.correct) {
            face.correctCount++;
            session.score++;
          }
          face.totalCount++;
        }
      });

      session.lastActivity = new Date().toISOString();
    });
  }
}

export const gameEngine = new GameEngine();

// Auto-cleanup every 5 minutes
setInterval(() => {
  const cleaned = gameEngine.cleanupOldSessions();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} old game sessions`);
  }
}, 5 * 60 * 1000);
