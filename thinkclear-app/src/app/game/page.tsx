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

  const handleSelection = (option: string) => {
    if (roundCleared) return;
    setSelected(option);

    if (option === people[currentPersonIndex].name) {
      if (!madeMistake) {
        setCorrectCount((prev) => prev + 1);
      }
      setMessage(
        `✅ This was ${people[currentPersonIndex].name}, ${people[currentPersonIndex].relationship}!`
      );
      setRoundCleared(true);
    } else {
      setMessage(`❌ No, this is not ${option}. Try again!`);
      setMadeMistake(true);
    }
  };

  const progress = Math.min((correctCount / 10) * 100, 100);

  return (
    <main className="bg-gradient-to-b from-blue-100 via-white to-pink-100 px-4 py-4 pb-4 flex flex-col items-center text-center overflow-auto">
      <div className="w-full max-w-md">
        {/* Progress */}
        <p className="text-sm text-blue-600 mb-1">
          Daily Goal: {correctCount}/10 matches
        </p>
        <div className="w-full bg-blue-100 rounded-full h-3 mb-4">
          <div
            className="bg-blue-600 h-3 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-blue-700 mb-2">
          Match the Face
        </h2>
        <hr className="border-blue-700 border mb-4" />

        {/* Image + Hint */}
        <div className="bg-blue-600 text-white rounded-lg p-4 mb-4">
          <h3 className="mb-2 text-lg font-semibold">Name The Person</h3>
          <Image
            src={people[currentPersonIndex].img}
            alt="person"
            width={220}
            height={280}
            className="rounded-md mx-auto"
          />
          <button
            onClick={() => setShowHint(true)}
            className="text-blue-100 underline mt-2 text-sm hover:text-blue-200"
          >
            Need a Hint?
          </button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {shuffledOptions.map((option, index) => (
            <button
              key={`${option}-${index}`}
              onClick={() => handleSelection(option)}
              className={`px-4 py-2 rounded-md border text-sm font-medium ${
                selected === option
                  ? option === people[currentPersonIndex].name
                    ? "bg-blue-600 text-white"
                    : "bg-red-200 text-red-700"
                  : "border-blue-600 text-blue-600"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Hint Display */}
        {showHint && (
          <p className="text-sm text-blue-700 mb-2 italic">
            Hint: {people[currentPersonIndex].relationship}
          </p>
        )}

        {/* Feedback Message */}
        <p
          className={`font-semibold text-md mb-3 ${
            message.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>

        {/* Score and Next */}
        <div className="flex justify-between items-center w-full text-blue-700 font-medium border-t border-blue-600 pt-2 mb-4">
          <p>
            You have matched {correctCount} face{correctCount !== 1 ? "s" : ""}!
          </p>
          <button onClick={generateRound} className="text-blue-700 underline">
            Next Round →
          </button>
        </div>
      </div>
    </main>
  );
}
