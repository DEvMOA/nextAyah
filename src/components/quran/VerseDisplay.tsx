// src/components/quran/VerseDisplay.tsx
'use client';

import type * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Verse, Surah } from '@/services/quran';
import { ChevronLeft, ChevronRight, RefreshCw, Play, Pause, Volume2, VolumeX, Loader2, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils'; // Import cn for conditional classes
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components

interface VerseDisplayProps {
  surah: Surah;
  currentVerse: Verse | null;
  previousVerses: Verse[]; // Keep prop for potential future features
  onGenerateRandom: () => void;
  onNavigate: (direction: 'previous' | 'next') => void;
  rangeStart?: number;
  rangeEnd?: number;
  reciterName?: string; // Add optional reciter name
  translationName?: string; // Add optional translation name
}

export function VerseDisplay({
  surah,
  currentVerse,
  previousVerses, // Keep prop
  onGenerateRandom,
  onNavigate,
  rangeStart = 1,
  rangeEnd = surah.verseCount,
  reciterName,
  translationName,
}: VerseDisplayProps) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const audioUrl = currentVerse?.audioUrl;

  const canNavigatePrevious = currentVerse ? currentVerse.id > rangeStart : false;
  const canNavigateNext = currentVerse ? currentVerse.id < rangeEnd : false;

  // Function to stop and reset audio
  const stopAndResetAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // Audio ended event handler - defined using useCallback
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to beginning
    }
  }, []);

  // Effect to handle changes in audioUrl (when currentVerse changes) and setup audio element
  useEffect(() => {
    stopAndResetAudio(); // Stop previous audio immediately
    setPlaybackError(null); // Clear previous errors
    setIsLoadingAudio(false); // Reset loading state

    if (audioUrl) {
       setIsLoadingAudio(true); // Indicate loading while setting up
       const newAudio = new Audio(audioUrl);
       audioRef.current = newAudio;

       // Set initial properties
       newAudio.volume = isMuted ? 0 : volume;
       newAudio.muted = isMuted;
       newAudio.preload = 'metadata'; // Start loading metadata

       // Event listeners
       const handleLoadedMetadata = () => setIsLoadingAudio(false);
       const handleError = (e: Event | string) => { // Can receive Event or string
            const audioEl = audioRef.current; // Use the ref which should be the target
            let errorMsg = "Unknown audio error";
            let errorCode: number | string = 'N/A';

            console.error("Audio element error event:", e); // Log the raw event/string

            if (audioEl && audioEl.error) {
                 console.error("Audio error code:", audioEl.error.code);
                 console.error("Audio error message:", audioEl.error.message);
                 errorCode = audioEl.error.code;
                 errorMsg = audioEl.error.message || errorMsg; // Prefer message from error object
            } else if (typeof e === 'string') {
                 // Handle cases where the error might be passed as a string (less common)
                 errorMsg = e;
            }

           const detailedErrorMsg = `Audio Error (${errorCode}): ${errorMsg}`;
           setPlaybackError(detailedErrorMsg);
           setIsPlaying(false);
           setIsLoadingAudio(false);
           toast({ title: "Audio Playback Error", description: detailedErrorMsg, variant: "destructive"});
       };


       newAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
       newAudio.addEventListener('ended', handleAudioEnded); // Use the stable callback
       newAudio.addEventListener('error', handleError); // Attach error handler

       // Sometimes errors happen before 'error' event (e.g., 404)
       // Try to catch network errors during load initiation
       newAudio.load(); // Explicitly call load (though constructor/setting src usually does this)
        newAudio.addEventListener('stalled', () => {
             console.warn("Audio stalled"); // May indicate network issues
             // Optionally set loading state or provide feedback
        });
         newAudio.addEventListener('suspend', () => {
             console.warn("Audio suspended"); // Loading suspended by browser
        });


       // Cleanup function
       return () => {
           stopAndResetAudio(); // Ensure audio stops on component unmount or verse change
           if (newAudio) { // Check if newAudio exists before removing listeners
                newAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                newAudio.removeEventListener('ended', handleAudioEnded);
                newAudio.removeEventListener('error', handleError);
                newAudio.removeEventListener('stalled', () => console.warn("Audio stalled listener removed"));
                newAudio.removeEventListener('suspend', () => console.warn("Audio suspend listener removed"));

                // Explicitly remove src to potentially help stop network activity
                newAudio.src = '';
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                newAudio.onerror = () => {}; // Prevent late errors after cleanup
           }
           audioRef.current = null; // Help with garbage collection
       };
    } else {
        // No audio URL for this verse
        setIsLoadingAudio(false); // Ensure loading is off
        if (audioRef.current) {
            // If an old audio element exists, clean it up
            stopAndResetAudio();
            audioRef.current = null;
        }
    }
  // Dependencies: Ensure effect runs when audioUrl changes, or when related state changes require re-setup (though volume/mute are handled separately now)
  // handleAudioEnded is stable due to useCallback. stopAndResetAudio is also stable.
  }, [audioUrl, isMuted, volume, stopAndResetAudio, handleAudioEnded, toast]);


  // Effect to update volume and mute state on the current audio element
  useEffect(() => {
      const currentAudio = audioRef.current;
      if (currentAudio) {
          currentAudio.volume = isMuted ? 0 : volume;
          currentAudio.muted = isMuted;
      }
  }, [volume, isMuted]);


 const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !audioUrl || isLoadingAudio || playbackError) return;

    const audio = audioRef.current;

    if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
    } else {
        // Ensure currentTime is 0 if it ended previously or starting fresh
        if (audio.currentTime === audio.duration || audio.currentTime === 0) {
            audio.currentTime = 0;
        }
        setPlaybackError(null); // Optimistically clear previous error
        setIsLoadingAudio(true); // Show loading while play() is resolving

        audio.play().then(() => {
            setIsPlaying(true);
            setIsLoadingAudio(false); // Stop loading on successful play start
        }).catch(error => {
             const audioEl = audioRef.current;
            console.error("Error playing audio:", error);
             let errorMsg = error instanceof Error ? error.message : "Could not play audio.";
             let errorCode: number | string = 'N/A';
             if (audioEl && audioEl.error) {
                 errorCode = audioEl.error.code;
                 errorMsg = audioEl.error.message || errorMsg;
             }
            const detailedErrorMsg = `Playback Error (${errorCode}): ${errorMsg}`;
            setPlaybackError(detailedErrorMsg);
            toast({ title: "Playback Failed", description: detailedErrorMsg, variant: "destructive" });
            setIsPlaying(false); // Ensure state is correct on error
            setIsLoadingAudio(false); // Stop loading on error
        });
    }
}, [audioUrl, isLoadingAudio, isPlaying, playbackError, toast]);


   const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    // We no longer need to directly set audioRef.current.volume here
    // as the separate useEffect handles it based on the 'volume' state.

    // Adjust mute state based on volume
    if (vol > 0 && isMuted) {
        setIsMuted(false);
    } else if (vol === 0 && !isMuted) {
         setIsMuted(true);
    }
  };

   const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    // No direct audioRef manipulation needed here either.

    // If unmuting and volume was 0, set a default volume
    if (!newMutedState && volume === 0) {
       const defaultVol = 0.5;
       setVolume(defaultVol); // This will trigger the volume useEffect
    }
  };


  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-semibold">{surah.name} ({surah.transliteration}) - "{surah.translatedName}"</CardTitle>
        <CardDescription>
             Displaying Verse {currentVerse?.id} (Range: {rangeStart}-{rangeEnd} of {surah.verseCount})
             <br /> {/* Line break for clarity */}
             <span className="text-xs">
                Reciter: {reciterName || 'Default'} | Translation: {translationName || 'Default'}
             </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {currentVerse ? (
          <div
            className={cn(
                "space-y-4 p-4 border rounded-md bg-card shadow",
                // Make clickable only if audio is ready and playable
                audioUrl && !playbackError ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""
            )}
            // Only allow click to play/pause if audio is supposed to be available and no error occurred
            onClick={audioUrl && !playbackError ? togglePlayPause : undefined}
            role={audioUrl && !playbackError ? "button" : undefined}
            aria-label={audioUrl && !playbackError ? (isPlaying ? "Pause verse audio" : "Play verse audio") : undefined}
            tabIndex={audioUrl && !playbackError ? 0 : -1}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { audioUrl && !playbackError && togglePlayPause(); e.preventDefault(); }}}
          >
            <p lang="ar" dir="rtl" className="text-2xl font-medium text-right mb-2">{currentVerse.arabicText}</p>
            <p className="text-lg italic">"{currentVerse.translation}"</p>
            <div className="flex justify-between items-center mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()} >
               <p className="text-sm text-muted-foreground">({surah.transliteration} {surah.id}:{currentVerse.id})</p>
               {/* Audio Controls */}
               <div className="flex items-center gap-3">
                   {/* Display Button or Loading/Error Indicator */}
                  {isLoadingAudio ? (
                     <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                   ) : playbackError ? (
                       <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <AlertTriangle className="h-5 w-5 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                     <p>{playbackError}</p>
                                </TooltipContent>
                            </Tooltip>
                       </TooltipProvider>
                    ) : audioUrl ? ( // Only show controls if URL exists and no error
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={togglePlayPause}
                                aria-label={isPlaying ? "Pause verse audio" : "Play verse audio"}
                            >
                                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 text-primary" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMute}
                                aria-label={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                            </Button>
                            <Slider
                                value={[isMuted ? 0 : volume]}
                                max={1}
                                step={0.05}
                                className={cn("w-[100px]")}
                                onValueChange={handleVolumeChange}
                                aria-label="Volume control"
                            />
                        </>
                    ) : (
                         <span className="text-xs text-muted-foreground">No audio</span>
                    )}
               </div>
            </div>
             {/* Moved error display out of main clickable area if needed */}
             {/* {playbackError && (
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Audio Error</AlertTitle>
                    <AlertDescription>{playbackError}</AlertDescription>
                </Alert>
            )} */}
              {/* Display "Audio not available" if URL is missing AND not loading */}
               {!audioUrl && !isLoadingAudio && !playbackError && (
                 <p className="text-xs text-muted-foreground text-center mt-2">Audio not available for this verse/reciter.</p>
             )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10">Click "Generate Random Verse" to display a verse.</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center border-t pt-4">
        <Button
          variant="outline"
          onClick={() => onNavigate('previous')}
          disabled={!canNavigatePrevious}
          aria-label="Previous Verse"
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> Previous
        </Button>
        <Button onClick={onGenerateRandom} variant="secondary" aria-label="Generate Random Verse">
           <RefreshCw className="h-4 w-4 mr-2" /> New Random Verse
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate('next')}
          disabled={!canNavigateNext}
          aria-label="Next Verse"
        >
           Next <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
