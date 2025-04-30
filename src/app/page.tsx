// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function Home() {
  useEffect(() => {
    // Redirect users to the Surah configuration page by default
    redirect('/surahs');
  }, []);

  // Render a loading state or null while redirecting
  // You could add a simple loading spinner here if preferred
  return (
      <div className="flex justify-center items-center min-h-screen">
          <p>Loading...</p>
      </div>
  );
}
