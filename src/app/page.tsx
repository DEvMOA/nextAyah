// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function Home() {
  useEffect(() => {
    redirect('/surahs');
  }, []);

  // Render a loading state or null while redirecting
  return null;
}
