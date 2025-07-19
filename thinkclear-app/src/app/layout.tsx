// src/app/layout.tsx
import './global.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} antialiased`} suppressHydrationWarning>
          {/* HEADER */}
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-blue-600">THIΛK</h1>
              <nav className="space-x-4 text-gray-600">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <Link href="/faces"     className="hover:text-gray-900">Faces</Link>
                <Link href="/game"      className="hover:text-gray-900">Memory Game</Link>
                <Link href="/settings"  className="hover:text-gray-900">Settings</Link>
              </nav>
            </div>
          </header>

          {/* MAIN CONTENT */}
          <main className="pt-6 pb-16">
            {children}
          </main>

          {/* FOOTER TAB BAR */}
          <footer className="fixed bottom-0 left-0 right-0 bg-white shadow-inner">
            <div className="max-w-7xl mx-auto flex justify-around py-2 text-gray-600">
              <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
              <Link href="/faces"     className="text-blue-600 font-medium">Faces</Link>
              <Link href="/game"      className="hover:text-gray-900">Memory Game</Link>
              <Link href="/settings"  className="hover:text-gray-900">Settings</Link>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
