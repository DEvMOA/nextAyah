// src/app/random/page.tsx
'use client';

import type * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VerseDisplay } from '@/components/quran/VerseDisplay';
import { getSurahDetails, getVerse, type Surah, type Verse } from '@/services/quran';
import type { SurahConfig } from '@/types/quran';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LOCAL_STORAGE_KEY = 'quranExplorerConfig';

export default function RandomVersePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [configs, setConfigs] = useState<SurahConfig[]>([]);
  const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
  const [currentSurahDetails, setCurrentSurahDetails] = useState<Surah | null>(null);
  const [currentConfig, setCurrentConfig] = useState<SurahConfig | null>(null);
  const [previousVerses, setPreviousVerses] = useState<Verse[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isLoadingVerse, setIsLoadingVerse] = useState(false);
  const [errorLoadingConfig, setErrorLoadingConfig] = useState<string | null>(null);


 // Load configuration and fetch initial random verse
 useEffect(() => {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!savedConfig) {
        setErrorLoadingConfig("No configuration found. Please configure your Surah selections first.");
        setIsLoadingConfig(false);
        return;
    }

    try {
        const parsedConfig: SurahConfig[] = JSON.parse(savedConfig);
        if (!Array.isArray(parsedConfig) || parsedConfig.length === 0 || !parsedConfig.every(c => typeof c.surahId === 'number' && typeof c.startVerse === 'number' && typeof c.endVerse === 'number')) {
            throw new Error("Invalid or empty configuration data.");
        }
        setConfigs(parsedConfig);
        // Fetch initial random verse *after* setting configs
        fetchRandomVerse(parsedConfig);
    } catch (error) {
        console.error("Error loading or parsing configuration:", error);
        setErrorLoadingConfig(`Failed to load configuration. Please reconfigure. Error: ${error instanceof Error ? error.message : String(error)}`);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear invalid data
    } finally {
        setIsLoadingConfig(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Run only once on mount


  // Fetch a specific verse within the context of the *current* Surah and range
  const fetchVerse = useCallback(async (verseId: number) => {
     if (!currentSurahDetails || !currentConfig) return; // Need context

     // Check if the requested verse is within the configured range
     if (verseId < currentConfig.startVerse || verseId > currentConfig.endVerse) {
         // console.log(`Verse ${verseId} is outside the configured range (${currentConfig.startVerse}-${currentConfig.endVerse}) for Surah ${currentSurahDetails.id}.`);
         // Optionally, show a toast or simply do nothing
         toast({ title: "Out of Range", description: `Verse ${verseId} is outside the configured range.`, variant: "default"});
         return;
     }

    setIsLoadingVerse(true);
    try {
      const verse = await getVerse(currentSurahDetails.id, verseId);
      if (currentVerse) {
         // Add the *previous* currentVerse to the history if navigating
         if (!previousVerses.some(v => v.id === currentVerse.id)) {
             // Keep history sorted chronologically
             setPreviousVerses(prev => [...prev, currentVerse].sort((a, b) => a.id - b.id));
         }
      } else {
          // If it's the first verse loaded (after random), clear history
          setPreviousVerses([]);
      }
      setCurrentVerse(verse);
    } catch (error) {
      console.error(`Error fetching verse ${currentSurahDetails.id}:${verseId}:`, error);
      toast({
        title: "Error Loading Verse",
        description: `Failed to load verse ${verseId}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingVerse(false);
    }
  }, [currentSurahDetails, currentConfig, currentVerse, previousVerses, toast]); // Added dependencies

  // Fetch a random verse based on the loaded configurations
  const fetchRandomVerse = useCallback(async (currentConfigs?: SurahConfig[]) => {
     const conf = currentConfigs || configs; // Use provided or state configs
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

        // 2. Fetch Surah details if not already present (unlikely if configured properly, but safe)
        let surahDetails = selectedConfig.surahDetails;
        if (!surahDetails) {
            surahDetails = await getSurahDetails(selectedConfig.surahId);
            // Optionally update the config in state if needed, but might not be necessary just for display
        }
         setCurrentSurahDetails(surahDetails); // Store current surah context

         // Validate the range again (safety check)
        if (selectedConfig.startVerse > selectedConfig.endVerse || selectedConfig.startVerse < 1 || selectedConfig.endVerse > surahDetails.verseCount) {
            throw new Error(`Invalid range ${selectedConfig.startVerse}-${selectedConfig.endVerse} for Surah ${surahDetails.id} (Max: ${surahDetails.verseCount})`);
        }

        // 3. Pick a random verse *within the specified range*
        const rangeSize = selectedConfig.endVerse - selectedConfig.startVerse + 1;
        const randomVerseIdInRange = Math.floor(Math.random() * rangeSize) + selectedConfig.startVerse;

        // 4. Fetch the verse
        const verse = await getVerse(selectedConfig.surahId, randomVerseIdInRange);
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
  }, [configs, toast]); // Removed getVerse dependency, handled internally

   // Wrapper for fetchRandomVerse to be used by the button
   const handleGenerateRandom = () => {
       fetchRandomVerse();
   };


   const handleNavigate = (direction: 'previous' | 'next') => {
    if (!currentVerse || !currentConfig) return; // Need context

    const targetVerseId = direction === 'previous' ? currentVerse.id - 1 : currentVerse.id + 1;

    // Fetch the verse - fetchVerse includes range check
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


  if (isLoadingConfig) {
       return (
           <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen">
               <div className="w-full max-w-3xl">
                   {renderLoadingState()}
               </div>
           </main>
       );
  }

   if (errorLoadingConfig) {
        return (
           <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen">
               <div className="w-full max-w-3xl">
                   {renderErrorState(errorLoadingConfig)}
               </div>
           </main>
        );
   }

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen">
        <div className="w-full max-w-3xl">
             <div className="mb-6">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/surahs">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Configuration
                    </Link>
                </Button>
            </div>

            {isLoadingVerse ? (
                renderLoadingState() // Show loading skeleton when verse is loading
            ) : !currentSurahDetails || !currentVerse || !currentConfig ? (
                 // Show placeholder or message if no verse is loaded yet (e.g., after error)
                 <Card className="w-full shadow-lg flex flex-col items-center justify-center h-64 p-8 text-center">
                     <CardTitle>Ready to Explore</CardTitle>
                     <CardDescription className="mb-6">Click "Generate Random Verse" to begin.</CardDescription>
                     <Button onClick={handleGenerateRandom}>Generate Random Verse</Button>
                 </Card>
             ) : (
                 // Display the verse using the VerseDisplay component
                 <VerseDisplay
                     surah={currentSurahDetails}
                     currentVerse={currentVerse}
                     previousVerses={previousVerses}
                     onGenerateRandom={handleGenerateRandom}
                     onNavigate={handleNavigate}
                     // Pass range limits for disabling navigation buttons correctly
                     rangeStart={currentConfig.startVerse}
                     rangeEnd={currentConfig.endVerse}
                 />
            )}
        </div>
    </main>
  );
}
