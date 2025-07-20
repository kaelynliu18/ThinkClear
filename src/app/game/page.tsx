"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Award, BookOpen, Settings, Home, Users, Package, Shuffle } from "lucide-react";
import React from "react";

interface FaceData {
  relationship: string;
  images: string[];
}

interface PeopleData {
  [key: string]: FaceData;
}

interface GameItem {
  name: string;
  relationship: string;
  img: string;
  type: 'face' | 'object';
}

type GameMode = 'face' | 'object' | 'mixed';

// Sample objects for object mode (use emojis for guaranteed rendering)
const objects = [
  { name: "Apple", relationship: "Fruit", img: "🍎" },
  { name: "Book", relationship: "Reading Material", img: "📚" },
  { name: "Car", relationship: "Vehicle", img: "🚗" },
  { name: "Dog", relationship: "Pet", img: "🐕" },
  { name: "House", relationship: "Home", img: "🏠" },
  { name: "Tree", relationship: "Plant", img: "🌳" },
  { name: "Star", relationship: "Celestial", img: "⭐" },
  { name: "Heart", relationship: "Symbol", img: "❤️" },
];

// Add object descriptions
const objectDescriptions: Record<string, string> = {
  Apple: "An apple is a sweet fruit you can eat as a snack or in a pie.",
  Book: "A book is for reading and learning new things.",
  Car: "A car is how you can drive around fast.",
  Dog: "A dog is a loyal pet and a great companion.",
  House: "A house is where you live and feel safe.",
  Tree: "A tree gives shade and helps us breathe fresh air.",
  Star: "A star shines in the night sky and can guide you.",
  Heart: "A heart is a symbol of love and care.",
};

