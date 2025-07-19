// src/app/layout.tsx
import './global.css';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import ClientNav from '@/components/ClientNav';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} antialiased`} suppressHydrationWarning>
          <ClientNav />
          <main className="pt-6 pb-16">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
