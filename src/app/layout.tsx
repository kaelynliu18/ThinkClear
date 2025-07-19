// src/app/layout.tsx
import './global.css';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import ClientNav from '@/components/ClientNav';
import ClientFooter from "./components/ClientFooter";

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} antialiased`} suppressHydrationWarning>
          {/* HEADER removed as requested */}
          <main className="pt-6 pb-20">{children}</main>
          {/* FOOTER TAB BAR */}
          <ClientFooter />
        </body>
      </html>
    </ClerkProvider>
  );
}
