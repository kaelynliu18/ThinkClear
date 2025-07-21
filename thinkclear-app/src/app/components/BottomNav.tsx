"use client";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white/90 shadow-2xl rounded-t-2xl z-50">
      <nav className="max-w-2xl mx-auto flex justify-around py-3 text-gray-500 text-base font-semibold">
        <a href="/dashboard" className={`px-3 py-1 rounded-lg transition-all duration-150 ${pathname === "/dashboard" ? "text-blue-600 border-b-4 border-blue-500 bg-blue-50 shadow font-bold" : "hover:text-blue-600 hover:bg-blue-50"}`}>Dashboard</a>
        <a href="/faces" className={`px-3 py-1 rounded-lg transition-all duration-150 ${pathname === "/faces" ? "text-blue-600 border-b-4 border-blue-500 bg-blue-50 shadow font-bold" : "hover:text-blue-600 hover:bg-blue-50"}`}>Faces</a>
        <a href="/game" className={`px-3 py-1 rounded-lg transition-all duration-150 ${pathname === "/game" ? "text-blue-600 border-b-4 border-blue-500 bg-blue-50 shadow font-bold" : "hover:text-blue-600 hover:bg-blue-50"}`}>Game</a>
        <a href="/journal" className={`px-3 py-1 rounded-lg transition-all duration-150 ${pathname === "/journal" ? "text-blue-600 border-b-4 border-blue-500 bg-blue-50 shadow font-bold" : "hover:text-blue-600 hover:bg-blue-50"}`}>Journal</a>
        <a href="/progress" className={`px-3 py-1 rounded-lg transition-all duration-150 ${pathname === "/progress" ? "text-blue-600 border-b-4 border-blue-500 bg-blue-50 shadow font-bold" : "hover:text-blue-600 hover:bg-blue-50"}`}>Progress</a>
      </nav>
    </footer>
  );
} 