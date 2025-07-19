'use client';

import { useRouter } from 'next/navigation';
import { Home, User, Award, BookOpen, Settings } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <main>
      {/* Logo */}
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        THI
        <span
          style={{
            display: 'inline-block',
            transform: 'rotate(180deg)',
            margin: '0 0.25rem',
          }}
        >
          V
        </span>
        K Clear
      </h1>

      {/* Motto */}
      <p style={{ fontStyle: 'italic', marginBottom: '1rem' }}>
        for every face that matters
      </p>

      {/* Intro */}
      <p style={{ marginBottom: '2rem' }}>
        Welcome to your memory companion.
      </p>

      {/* Go to Login button */}
      {/* Removed login button as login is no longer used */}

      {/* Bottom Nav */}
      <footer>
        <button onClick={() => router.push('/')}>
          <Home size={24} />
        </button>
        <button onClick={() => router.push('/faces')}>
          <User size={24} />
        </button>
        <button onClick={() => router.push('/game')}>
          <Award size={24} />
        </button>
        <button onClick={() => router.push('/journal')}>
          <BookOpen size={24} />
        </button>
        <button onClick={() => router.push('/settings')}>
          <Settings size={24} />
        </button>
      </footer>
    </main>
  );
}
