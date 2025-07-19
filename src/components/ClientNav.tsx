"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClientNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/faces", label: "Faces" },
    { href: "/game", label: "Memory Game" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <>
      {/* HEADER */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard">
            <span className="text-xl font-bold text-blue-600">THIΛK Clear</span>
          </Link>
          <nav className="space-x-4 text-gray-600">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={
                  pathname === href
                    ? "text-blue-600 font-medium"
                    : "hover:text-gray-900"
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white shadow-inner">
        <div className="max-w-7xl mx-auto flex justify-around py-2 text-gray-600">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href
                  ? "text-blue-600 font-medium"
                  : "hover:text-gray-900"
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </>
  );
}
