// src/app/random/[surahId]/page.tsx
'use client';

import type * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { VerseDisplay } from '@/components/quran/VerseDisplay';
import { getSurahDetails, getVerse, getRandomVerse, type Surah, type Verse } from '@/services/quran';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RandomVersePage() {
  const params = useParams();
  const surahId = parseInt(params.surahId as string, 10);
  const { toast } = useToast();

  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
  const [previousVerses, setPreviousVerses] = useState<Verse[]>([]);
  const [isLoadingSurahDetails, setIsLoadingSurahDetails] = useState(true);
  const [isLoadingVerse, setIsLoadingVerse] = useState(false);

  // Fetch Surah details on initial load or when surahId changes
  useEffect(() => {
    async function fetchSurahData() {
      if (isNaN(surahId)) {
         toast({ title: "Invalid Surah", description: "The Surah ID is invalid.", variant: "destructive" });
         setIsLoadingSurahDetails(false);
         return;
      }
      setIsLoadingSurahDetails(true);
      try {
        const surahDetails = await getSurahDetails(surahId);
        setSelectedSurah(surahDetails);
        // Automatically fetch a random verse when Surah details are loaded
        await fetchRandomVerse(surahDetails.id, surahDetails.verseCount);
      } catch (error) {
        console.error(`Error fetching details for Surah ${surahId}:`, error);
        toast({
          title: "Error Loading Surah",
          description: `Failed to load details for Surah ${surahId}.`,
          variant: "destructive",
        });
        setSelectedSurah(null); // Ensure surah is null on error
      } finally {
        setIsLoadingSurahDetails(false);
      }
    }
    fetchSurahData();
  }, [surahId, toast]); // Removed fetchRandomVerse dependency


  const fetchVerse = useCallback(async (verseId: number) => {
     if (!selectedSurah || verseId < 1 || verseId > selectedSurah.verseCount) return;

    setIsLoadingVerse(true);
    try {
      const verse = await getVerse(selectedSurah.id, verseId);
      if (currentVerse) {
         // Add the *previous* currentVerse to the history if navigating
         if (!previousVerses.some(v => v.id === currentVerse.id)) {
             setPreviousVerses(prev => [...prev, currentVerse].sort((a, b) => a.id - b.id));
         }
      } else {
          // If it's the first verse being loaded (after random), clear history
          setPreviousVerses([]);
      }
      setCurrentVerse(verse);
    } catch (error) {
      console.error(`Error fetching verse ${selectedSurah.id}:${verseId}:`, error);
      toast({
        title: "Error",
        description: `Failed to load verse ${verseId}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingVerse(false);
    }
  }, [selectedSurah, currentVerse, previousVerses, toast]); // Added dependencies

  const fetchRandomVerse = useCallback(async (sId: number, verseCount: number) => {
    setIsLoadingVerse(true);
    setPreviousVerses([]); // Clear previous verses on random generation
    try {
      // Pass verseCount to avoid extra API call in getRandomVerse
      const verse = await getRandomVerse(sId, verseCount);
      setCurrentVerse(verse);
    } catch (error) {
      console.error("Error fetching random verse:", error);
      toast({
        title: "Error",
        description: "Failed to load a random verse. Please try again.",
        variant: "destructive",
      });
       setCurrentVerse(null); // Reset verse on error
    } finally {
      setIsLoadingVerse(false);
    }
  }, [toast]); // Added dependency

  const handleGenerateRandom = () => {
    if (!selectedSurah) return;
    fetchRandomVerse(selectedSurah.id, selectedSurah.verseCount);
  };

   const handleNavigate = (direction: 'previous' | 'next') => {
    if (!selectedSurah || !currentVerse) return;
    const targetVerseId = direction === 'previous' ? currentVerse.id - 1 : currentVerse.id + 1;
    fetchVerse(targetVerseId);
  };

  const renderLoadingState = () => (
      <Card className="w-full shadow-lg">
          <CardHeader className="border-b">
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-5 w-1/4 mt-1" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
              <Skeleton className="h-40 w-full" /> {/* Previous verses area */}
              <Skeleton className="h-24 w-full" /> {/* Current verse area */}
          </CardContent>
          <CardFooter className="flex justify-between items-center border-t pt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
          </CardFooter>
      </Card>
  );

  const renderErrorState = () => (
       <Card className="w-full shadow-lg flex flex-col items-center justify-center h-64 p-8 text-center">
            <CardTitle className="text-destructive mb-4">Error Loading Surah</CardTitle>
            <CardDescription className="mb-6">
                Could not load the details for the requested Surah. Please check the ID or try again later.
            </CardDescription>
            <Button variant="outline" asChild>
                <Link href="/surahs">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Surah List
                </Link>
            </Button>
       </Card>
  );


  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen">
        <div className="w-full max-w-3xl">
             <div className="mb-6">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/surahs">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Surah List
                    </Link>
                </Button>
            </div>

            {isLoadingSurahDetails ? (
                renderLoadingState()
            ) : !selectedSurah ? (
                 renderErrorState()
            ) : isLoadingVerse ? (
                renderLoadingState() // Show loading state while verse is loading too
            ) : (
                <VerseDisplay
                    surah={selectedSurah}
                    currentVerse={currentVerse}
                    previousVerses={previousVerses}
                    onGenerateRandom={handleGenerateRandom}
                    onNavigate={handleNavigate}
                />
            )}
        </div>
    </main>
  );
}
