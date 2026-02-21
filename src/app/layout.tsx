import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { UserProvider } from '@/components/UserProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'ProPicks NBA',
  description: 'Pick NBA winners. Earn points. Climb the leaderboard.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ThemeProvider>
          <UserProvider>
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
