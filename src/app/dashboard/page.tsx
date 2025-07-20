"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Brain, BookOpen, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-[#e2f0ff] to-[#ffe5f0] p-6 pb-24 text-center">
      <div className="w-full max-w-md mt-8">
        <div className="bg-white/80 rounded-3xl shadow-xl p-6 mb-8 flex flex-col items-center">
          <img src="/think-logo.png" alt="ThinkClear Logo" width={140} className="mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-4xl font-extrabold tracking-widest text-blue-700 drop-shadow mb-2">THIΛK Clear</h1>
          <p className="text-base text-blue-500 italic mb-2">for every face that matters</p>
          <p className="text-sm text-gray-500">Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!</p>
        </div>

        {/* Cards Section */}
        <div className="grid grid-cols-2 gap-6">
          <Link href="/faces">
            <div className="bg-white/90 border border-blue-100 rounded-2xl shadow-lg p-6 flex flex-col items-center hover:scale-105 hover:shadow-2xl transition-transform cursor-pointer">
              <Users className="h-10 w-10 mb-2 text-blue-600" />
              <p className="font-bold text-blue-600 mb-1">Familiar Faces</p>
              <p className="text-xs text-blue-500 text-center">See recognized faces from your smart glasses.</p>
            </div>
          </Link>

          <Link href="/game">
            <div className="bg-white/90 border border-blue-100 rounded-2xl shadow-lg p-6 flex flex-col items-center hover:scale-105 hover:shadow-2xl transition-transform cursor-pointer">
              <Brain className="h-10 w-10 mb-2 text-pink-500" />
              <p className="font-bold text-pink-500 mb-1">Memory Game</p>
              <p className="text-xs text-pink-400 text-center">Test memory with friendly challenges.</p>
            </div>
          </Link>

          <Link href="/journal">
            <div className="bg-white/90 border border-blue-100 rounded-2xl shadow-lg p-6 flex flex-col items-center hover:scale-105 hover:shadow-2xl transition-transform cursor-pointer">
              <BookOpen className="h-10 w-10 mb-2 text-blue-400" />
              <p className="font-bold text-blue-400 mb-1">Journal</p>
              <p className="text-xs text-blue-400 text-center">Record moments and reflections daily.</p>
            </div>
          </Link>

          <Link href="/progress">
            <div className="bg-white/90 border border-blue-100 rounded-2xl shadow-lg p-6 flex flex-col items-center hover:scale-105 hover:shadow-2xl transition-transform cursor-pointer">
              <TrendingUp className="h-10 w-10 mb-2 text-green-500" />
              <p className="font-bold text-green-600 mb-1">Progress</p>
              <p className="text-xs text-green-500 text-center">Track your memory game performance.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
