import type {Metadata} from 'next';
import {Geist} from 'next/font/google'; // Use Geist Sans as primary font
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// Removed Geist Mono as it's not explicitly needed by the design

export const metadata: Metadata = {
  title: 'Quran Explorer', // Updated title
  description: 'Explore the Quran with random verse generation and Surah selection.', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        <Toaster /> {/* Add Toaster component */}
      </body>
    </html>
  );
}
