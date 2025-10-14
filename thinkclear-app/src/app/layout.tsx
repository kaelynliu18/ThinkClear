// src/app/layout.tsx
import './global.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import ClientFooter from "./components/ClientFooter";

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <ClerkProvider>
          <main className="min-h-screen bg-gradient-to-b from-[#e2f0ff] to-[#ffe5f0]">
            {children}
          </main>
          <ClientFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}
