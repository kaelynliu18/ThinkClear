"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Brain, BookOpen, Settings } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <div className="flex flex-col items-center bg-gradient-to-b from-[#e2f0ff] to-[#ffe5f0] p-4 pb-8 text-center">
      <div className="w-full max-w-md mt-6">
        <h1 className="text-4xl font-bold tracking-widest">THIΛK Clear</h1>
        <p className="text-sm text-gray-600 -mt-1">
          for every face that matters
        </p>

        {/* Cards Section */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Link href="/faces">
            <Card className="hover:bg-blue-100 cursor-pointer">
              <CardContent className="flex flex-col items-center p-4">
                <Users className="h-8 w-8 mb-2" />
                <p className="font-semibold">Familiar Faces</p>
                <p className="text-sm text-gray-600 text-center">
                  See recognized faces from your smart glasses.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/game">
            <Card className="hover:bg-blue-100 cursor-pointer">
              <CardContent className="flex flex-col items-center p-4">
                <Brain className="h-8 w-8 mb-2" />
                <p className="font-semibold">Memory Game</p>
                <p className="text-sm text-gray-600 text-center">
                  Test memory with friendly challenges.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/journal">
            <Card className="hover:bg-blue-100 cursor-pointer">
              <CardContent className="flex flex-col items-center p-4">
                <BookOpen className="h-8 w-8 mb-2" />
                <p className="font-semibold">Journal</p>
                <p className="text-sm text-gray-600 text-center">
                  Record moments and reflections daily.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="hover:bg-blue-100 cursor-pointer">
              <CardContent className="flex flex-col items-center p-4">
                <Settings className="h-8 w-8 mb-2" />
                <p className="font-semibold">Settings</p>
                <p className="text-sm text-gray-600 text-center">
                  Manage your preferences and app setup.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
