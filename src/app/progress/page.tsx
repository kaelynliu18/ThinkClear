"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Calendar, Target, Users } from "lucide-react";

interface ProgressData {
  date: string;
  correctCount: number;
  totalAttempts: number;
}

interface FaceData {
  relationship: string;
  images: string[];
}

interface PeopleData {
  [key: string]: FaceData;
}

export default function ProgressPage() {
  const [dailyStats, setDailyStats] = useState<ProgressData[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [personAccuracy, setPersonAccuracy] = useState<Array<{name: string, accuracy: number, correct: number, total: number}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
    loadFacesAndAccuracy();
  }, []);

  const loadProgress = () => {
    // Load progress data from localStorage
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
    }
  };

  const loadFacesAndAccuracy = async () => {
    try {
      // Load faces from API
      const response = await fetch('/api/faces');
      const facesData: PeopleData = await response.json();
      const currentFaces = Object.keys(facesData);

      // Load accuracy data and filter to only current faces
      const accuracyData = localStorage.getItem('person-accuracy');
      if (accuracyData) {
        const parsed = JSON.parse(accuracyData);
        const filteredAccuracy = Object.entries(parsed)
          .filter(([name]) => currentFaces.includes(name))
          .map(([name, data]: [string, any]) => ({
            name,
            accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
            correct: data.correct,
            total: data.total,
          }))
          .sort((a, b) => b.accuracy - a.accuracy);
        
        setPersonAccuracy(filteredAccuracy);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load faces:', error);
      setLoading(false);
    }
  };

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

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-700 font-semibold">Loading progress data...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-start">
              {/* Left Column - Today, Monthly Stats, and Current Streak */}
              <div className="space-y-6">
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
              </div>

              {/* Right Column - Accuracy by Person */}
              <div className="bg-white/90 rounded-3xl shadow-2xl p-6">
                <div className="flex items-center mb-4">
                  <Users className="h-8 w-8 text-purple-500 mr-3" />
                  <h2 className="text-2xl font-bold text-purple-600">Accuracy by Person</h2>
                </div>
                <div className="space-y-4">
                  {personAccuracy.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      {dailyStats.length === 0 ? 
                        "No accuracy data yet. Play the Memory Game to see your performance by person!" :
                        "No faces in your gallery. Add faces to see accuracy data!"
                      }
                    </div>
                  ) : (
                    personAccuracy.map((person, index) => (
                      <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-700">{person.name}</span>
                          <span className="text-sm font-bold text-purple-600">{person.accuracy}%</span>
                        </div>
                        <div className="w-full bg-purple-100 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${person.accuracy}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {person.correct}/{person.total} correct
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {dailyStats.length === 0 && (
              <div className="text-center mt-8 text-blue-500">
                <p>No progress data yet. Play the Memory Game to start tracking!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 