"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

interface FaceData {
  relationship: string;
  images: string[];
}

type PeopleData = Record<string, FaceData>;

interface GameItem {
  name: string;
  relationship: string;
  img: string;
}

export default function GamePage() {
  const router = useRouter();
  const [people, setPeople] = useState<GameItem[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
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

  useEffect(() => {
    void loadFaces();
  }, []);

  const loadFaces = async () => {
    try {
      const response = await fetch("/api/faces", {
        credentials: "include",
      });
      const data: PeopleData | { error?: string } = await response.json();

      if (!response.ok || !data || typeof data !== "object" || Array.isArray(data)) {
        console.error("Failed to load faces:", (data as { error?: string })?.error);
        setPeople([]);
        setLoading(false);
        return;
      }

      const peopleArray = Object.entries(data as PeopleData)
        .filter(([, value]) => value.images.length > 0)
        .map(([name, faceData]) => ({
          name,
          relationship: faceData.relationship,
          img: `/api/face-image?path=${encodeURIComponent(faceData.images[0])}`,
        }));

      setPeople(peopleArray);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load faces:", error);
      setPeople([]);
      setLoading(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const startGame = () => {
    const items = people.map((person) => ({ ...person }));
    setGameItems(items);
    setRemainingItems(shuffleArray(items));
    setGameStarted(true);
    setCorrectCount(0);
    setCurrentItemIndex(0);
    setShuffledOptions([]);
    setSelected(null);
    setMessage("");
    setShowHint(false);
    setRoundCleared(false);
    setMadeMistake(false);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameItems([]);
    setRemainingItems([]);
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

  const generateRound = () => {
    if (gameItems.length === 0) return;

    let newRemaining = [...remainingItems];
    if (newRemaining.length === 0) {
      newRemaining = shuffleArray(gameItems);
    }

    const currentItem = newRemaining[0];
    if (!currentItem) return;

    newRemaining = newRemaining.slice(1);

    const incorrectOptions = shuffleArray(
      gameItems.filter((item) => item.name !== currentItem.name)
    ).slice(0, 3);

    const options = shuffleArray([
      currentItem.name,
      ...incorrectOptions.map((item) => item.name),
    ]);

    setRemainingItems(newRemaining);
    setCurrentItemIndex(gameItems.findIndex((item) => item.name === currentItem.name));
    setShuffledOptions(options);
    setSelected(null);
    setMessage("");
    setShowHint(false);
    setRoundCleared(false);
    setMadeMistake(false);
  };

  const logProgress = async (isCorrect: boolean) => {
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          correct: isCorrect ? 1 : 0,
          total: 1,
          playedAt: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Failed to log progress", error);
    }
  };

  const savePersonAccuracy = (itemName: string, isCorrect: boolean) => {
    fetch("/api/accuracy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ label: itemName, correct: isCorrect }),
    }).catch((error) => console.error("Failed to record accuracy", error));
  };

  const handleSelection = (option: string) => {
    if (roundCleared) return;
    setSelected(option);

    const currentItem = gameItems[currentItemIndex];
    const isCorrect = option === currentItem?.name;

    if (!currentItem) {
      setMessage("Please start a new round.");
      return;
    }

    savePersonAccuracy(currentItem.name, isCorrect);
    logProgress(isCorrect);

    if (isCorrect) {
      if (!madeMistake) {
        setCorrectCount((prev) => prev + 1);
      }
      setMessage(`✅ This was ${currentItem.name}, ${currentItem.relationship}!`);
      setRoundCleared(true);
    } else {
      setMessage(`❌ No, this is not ${option}. Try again!`);
      setMadeMistake(true);
    }
  };

  const progress = Math.min((correctCount / 10) * 100, 100);

  return (
    <main className="bg-gradient-to-b from-blue-100 via-white to-pink-100 px-8 py-8 pb-4 flex flex-col items-center text-center min-h-screen overflow-auto">
      <div className="w-full max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-700 font-semibold">Loading faces...</p>
          </div>
        ) : !gameStarted ? (
          <div className="text-center py-12">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
              <h2 className="text-3xl font-extrabold text-blue-700 mb-2 drop-shadow-lg">Face Matching Game</h2>
              <p className="text-gray-600 mb-6 text-lg">Match the people in your gallery.</p>

              <button
                onClick={startGame}
                disabled={people.length === 0}
                className="group w-full relative overflow-hidden px-8 py-6 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 text-white rounded-3xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative flex items-center justify-center">
                  <div className="bg-white/20 rounded-full p-3 mr-4 backdrop-blur-sm">
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold mb-1">Start Face Mode</div>
                    <div className="text-blue-100 text-sm">
                      {people.length === 0 ? "Add faces to begin" : "Match people from your gallery"}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : gameItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/80 rounded-3xl shadow-2xl p-8">
              <h2 className="text-2xl font-extrabold text-blue-700 mb-4">No Faces Available</h2>
              <p className="text-gray-600 mb-6">Add faces to your gallery first to play the memory game!</p>
              <button
                onClick={() => router.push("/faces")}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-pink-400 text-white rounded-full font-semibold shadow hover:from-blue-600 hover:to-pink-500 transition-transform transform hover:scale-105"
              >
                Go to Faces Gallery
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 text-center">
              <div className="inline-flex items-center bg-white/90 px-4 py-2 rounded-full shadow-lg">
                <Users className="w-5 h-5" />
                <span className="ml-2 font-semibold text-blue-700">Face Mode</span>
                <button
                  onClick={resetGame}
                  className="ml-3 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

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

            <div className="bg-white/80 rounded-3xl shadow-2xl p-8 mb-8 flex flex-col items-center">
              <h2 className="text-2xl font-extrabold text-blue-700 mb-2 drop-shadow">Match the Face</h2>
              <hr className="border-blue-700 border mb-4 w-2/3 mx-auto" />

              <div className="bg-blue-600 text-white rounded-xl p-4 mb-4 shadow-lg w-full flex flex-col items-center">
                <h3 className="mb-2 text-lg font-semibold">Name The Person</h3>
                {gameItems[currentItemIndex] && (
                  <Image
                    src={gameItems[currentItemIndex].img}
                    alt={gameItems[currentItemIndex].name}
                    width={220}
                    height={280}
                    className="rounded-lg mx-auto border-4 border-white shadow-lg object-cover"
                  />
                )}
                <button
                  onClick={() => setShowHint(true)}
                  className="text-blue-100 underline mt-2 text-sm hover:text-blue-200"
                >
                  Need a Hint?
                </button>
              </div>

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

              {showHint && (
                <p className="text-sm text-blue-700 mb-2 italic bg-blue-100 rounded px-3 py-1 inline-block">
                  Hint: {gameItems[currentItemIndex].relationship}
                </p>
              )}

              <p
                className={`font-bold text-lg mb-3 transition-all duration-200
                  ${message.startsWith("✅") ? "text-green-600" : message ? "text-red-600" : "text-blue-700"}
                `}
              >
                {message}
              </p>

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
          </>
        )}
      </div>
    </main>
  );
}
