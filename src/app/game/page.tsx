"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Award, BookOpen, Settings, Home } from "lucide-react";

const people = [
  { name: "Tanuj", relationship: "Your Son", img: "/tanuj.png" },
  { name: "Isaac", relationship: "Your Uncle", img: "/isaac.png" },
  { name: "Kaelyn", relationship: "Your Friend", img: "/kaelyn.png" },
  { name: "Vedant", relationship: "Your Brother", img: "/vedant.png" },
  { name: "Hangyul", relationship: "Your Cousin", img: "/hangyul.png" },
];

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function GamePage() {
  const router = useRouter();
  const [remainingPeople, setRemainingPeople] = useState(shuffleArray(people));
  const [currentPersonIndex, setCurrentPersonIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundCleared, setRoundCleared] = useState(false);
  const [madeMistake, setMadeMistake] = useState(false);

  useEffect(() => {
    generateRound();
  }, []);

  const generateRound = () => {
    let newRemaining = [...remainingPeople];

    // Reset list when all shown
    if (newRemaining.length === 0) {
      newRemaining = shuffleArray(people);
    }

    const currentPerson = newRemaining[0];
    newRemaining = newRemaining.slice(1);

    const options = shuffleArray(people.map((p) => p.name));

    setRemainingPeople(newRemaining);
    setCurrentPersonIndex(
      people.findIndex((p) => p.name === currentPerson.name)
    );
    setShuffledOptions(options);
    setSelected(null);
    setMessage("");
    setShowHint(false);
    setRoundCleared(false);
    setMadeMistake(false);
  };

  // Save progress to localStorage when correctCount changes
  useEffect(() => {
    if (correctCount > 0) {
      const today = new Date().toDateString();
      const existingProgress = localStorage.getItem('memory-game-progress');
      let progressData = existingProgress ? JSON.parse(existingProgress) : [];
      
      // Find today's entry or create new one
      let todayEntry = progressData.find((entry: any) => entry.date === today);
      if (!todayEntry) {
        todayEntry = { 
          date: today, 
          correctCount: 0, 
          totalAttempts: 0,
          personStats: {}
        };
        progressData.push(todayEntry);
      }
      
      // Update today's stats
      todayEntry.correctCount = Math.max(todayEntry.correctCount, correctCount);
      todayEntry.totalAttempts += 1;
      
      localStorage.setItem('memory-game-progress', JSON.stringify(progressData));
    }
  }, [correctCount]);

  // Save person-specific accuracy when a selection is made
  const savePersonAccuracy = (personName: string, isCorrect: boolean) => {
    const existingAccuracy = localStorage.getItem('person-accuracy');
    let accuracyData = existingAccuracy ? JSON.parse(existingAccuracy) : {};
    
    if (!accuracyData[personName]) {
      accuracyData[personName] = { correct: 0, total: 0 };
    }
    
    accuracyData[personName].total += 1;
    if (isCorrect) {
      accuracyData[personName].correct += 1;
    }
    
    localStorage.setItem('person-accuracy', JSON.stringify(accuracyData));
  };

  const handleSelection = (option: string) => {
    if (roundCleared) return;
    setSelected(option);

    const currentPerson = people[currentPersonIndex];
    const isCorrect = option === currentPerson.name;
    
    // Save person accuracy
    savePersonAccuracy(currentPerson.name, isCorrect);

    if (isCorrect) {
      if (!madeMistake) {
        setCorrectCount((prev) => prev + 1);
      }
      setMessage(
        `✅ This was ${currentPerson.name}, ${currentPerson.relationship}!`
      );
      setRoundCleared(true);
    } else {
      setMessage(`❌ No, this is not ${option}. Try again!`);
      setMadeMistake(true);
    }
  };

  const progress = Math.min((correctCount / 10) * 100, 100);

  return (
    <main className="bg-gradient-to-b from-blue-100 via-white to-pink-100 px-4 py-8 pb-4 flex flex-col items-center text-center min-h-screen overflow-auto">
      <div className="w-full max-w-md mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-blue-700 drop-shadow">Daily Goal</span>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200">{correctCount}/10</span>
          </div>
          <div className="w-full h-6 bg-blue-100 rounded-full shadow-inner border border-blue-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 transition-all duration-500 ease-in-out shadow"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Game Card */}
        <div className="bg-white/80 rounded-3xl shadow-2xl p-8 mb-8 flex flex-col items-center">
          {/* Title */}
          <h2 className="text-2xl font-extrabold text-blue-700 mb-2 drop-shadow">Match the Face</h2>
          <hr className="border-blue-700 border mb-4 w-2/3 mx-auto" />

          {/* Image + Hint */}
          <div className="bg-blue-600 text-white rounded-xl p-4 mb-4 shadow-lg w-full flex flex-col items-center">
            <h3 className="mb-2 text-lg font-semibold">Name The Person</h3>
            <Image
              src={people[currentPersonIndex].img}
              alt="person"
              width={220}
              height={280}
              className="rounded-lg mx-auto border-4 border-white shadow-lg"
            />
            <button
              onClick={() => setShowHint(true)}
              className="text-blue-100 underline mt-2 text-sm hover:text-blue-200"
            >
              Need a Hint?
            </button>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4 mb-4 w-full">
            {shuffledOptions.map((option, index) => (
              <button
                key={`${option}-${index}`}
                onClick={() => handleSelection(option)}
                className={`px-4 py-3 rounded-xl font-semibold text-base shadow transition-all duration-200 border-2
                  ${selected === option
                    ? option === people[currentPersonIndex].name
                      ? "bg-blue-600 text-white border-blue-700 scale-105"
                      : "bg-red-200 text-red-700 border-red-400 scale-105"
                    : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50 hover:scale-105"}
                `}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Hint Display */}
          {showHint && (
            <p className="text-sm text-blue-700 mb-2 italic bg-blue-100 rounded px-3 py-1 inline-block">Hint: {people[currentPersonIndex].relationship}</p>
          )}

          {/* Feedback Message */}
          <p
            className={`font-bold text-lg mb-3 transition-all duration-200
              ${message.startsWith("✅") ? "text-green-600" : message ? "text-red-600" : "text-blue-700"}
            `}
          >
            {message}
          </p>

          {/* Score and Next */}
          <div className="flex justify-between items-center w-full text-blue-700 font-medium border-t border-blue-200 pt-4 mt-2">
            <p>
              You have matched {correctCount} face{correctCount !== 1 ? "s" : ""}!
            </p>
            <button
              onClick={generateRound}
              className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-pink-400 text-white rounded-full font-semibold shadow hover:from-blue-600 hover:to-pink-500 transition-transform transform hover:scale-105"
            >
              Next Round →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      {/* Removed custom footer nav to use the shared layout's nav bar */}
    </main>
  );
}
