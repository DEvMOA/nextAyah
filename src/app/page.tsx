// src/app/page.tsx
import { redirect } from 'next/navigation';

// This component now performs a server-side redirect immediately.
// No need for 'use client' or useEffect.
export default function Home() {
  // Redirect users to the Surah configuration page by default
  redirect('/surahs');

  // This return statement will not be reached due to the redirect,
  // but it's good practice to have one. Return null or a minimal loading indicator.
  // Returning null as the redirect should happen before render.
  // return null;
}
