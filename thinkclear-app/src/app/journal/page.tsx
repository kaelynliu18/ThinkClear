"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, X } from "lucide-react";

interface JournalEntry {
  id: string;
  content: string;
  date: string;
  timestamp: number;
}

export default function JournalPage() {
  const [entry, setEntry] = useState("");
  const [saved, setSaved] = useState(false);
  const [showPastEntries, setShowPastEntries] = useState(false);
  const [pastEntries, setPastEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    loadPastEntries();
  }, []);

  const loadPastEntries = () => {
    const entries: JournalEntry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('journal-')) {
        const content = localStorage.getItem(key);
        const timestamp = parseInt(key.replace('journal-', ''));
        const date = new Date(timestamp).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        entries.push({
          id: key,
          content: content || '',
          date,
          timestamp
        });
      }
    }
    // Sort by timestamp (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);
    setPastEntries(entries);
  };

  const handleSave = () => {
    if (entry.trim()) {
      const timestamp = Date.now();
      localStorage.setItem(`journal-${timestamp}`, entry);
      setEntry("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadPastEntries(); // Refresh the list
    }
  };

  const deleteEntry = (id: string) => {
    localStorage.removeItem(id);
    loadPastEntries(); // Refresh the list
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e2f0ff] to-[#ffe5f0] p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-blue-700 drop-shadow-lg tracking-wide mb-4">Daily Journal</h1>
          <p className="text-lg text-blue-500 italic">Record your thoughts and memories</p>
        </div>

        <div className="bg-white/90 rounded-3xl shadow-2xl p-8">
          <div className="mb-6">
            <label className="block text-lg font-bold text-blue-700 mb-3">Today's Entry</label>
            <textarea
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="Write about your day, thoughts, or memories..."
              className="w-full h-64 p-4 border border-blue-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {entry.length} characters
            </div>
            <button
              onClick={handleSave}
              disabled={!entry.trim()}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-pink-400 text-white text-lg font-semibold rounded-full shadow-lg hover:from-blue-600 hover:to-pink-500 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saved ? "✓ Saved!" : "Save Entry"}
            </button>
          </div>
        </div>

        {/* View Past Entries Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowPastEntries(!showPastEntries)}
            className="px-6 py-3 bg-white/90 text-blue-600 border-2 border-blue-200 rounded-full font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-lg"
          >
            <Calendar className="inline-block w-5 h-5 mr-2" />
            {showPastEntries ? "Hide Past Entries" : `View Past Entries (${pastEntries.length})`}
          </button>
        </div>

        {/* Past Entries Section */}
        {showPastEntries && (
          <div className="mt-6 bg-white/90 rounded-3xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-4 flex items-center">
              <Clock className="w-6 h-6 mr-2" />
              Past Entries
            </h2>
            
            {pastEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No past entries yet. Start writing to see them here!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {pastEntries.map((entry) => (
                  <div key={entry.id} className="border border-blue-100 rounded-2xl p-4 bg-blue-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center text-sm text-blue-600 font-medium">
                        <Calendar className="w-4 h-4 mr-1" />
                        {entry.date}
                      </div>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete entry"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
} 