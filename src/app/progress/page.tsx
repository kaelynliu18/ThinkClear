"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Calendar, Target, Trophy } from "lucide-react";

interface ProgressData {
  date: string;
  correctCount: number;
  totalAttempts: number;
}

export default function ProgressPage() {
  const [dailyStats, setDailyStats] = useState<ProgressData[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    // Load progress data from localStorage
    const loadProgress = () => {
      const progressData = localStorage.getItem('memory-game-progress');
      if (progressData) {
        const parsed = JSON.parse(progressData);
        setDailyStats(parsed);
        
        // Calculate current streak
        let streak = 0;
        const today = new Date().toDateString();
        for (let i = parsed.length - 1; i >= 0; i--) {
          if (parsed[i].date === today || 
              new Date(parsed[i].date).getTime() === new Date(today).getTime() - (streak + 1) * 24 * 60 * 60 * 1000) {
            streak++;
          } else {
            break;
          }
        }
        setCurrentStreak(streak);
        
        // Find best score
        const best = Math.max(...parsed.map((p: ProgressData) => p.correctCount), 0);
        setBestScore(best);
      }
    };
    
    loadProgress();
  }, []);

  const getTodayStats = () => {
    const today = new Date().toDateString();
    return dailyStats.find(stat => stat.date === today) || { correctCount: 0, totalAttempts: 0 };
  };

  const getMonthlyStats = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentStats = dailyStats.filter(stat => new Date(stat.date) >= thirtyDaysAgo);
    
    const totalCorrect = recentStats.reduce((sum, stat) => sum + stat.correctCount, 0);
    const totalAttempts = recentStats.reduce((sum, stat) => sum + stat.totalAttempts, 0);
    const daysPlayed = recentStats.length;
    
    return { totalCorrect, totalAttempts, daysPlayed };
  };

  const todayStats = getTodayStats();
  const monthlyStats = getMonthlyStats();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e2f0ff] to-[#ffe5f0] p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-blue-700 drop-shadow-lg tracking-wide mb-4">Your Progress</h1>
          <p className="text-lg text-blue-500 italic">Track your memory game performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Today's Progress */}
          <div className="bg-white/90 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center mb-4">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-blue-700">Today</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Correct Matches:</span>
                <span className="font-bold text-blue-600">{todayStats.correctCount}/10</span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((todayStats.correctCount / 10) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-500">
                {todayStats.totalAttempts > 0 ? `${todayStats.totalAttempts} attempts today` : 'No attempts yet'}
              </div>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="bg-white/90 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-8 w-8 text-pink-500 mr-3" />
              <h2 className="text-2xl font-bold text-pink-600">This Month</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Correct:</span>
                <span className="font-bold text-pink-600">{monthlyStats.totalCorrect}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days Played:</span>
                <span className="font-bold text-pink-600">{monthlyStats.daysPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg per Day:</span>
                <span className="font-bold text-pink-600">
                  {monthlyStats.daysPlayed > 0 ? Math.round(monthlyStats.totalCorrect / monthlyStats.daysPlayed) : 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Streak */}
          <div className="bg-white/90 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center mb-4">
              <Target className="h-8 w-8 text-green-500 mr-3" />
              <h2 className="text-2xl font-bold text-green-600">Current Streak</h2>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">{currentStreak}</div>
              <div className="text-gray-600">days in a row</div>
            </div>
          </div>

          {/* Best Score */}
          <div className="bg-white/90 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center mb-4">
              <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
              <h2 className="text-2xl font-bold text-yellow-600">Best Score</h2>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-600 mb-2">{bestScore}</div>
              <div className="text-gray-600">correct matches</div>
            </div>
          </div>
        </div>

        {dailyStats.length === 0 && (
          <div className="text-center mt-8 text-blue-500">
            <p>No progress data yet. Play the Memory Game to start tracking!</p>
          </div>
        )}
      </div>
    </div>
  );
} 