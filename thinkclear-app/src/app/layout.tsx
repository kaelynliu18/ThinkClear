// src/app/layout.tsx
import './global.css';
import { Inter } from 'next/font/google';
import { ClerkProvider, SignedIn } from '@clerk/nextjs';
import ClientFooter from "./components/ClientFooter";

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} antialiased`} suppressHydrationWarning>
          <main className="pt-6 pb-20 min-h-screen">{children}</main>
          <SignedIn>
            <ClientFooter />
          </SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}
