// src/app/random/page.tsx
'use client';

import type * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VerseDisplay } from '@/components/quran/VerseDisplay';
import {
    getSurahDetails,
    getVerse,
    getRandomVerseInRange, // Use the correct function
    type Surah,
    type Verse,
    DEFAULT_RECITER_ID,
    DEFAULT_TRANSLATION_ID,
    availableReciters,
    availableTranslations
} from '@/services/quran';
import type { SurahConfig, QuranExplorerSettings, Reciter, TranslationInfo } from '@/types/quran'; // Import settings type
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LOCAL_STORAGE_KEY = 'quranExplorerSettings'; // Use the correct key

export default function RandomVersePage() {
  const router = useRouter();
  const { toast } = useToast();

  // State for settings
  const [settings, setSettings] = useState<QuranExplorerSettings | null>(null);
  const [configs, setConfigs] = useState<SurahConfig[]>([]);
  const [reciterId, setReciterId] = useState<number>(DEFAULT_RECITER_ID);
  const [translationId, setTranslationId] = useState<number>(DEFAULT_TRANSLATION_ID);

  // State for verse display
  const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
  const [currentSurahDetails, setCurrentSurahDetails] = useState<Surah | null>(null);
  const [currentConfig, setCurrentConfig] = useState<SurahConfig | null>(null);
  const [previousVerses, setPreviousVerses] = useState<Verse[]>([]); // Keep for potential future use

  // State for loading/error
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingVerse, setIsLoadingVerse] = useState(false);
  const [errorLoadingSettings, setErrorLoadingSettings] = useState<string | null>(null);

  // Computed values for display
  const selectedReciter = availableReciters.find(r => r.id === reciterId);
  const selectedTranslation = availableTranslations.find(t => t.id === translationId);

  // Load settings from local storage and fetch initial random verse
  useEffect(() => {
    const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!savedSettings) {
        setErrorLoadingSettings("No configuration found. Please configure your selections first.");
        setIsLoadingSettings(false);
        return;
    }

    try {
        const parsedSettings: QuranExplorerSettings = JSON.parse(savedSettings);

        // Validate parsed settings structure
        if (
            !parsedSettings || typeof parsedSettings !== 'object' ||
            !Array.isArray(parsedSettings.selectedConfigs) ||
            typeof parsedSettings.reciterId !== 'number' ||
            typeof parsedSettings.translationId !== 'number'
        ) {
            throw new Error("Invalid settings data format.");
        }

        // Validate Surah configurations
        const validConfigs = parsedSettings.selectedConfigs.filter(c =>
            typeof c.surahId === 'number' &&
            typeof c.startVerse === 'number' &&
            typeof c.endVerse === 'number' &&
            c.startVerse > 0 && c.endVerse > 0 && c.startVerse <= c.endVerse
        );

        if (validConfigs.length === 0) {
            throw new Error("No valid Surah configurations found in settings.");
        }

        // Validate reciter and translation IDs
        const validReciterId = availableReciters.some(r => r.id === parsedSettings.reciterId)
            ? parsedSettings.reciterId
            : DEFAULT_RECITER_ID;
        const validTranslationId = availableTranslations.some(t => t.id === parsedSettings.translationId)
            ? parsedSettings.translationId
            : DEFAULT_TRANSLATION_ID;

        // Update state
        setSettings(parsedSettings); // Store the full settings object if needed elsewhere
        setConfigs(validConfigs);
        setReciterId(validReciterId);
        setTranslationId(validTranslationId);

        // Fetch initial random verse *after* setting state
        fetchRandomVerse(validConfigs, validReciterId, validTranslationId);

    } catch (error) {
        console.error("Error loading or parsing settings:", error);
        setErrorLoadingSettings(`Failed to load settings. Please reconfigure. Error: ${error instanceof Error ? error.message : String(error)}`);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear invalid data
    } finally {
        setIsLoadingSettings(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount


  // Fetch a specific verse within the context of the *current* Surah and range
  const fetchVerse = useCallback(async (verseIdToFetch: number) => {
     if (!currentSurahDetails || !currentConfig || !settings) return; // Need context

     // Check if the requested verse is within the configured range
     if (verseIdToFetch < currentConfig.startVerse || verseIdToFetch > currentConfig.endVerse) {
         toast({ title: "Out of Range", description: `Verse ${verseIdToFetch} is outside the configured range.`, variant: "default"});
         return;
     }

    setIsLoadingVerse(true);
    try {
      // Pass the current translation and reciter IDs
      const verse = await getVerse(currentSurahDetails.id, verseIdToFetch, translationId, reciterId);

      // Keep history management if needed in the future
      // if (currentVerse) {
      //    if (!previousVerses.some(v => v.id === currentVerse.id)) {
      //        setPreviousVerses(prev => [...prev, currentVerse].sort((a, b) => a.id - b.id));
      //    }
      // } else {
      //     setPreviousVerses([]);
      // }

      setCurrentVerse(verse);
    } catch (error) {
      console.error(`Error fetching verse ${currentSurahDetails.id}:${verseIdToFetch}:`, error);
      toast({
        title: "Error Loading Verse",
        description: `Failed to load verse ${verseIdToFetch}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingVerse(false);
    }
     // Use the correct dependencies, including settings IDs
  }, [currentSurahDetails, currentConfig, settings, translationId, reciterId, toast]);

  // Fetch a random verse based on the loaded configurations
  const fetchRandomVerse = useCallback(async (
      currentConfigs?: SurahConfig[],
      currentReciterId?: number,
      currentTranslationId?: number
    ) => {
     const conf = currentConfigs || configs;
     const recId = currentReciterId ?? reciterId;
     const transId = currentTranslationId ?? translationId;

     if (conf.length === 0) {
         toast({ title: "No Configuration", description: "Cannot generate random verse without configuration.", variant: "destructive"});
         return;
     }

    setIsLoadingVerse(true);
    setPreviousVerses([]); // Clear history for a new random selection

    try {
        // 1. Pick a random configuration
        const randomConfigIndex = Math.floor(Math.random() * conf.length);
        const selectedConfig = conf[randomConfigIndex];
        setCurrentConfig(selectedConfig); // Store the current config context

        // 2. Fetch Surah details (essential for validation and display)
        // Even if stored in config initially, re-fetch for safety/freshness if needed
        const surahDetails = await getSurahDetails(selectedConfig.surahId);
        setCurrentSurahDetails(surahDetails); // Store current surah context

         // Validate the range against fetched details
        if (selectedConfig.startVerse > selectedConfig.endVerse || selectedConfig.startVerse < 1 || selectedConfig.endVerse > surahDetails.verseCount) {
            throw new Error(`Invalid range ${selectedConfig.startVerse}-${selectedConfig.endVerse} for Surah ${surahDetails.id} (Max: ${surahDetails.verseCount})`);
        }

        // 3. Use getRandomVerseInRange which handles picking the verse ID and fetching
        const verse = await getRandomVerseInRange(
            selectedConfig.surahId,
            selectedConfig.startVerse,
            selectedConfig.endVerse,
            transId, // Pass translation ID
            recId, // Pass reciter ID
            surahDetails.verseCount // Pass known verse count to potentially optimize
        );
        setCurrentVerse(verse);

    } catch (error) {
      console.error("Error fetching random verse:", error);
      toast({
        title: "Error Generating Verse",
        description: `Failed to load a random verse. ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: "destructive",
      });
       setCurrentVerse(null); // Reset verse on error
       setCurrentSurahDetails(null);
       setCurrentConfig(null);
    } finally {
      setIsLoadingVerse(false);
    }
  }, [configs, reciterId, translationId, toast]); // Use correct dependencies

   // Wrapper for fetchRandomVerse to be used by the button
   const handleGenerateRandom = () => {
       fetchRandomVerse();
   };


   const handleNavigate = (direction: 'previous' | 'next') => {
    if (!currentVerse || !currentConfig) return; // Need context

    const targetVerseId = direction === 'previous' ? currentVerse.id - 1 : currentVerse.id + 1;

    // Fetch the verse - fetchVerse includes range check and uses current settings
    fetchVerse(targetVerseId);
  };

  const renderLoadingState = (message: string = "Loading configuration...") => (
      <Card className="w-full shadow-lg">
          <CardHeader className="border-b">
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-5 w-1/4 mt-1" />
              <Skeleton className="h-4 w-1/3 mt-2" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
               <Skeleton className="h-6 w-3/4 mx-auto mb-6" /> {/* Placeholder for message */}
               <Skeleton className="h-40 w-full" /> {/* Verse area skeleton */}
          </CardContent>
          <CardFooter className="flex justify-between items-center border-t pt-4">
               <Skeleton className="h-10 w-24" />
               <Skeleton className="h-10 w-32" />
               <Skeleton className="h-10 w-24" />
          </CardFooter>
      </Card>
  );

   const renderErrorState = (message: string) => (
       <Card className="w-full shadow-lg">
            <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Loading Failed</AlertTitle>
                    <AlertDescription>{message}</AlertDescription>
                </Alert>
            </CardContent>
            <CardFooter className="flex justify-end">
                 <Button variant="outline" asChild>
                    <Link href="/surahs">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go to Configuration
                    </Link>
                 </Button>
            </CardFooter>
       </Card>
   );


  if (isLoadingSettings) {
       return (
           <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen">
               <div className="w-full max-w-3xl">
                   {renderLoadingState("Loading settings...")}
               </div>
           </main>
       );
  }

   if (errorLoadingSettings) {
        return (
           <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen">
               <div className="w-full max-w-3xl">
                   {renderErrorState(errorLoadingSettings)}
               </div>
           </main>
        );
   }

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen">
        <div className="w-full max-w-3xl">
             <div className="mb-4 flex justify-between items-center">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/surahs">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Configuration
                    </Link>
                </Button>
                 {/* Display current settings */}
                <div className="text-right text-xs text-muted-foreground">
                    <p>Reciter: {selectedReciter?.name || `ID ${reciterId}`}</p>
                    <p>Translation: {selectedTranslation?.name || `ID ${translationId}`}</p>
                </div>
            </div>

            {isLoadingVerse ? (
                renderLoadingState("Loading verse...") // Specific message for verse loading
            ) : !currentSurahDetails || !currentVerse || !currentConfig ? (
                 // Initial state or after an error cleared the verse
                 <Card className="w-full shadow-lg flex flex-col items-center justify-center h-64 p-8 text-center">
                     <CardTitle>Ready to Explore</CardTitle>
                     <CardDescription className="mb-6">Click "Generate Random Verse" to begin using your selected settings.</CardDescription>
                     <Button onClick={handleGenerateRandom}>Generate Random Verse</Button>
                 </Card>
             ) : (
                 // Display the verse using the VerseDisplay component
                 <VerseDisplay
                     surah={currentSurahDetails}
                     currentVerse={currentVerse}
                     // previousVerses prop is still present but not used for display
                     previousVerses={[]}
                     onGenerateRandom={handleGenerateRandom}
                     onNavigate={handleNavigate}
                     // Pass range limits for disabling navigation buttons correctly
                     rangeStart={currentConfig.startVerse}
                     rangeEnd={currentConfig.endVerse}
                     reciterName={selectedReciter?.name} // Pass display names
                     translationName={selectedTranslation?.name}
                 />
            )}
        </div>
    </main>
  );
}
