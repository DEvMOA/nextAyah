// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type * as React from 'react';
import { SurahSelector } from '@/components/quran/SurahSelector';
import { VerseDisplay } from '@/components/quran/VerseDisplay';
import { getSurahList, getVerse, getRandomVerse, type Surah, type Verse } from '@/services/quran';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components

export default function Home() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
  const [previousVerses, setPreviousVerses] = useState<Verse[]>([]);
  const [isLoadingSurahs, setIsLoadingSurahs] = useState(true);
  const [isLoadingVerse, setIsLoadingVerse] = useState(false);
  const { toast } = useToast();

  // Fetch Surah list on initial load
  useEffect(() => {
    async function fetchSurahs() {
      try {
        setIsLoadingSurahs(true);
        const surahList = await getSurahList();
        setSurahs(surahList);
        if (surahList.length > 0) {
          // Optionally select the first Surah by default
          // handleSelectSurah(surahList[0]);
        }
      } catch (error) {
        console.error("Error fetching Surah list:", error);
        toast({
          title: "Error",
          description: "Failed to load Surah list. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingSurahs(false);
      }
    }
    fetchSurahs();
  }, [toast]); // Removed handleSelectSurah from dependencies

  const handleSelectSurah = (surah: Surah) => {
    setSelectedSurah(surah);
    setCurrentVerse(null); // Reset verse when Surah changes
    setPreviousVerses([]); // Reset previous verses
  };

  const fetchAndSetVerse = async (surahId: number, verseId: number) => {
     if (!selectedSurah || verseId < 1 || verseId > selectedSurah.verseCount) return;

    setIsLoadingVerse(true);
    try {
      const verse = await getVerse(surahId, verseId);
      if (currentVerse) {
        // Add the *previous* currentVerse to the history if navigating
        // Avoid adding duplicates if rapidly clicking
         if (!previousVerses.some(v => v.id === currentVerse.id)) {
             setPreviousVerses(prev => [...prev, currentVerse].sort((a, b) => a.id - b.id));
         }
      }
      setCurrentVerse(verse);
    } catch (error) {
      console.error(`Error fetching verse ${surahId}:${verseId}:`, error);
      toast({
        title: "Error",
        description: `Failed to load verse ${verseId}. Please try again.`,
        variant: "destructive",
      });
      // Keep the current verse displayed on error
    } finally {
      setIsLoadingVerse(false);
    }
  };

  const handleGenerateRandom = async () => {
    if (!selectedSurah) {
      toast({
        title: "Select a Surah",
        description: "Please select a Surah first to generate a random verse.",
        variant: "default", // Use default variant for informational messages
      });
      return;
    }
    setIsLoadingVerse(true);
     setPreviousVerses([]); // Clear previous verses on random generation
    try {
      const verse = await getRandomVerse(selectedSurah.id);
      setCurrentVerse(verse);
    } catch (error) {
      console.error("Error fetching random verse:", error);
      toast({
        title: "Error",
        description: "Failed to load a random verse. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVerse(false);
    }
  };

   const handleNavigate = (direction: 'previous' | 'next') => {
    if (!selectedSurah || !currentVerse) return;

    const targetVerseId = direction === 'previous' ? currentVerse.id - 1 : currentVerse.id + 1;
    fetchAndSetVerse(selectedSurah.id, targetVerseId);
  };


  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-start min-h-screen">
      <div className="w-full lg:w-1/3 sticky top-8 self-start">
         {isLoadingSurahs ? (
             <Card className="w-full max-w-md shadow-lg">
                 <CardHeader className="border-b">
                     <Skeleton className="h-6 w-3/4" />
                     <Skeleton className="h-10 w-full mt-2" />
                 </CardHeader>
                 <CardContent className="p-0">
                     <div className="p-4 space-y-2 h-64">
                         {[...Array(5)].map((_, i) => (
                             <Skeleton key={i} className="h-12 w-full" />
                         ))}
                     </div>
                 </CardContent>
             </Card>
         ) : (
            <SurahSelector
                surahs={surahs}
                selectedSurah={selectedSurah}
                onSelectSurah={handleSelectSurah}
            />
        )}
      </div>
      <div className="w-full lg:w-2/3">
        {selectedSurah ? (
          isLoadingVerse ? (
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
          ) : (
            <VerseDisplay
                surah={selectedSurah}
                currentVerse={currentVerse}
                previousVerses={previousVerses}
                onGenerateRandom={handleGenerateRandom}
                onNavigate={handleNavigate}
            />
          )
        ) : (
          <Card className="w-full shadow-lg flex items-center justify-center h-64">
             <p className="text-muted-foreground text-center p-8">
                 {isLoadingSurahs ? 'Loading Surahs...' : 'Select a Surah from the list to begin exploring the Quran.'}
             </p>
          </Card>
        )}
      </div>
    </main>
  );
}
