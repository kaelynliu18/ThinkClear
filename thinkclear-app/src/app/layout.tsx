// src/app/layout.tsx
import './global.css';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/react';
import { Inter } from 'next/font/google';
import ClientFooter from "./components/ClientFooter";

const inter = Inter({ subsets: ['latin'] });

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const hasClerkConfig = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
                        process.env.CLERK_SECRET_KEY &&
                        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'pk_test_dummy' &&
                        process.env.CLERK_SECRET_KEY !== 'sk_test_dummy';

  if (!hasClerkConfig) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#e2f0ff] to-[#ffe5f0]">
        <header className="flex justify-end items-center px-6 py-4">
          <div className="px-4 py-2 rounded-full border border-blue-300 text-blue-700 font-semibold bg-blue-50">
            Guest Mode
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
        <ClientFooter />
        <Analytics />
      </div>
    );
  }

  return (
    <ClerkProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#e2f0ff] to-[#ffe5f0]">
        <header className="flex justify-end items-center px-6 py-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 rounded-full border border-blue-300 text-blue-700 font-semibold hover:bg-blue-50 transition">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonTrigger: 'ring-2 ring-blue-200 rounded-full' } }} />
          </SignedIn>
        </header>
        <main className="flex-1">
          {children}
        </main>
        <ClientFooter />
        <Analytics />
      </div>
    </ClerkProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
