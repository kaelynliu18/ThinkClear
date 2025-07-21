"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Award, BookOpen, Settings, Home, Users, Package, Shuffle } from "lucide-react";

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

// Sample objects for object mode
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
const objectDescriptions: { [key: string]: string } = {
  Apple: "Apples are sweet, crunchy fruits that make a great snack or pie.",
  Book: "Books let you explore new worlds, learn, and get lost in stories.",
  Car: "Cars help you get from place to place quickly and comfortably.",
  Dog: "Dogs are loyal friends who love to play and keep you company.",
  House: "A house is where you live, relax, and make memories with family.",
  Tree: "Trees give us shade, clean air, and a place to climb or rest under.",
  Star: "Stars light up the night sky and inspire wishes and dreams.",
  Heart: "A heart is a symbol of love, care, and all the warm feelings inside."
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
    setGameMode(mode);
    
    // Prepare game items based on mode
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

    // Reset list when all shown
    if (newRemaining.length === 0) {
      newRemaining = shuffleArray(gameItems);
    }

    const currentItem = newRemaining[0];
    newRemaining = newRemaining.slice(1);

    // Get 3 random incorrect options
    const incorrectOptions = shuffleArray(gameItems.filter((p) => p.name !== currentItem.name)).slice(0, 3);
    // Combine with correct answer and shuffle
    const options = shuffleArray([currentItem.name, ...incorrectOptions.map((p) => p.name)]);

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
        currentItem.type === 'object' 
          ? `✅ This was ${currentItem.name}!`
          : `✅ This was ${currentItem.name}, ${currentItem.relationship}!`
      );
      setRoundCleared(true);
      // Show popup if object
      if (currentItem.type === 'object') {
        setObjectPopupText(objectDescriptions[currentItem.name] || "No description available.");
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
      {/* Object Description Popup */}
      {showObjectPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xs w-full text-center relative animate-fade-in">
            <p className="text-gray-700 mb-4">{objectPopupText}</p>
            <button
              onClick={() => setShowObjectPopup(false)}
              className="mt-2 px-6 py-2 bg-blue-500 text-white rounded-full font-semibold shadow hover:bg-blue-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="w-full max-w-md mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-700 font-semibold">Loading faces...</p>
          </div>
        ) : gameMode === null ? (
          <div className="text-center py-12">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
              <h2 className="text-3xl font-extrabold text-blue-700 mb-2 drop-shadow-lg">Select Game Mode</h2>
              <p className="text-gray-600 mb-8 text-lg">Choose your preferred game mode:</p>
              
              <div className="space-y-6">
                <button
                  onClick={() => selectMode('face')}
                  disabled={people.length === 0}
                  className="group w-full relative overflow-hidden px-8 py-6 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 text-white rounded-3xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <div className="relative flex items-center justify-center">
                    <div className="bg-white/20 rounded-full p-3 mr-4 backdrop-blur-sm">
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-bold mb-1">Face Mode</div>
                      <div className="text-blue-100 text-sm">Match people from your gallery</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => selectMode('object')}
                  className="group w-full relative overflow-hidden px-8 py-6 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white rounded-3xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:from-emerald-500 hover:via-emerald-600 hover:to-emerald-700"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <div className="relative flex items-center justify-center">
                    <div className="bg-white/20 rounded-full p-3 mr-4 backdrop-blur-sm">
                      <Package className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-bold mb-1">Object Mode</div>
                      <div className="text-emerald-100 text-sm">Match common objects</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => selectMode('mixed')}
                  disabled={people.length === 0}
                  className="group w-full relative overflow-hidden px-8 py-6 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 text-white rounded-3xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:from-purple-500 hover:via-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <div className="relative flex items-center justify-center">
                    <div className="bg-white/20 rounded-full p-3 mr-4 backdrop-blur-sm">
                      <Shuffle className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-bold mb-1">Mixed Mode</div>
                      <div className="text-purple-100 text-sm">Match faces and objects</div>
                    </div>
                  </div>
                </button>
              </div>
              
              {people.length === 0 && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="flex items-center text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                    <span className="text-sm font-medium">Add faces to your gallery to play Face Mode and Mixed Mode</span>
                  </div>
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
                {shuffledOptions.map((option, index) => (
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
                ))}
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
    </main>
  );
}
