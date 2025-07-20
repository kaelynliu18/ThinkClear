"use client";

import { useState } from "react";

export default function JournalPage() {
  const [entry, setEntry] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (entry.trim()) {
      // In a real app, you'd save to a database
      localStorage.setItem(`journal-${Date.now()}`, entry);
      setEntry("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
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

        <div className="mt-8 text-center">
          <p className="text-sm text-blue-500">
            Your journal entries are saved locally on your device
          </p>
        </div>
      </div>
    </div>
  );
} 