export default function GamePage() {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [people, setPeople] = useState<Array<{name: string, relationship: string, img: string}>>([]);
  const [gameItems, setGameItems] = useState<GameItem[]>([]);
  const [remainingItems, setRemainingItems] = useState<GameItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundCleared, setRoundCleared] = useState(false);
  const [madeMistake, setMadeMistake] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showObjectPopup, setShowObjectPopup] = useState(false);
  const [objectPopupText, setObjectPopupText] = useState("");

  useEffect(() => {
    loadFaces();
  }, []);

  const loadFaces = async () => {
    try {
      const response = await fetch('/api/faces');
      const data: PeopleData = await response.json();
      
      const peopleArray = Object.entries(data).map(([name, faceData]) => ({
        name,
        relationship: faceData.relationship,
        img: `/faces-data/${faceData.images[0]}` // Use the first image
      }));
      
      setPeople(peopleArray);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load faces:', error);
      setLoading(false);
    }
  };

  const selectMode = (mode: GameMode) => {
    let items: GameItem[] = [];
    if (mode === 'face') {
      items = people.map(p => ({ ...p, type: 'face' as const }));
    } else if (mode === 'object') {
      items = objects.map(o => ({ ...o, type: 'object' as const }));
    } else if (mode === 'mixed') {
      const faceItems = people.map(p => ({ ...p, type: 'face' as const }));
      const objectItems = objects.map(o => ({ ...o, type: 'object' as const }));
      items = [...faceItems, ...objectItems];
    }
    if (items.length < 4) {
      setGameMode(null);
      setGameItems([]);
      setShuffledOptions([]);
      setMessage('You need at least 4 items (faces or objects) to play this mode!');
      return;
    }
    setGameMode(mode);
    setGameItems(items);
    setRemainingItems(shuffleArray(items));
    setCorrectCount(0);
    setCurrentItemIndex(0);
    setShuffledOptions([]);
    setSelected(null);
    setMessage("");
    setShowHint(false);
    setRoundCleared(false);
    setMadeMistake(false);
  };

  useEffect(() => {
    if (gameItems.length > 0) {
      generateRound();
    }
  }, [gameItems]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const generateRound = () => {
    if (gameItems.length === 0) return;
    let newRemaining = [...remainingItems];
    if (newRemaining.length === 0) {
      newRemaining = shuffleArray(gameItems);
    }
    const currentItem = newRemaining[0];
    newRemaining = newRemaining.slice(1);
    // Always limit to 4 options: correct + up to 3 others
    let otherOptions = gameItems.filter((p) => p.name !== currentItem.name);
    otherOptions = shuffleArray(otherOptions).slice(0, 3);
    const options = shuffleArray([currentItem.name, ...otherOptions.map(p => p.name)]).slice(0, 4);
    setRemainingItems(newRemaining);
    setCurrentItemIndex(
      gameItems.findIndex((p) => p.name === currentItem.name)
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
    if (correctCount > 0 && gameMode) {
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
  }, [correctCount, gameMode]);

  // Save person accuracy when a selection is made
  const savePersonAccuracy = (itemName: string, isCorrect: boolean) => {
    const existingAccuracy = localStorage.getItem('person-accuracy');
    let accuracyData = existingAccuracy ? JSON.parse(existingAccuracy) : {};
    
    if (!accuracyData[itemName]) {
      accuracyData[itemName] = { correct: 0, total: 0 };
    }
    
    accuracyData[itemName].total += 1;
    if (isCorrect) {
      accuracyData[itemName].correct += 1;
    }
    
    localStorage.setItem('person-accuracy', JSON.stringify(accuracyData));
  };

  const handleSelection = (option: string) => {
    if (roundCleared) return;
    setSelected(option);

    const currentItem = gameItems[currentItemIndex];
    const isCorrect = option === currentItem.name;
    
    // Save person accuracy
    savePersonAccuracy(currentItem.name, isCorrect);

    if (isCorrect) {
      if (!madeMistake) {
        setCorrectCount((prev) => prev + 1);
      }
      setMessage(
        `✅ This was ${currentItem.name}, ${currentItem.relationship}!`
      );
      setRoundCleared(true);
      // Show popup for objects
      if (currentItem.type === 'object' && objectDescriptions[currentItem.name]) {
        setObjectPopupText(objectDescriptions[currentItem.name]);
        setShowObjectPopup(true);
      }
    } else {
      setMessage(`❌ No, this is not ${option}. Try again!`);
      setMadeMistake(true);
    }
  };

  const progress = Math.min((correctCount / 10) * 100, 100);

  const getModeIcon = (mode: GameMode) => {
    switch (mode) {
      case 'face': return <Users className="w-5 h-5" />;
      case 'object': return <Package className="w-5 h-5" />;
      case 'mixed': return <Shuffle className="w-5 h-5" />;
    }
  };

  const getModeTitle = (mode: GameMode) => {
    switch (mode) {
      case 'face': return 'Face Mode';
      case 'object': return 'Object Mode';
      case 'mixed': return 'Mixed Mode';
    }
  };

  return (
    <main className="bg-gradient-to-b from-blue-100 via-white to-pink-100 px-4 py-8 pb-4 flex flex-col items-center text-center min-h-screen overflow-auto">
      <div className="w-full max-w-md mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-700 font-semibold">Loading faces...</p>
          </div>
        ) : gameMode === null ? (
          <div className="text-center py-12">
            <div className="bg-white/80 rounded-3xl shadow-2xl p-8">
              <h2 className="text-2xl font-extrabold text-blue-700 mb-4">Select Game Mode</h2>
              <p className="text-gray-600 mb-8">Choose your preferred game mode:</p>
              
              <div className="space-y-4">
                <button
                  onClick={() => selectMode('face')}
                  disabled={people.length === 0}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-semibold shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Users className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Face Mode</div>
                    <div className="text-sm opacity-90">Match people from your gallery</div>
                  </div>
                </button>
                
                <button
                  onClick={() => selectMode('object')}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-semibold shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                >
                  <Package className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Object Mode</div>
                    <div className="text-sm opacity-90">Match common objects</div>
                  </div>
                </button>
                
                <button
                  onClick={() => selectMode('mixed')}
                  disabled={people.length === 0}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Shuffle className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Mixed Mode</div>
                    <div className="text-sm opacity-90">Match faces and objects</div>
                  </div>
                </button>
              </div>
              
              {people.length === 0 && (
                <div className="mt-4 text-sm text-red-500">
                  Add faces to your gallery to play Face Mode and Mixed Mode
                </div>
              )}
            </div>
          </div>
        ) : gameItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/80 rounded-3xl shadow-2xl p-8">
              <h2 className="text-2xl font-extrabold text-blue-700 mb-4">No Items Available</h2>
              <p className="text-gray-600 mb-6">Add some items to your gallery first to play the memory game!</p>
              <button
                onClick={() => router.push('/faces')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-pink-400 text-white rounded-full font-semibold shadow hover:from-blue-600 hover:to-pink-500 transition-transform transform hover:scale-105"
              >
                Go to Faces Gallery
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Display */}
            <div className="mb-4 text-center">
              <div className="inline-flex items-center bg-white/90 px-4 py-2 rounded-full shadow-lg">
                {getModeIcon(gameMode)}
                <span className="ml-2 font-semibold text-blue-700">{getModeTitle(gameMode)}</span>
                <button
                  onClick={() => setGameMode(null)}
                  className="ml-3 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

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
              <h2 className="text-2xl font-extrabold text-blue-700 mb-2 drop-shadow">
                Match the {gameItems[currentItemIndex]?.type === 'face' ? 'Face' : 'Object'}
              </h2>
              <hr className="border-blue-700 border mb-4 w-2/3 mx-auto" />

              {/* Image + Hint */}
              <div className="bg-blue-600 text-white rounded-xl p-4 mb-4 shadow-lg w-full flex flex-col items-center">
                <h3 className="mb-2 text-lg font-semibold">
                  Name The {gameItems[currentItemIndex]?.type === 'face' ? 'Person' : 'Object'}
                </h3>
                {gameItems[currentItemIndex]?.type === 'face' ? (
                  <Image
                    src={gameItems[currentItemIndex].img}
                    alt="person"
                    width={220}
                    height={280}
                    className="rounded-lg mx-auto border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-[220px] h-[280px] bg-white rounded-lg border-4 border-white shadow-lg flex items-center justify-center">
                    <span className="text-8xl">{gameItems[currentItemIndex].img}</span>
                  </div>
                )}
                <button
                  onClick={() => setShowHint(true)}
                  className="text-blue-100 underline mt-2 text-sm hover:text-blue-200"
                >
                  Need a Hint?
                </button>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4 mb-4 w-full">
                {Array.isArray(shuffledOptions) && shuffledOptions.slice(0, 4).map((option, index) => {
                  console.log('Rendering option:', option);
                  return (
                    <button
                      key={`${option}-${index}`}
                      onClick={() => handleSelection(option)}
                      className={`px-4 py-3 rounded-xl font-semibold text-base shadow transition-all duration-200 border-2
                        ${selected === option
                          ? option === gameItems[currentItemIndex].name
                            ? "bg-blue-600 text-white border-blue-700 scale-105"
                            : "bg-red-200 text-red-700 border-red-400 scale-105"
                          : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50 hover:scale-105"}
                      `}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Hint Display */}
              {showHint && (
                <p className="text-sm text-blue-700 mb-2 italic bg-blue-100 rounded px-3 py-1 inline-block">Hint: {gameItems[currentItemIndex].relationship}</p>
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
                  You have matched {correctCount} item{correctCount !== 1 ? "s" : ""}!
                </p>
                <button
                  onClick={generateRound}
                  className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-pink-400 text-white rounded-full font-semibold shadow hover:from-blue-600 hover:to-pink-500 transition-transform transform hover:scale-105"
                >
                  Next Round →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      {/* Removed custom footer nav to use the shared layout's nav bar */}
      {message && gameMode === null && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-center font-semibold">
          {message}
        </div>
      )}
      {showObjectPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-xs w-full text-center relative">
            <button
              onClick={() => setShowObjectPopup(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
            <div className="mb-4 text-4xl">{gameItems[currentItemIndex].img}</div>
            <h3 className="text-xl font-bold mb-2">{gameItems[currentItemIndex].name}</h3>
            <p className="text-gray-700 text-base">{objectPopupText}</p>
          </div>
        </div>
      )}
    </main>
  );
}
