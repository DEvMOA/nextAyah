// src/components/quran/VerseDisplay.tsx
'use client';

import type * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Verse, Surah } from '@/services/quran';
// Removed import for getVerseAudioUrl as it's no longer used
import { ChevronLeft, ChevronRight, RefreshCw, Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils'; // Import cn for conditional classes

interface VerseDisplayProps {
  surah: Surah;
  currentVerse: Verse | null;
  previousVerses: Verse[]; // Keep prop even if unused for potential future features
  onGenerateRandom: () => void;
  onNavigate: (direction: 'previous' | 'next') => void;
  rangeStart?: number;
  rangeEnd?: number;
}

export function VerseDisplay({
  surah,
  currentVerse,
  previousVerses, // Keep prop even if unused for potential future features
  onGenerateRandom,
  onNavigate,
  rangeStart = 1,
  rangeEnd = surah.verseCount,
}: VerseDisplayProps) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false); // Keep for potential initial load/buffering indication if needed
  // Removed audioUrl state, use currentVerse.audioUrl directly
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null); // State for playback errors

  const audioUrl = currentVerse?.audioUrl; // Get audio URL directly from the verse object

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

  // Effect to handle changes in audioUrl (when currentVerse changes)
  useEffect(() => {
    stopAndResetAudio(); // Stop previous audio immediately
    setPlaybackError(null); // Clear previous errors
    setIsLoadingAudio(false); // Reset loading state

    if (audioUrl) {
       // No need to fetch, just prepare the audio element
       setIsLoadingAudio(true); // Show loading briefly while setting up
       if (audioRef.current) {
            // If element exists, update src and preload
            audioRef.current.src = audioUrl;
            audioRef.current.preload = 'metadata';
             // Add load listener to turn off loading indicator
            const handleLoadedMetadata = () => setIsLoadingAudio(false);
            audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
            // Add error listener within this effect
            const handleError = (e: Event) => {
                console.error("Audio element error:", e);
                const errorMsg = (e.target as HTMLAudioElement)?.error?.message || "Unknown audio error";
                setPlaybackError(`Audio Error: ${errorMsg}`);
                setIsPlaying(false); // Stop trying to play on error
                setIsLoadingAudio(false);
                toast({ title: "Audio Playback Error", description: errorMsg, variant: "destructive"});
            };
            audioRef.current.addEventListener('error', handleError);

            return () => {
                 // Cleanup listeners
                if (audioRef.current){
                    audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
                    audioRef.current.removeEventListener('error', handleError);
                }
            }
       } else {
           // If element doesn't exist, create it
            const newAudio = new Audio(audioUrl);
            newAudio.volume = isMuted ? 0 : volume;
            newAudio.muted = isMuted;
            newAudio.preload = 'metadata';
            newAudio.addEventListener('ended', handleAudioEnded);

             const handleLoadedMetadata = () => setIsLoadingAudio(false);
             newAudio.addEventListener('loadedmetadata', handleLoadedMetadata);

            const handleError = (e: Event) => {
                console.error("Audio element error:", e);
                const errorMsg = (e.target as HTMLAudioElement)?.error?.message || "Unknown audio error";
                setPlaybackError(`Audio Error: ${errorMsg}`);
                setIsPlaying(false); // Stop trying to play on error
                 setIsLoadingAudio(false);
                toast({ title: "Audio Playback Error", description: errorMsg, variant: "destructive"});
            };
            newAudio.addEventListener('error', handleError);

            audioRef.current = newAudio;

             return () => {
                 // Cleanup listeners
                if(newAudio){ // Use the created instance in cleanup
                    newAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                    newAudio.removeEventListener('ended', handleAudioEnded);
                    newAudio.removeEventListener('error', handleError);
                }
             }
       }
    } else if (!audioUrl && audioRef.current) {
        // If verse changes to one without audio, cleanup
        stopAndResetAudio();
         // Remove listeners if they were attached
         audioRef.current.removeEventListener('ended', handleAudioEnded);
         // Consider removing error listener if it was attached elsewhere or robustly
        audioRef.current = null; // Allow GC
    } else {
        // No audioUrl and no audio element, ensure loading is false
        setIsLoadingAudio(false);
    }

  }, [audioUrl, stopAndResetAudio, isMuted, volume, toast]); // Dependencies updated


  // Audio ended event handler
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to beginning
    }
  }, []);

  // Setup audio element volume/mute state and add/remove 'ended' listener based on audioRef.current existence
  useEffect(() => {
    const currentAudio = audioRef.current; // Capture ref value

    if (currentAudio) {
        // Update volume and mute state
        currentAudio.volume = volume;
        currentAudio.muted = isMuted;

        // Add ended listener
        currentAudio.addEventListener('ended', handleAudioEnded);
    }

    // Cleanup function to remove the ended listener
    return () => {
      if (currentAudio) {
        currentAudio.removeEventListener('ended', handleAudioEnded);
      }
    };
  }, [volume, isMuted, handleAudioEnded]); // Only depend on state affecting the audio element directly and the handler


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
        audio.play().then(() => {
            setIsPlaying(true);
            setPlaybackError(null); // Clear error on successful play
        }).catch(error => {
            console.error("Error playing audio:", error);
            const errorMsg = error instanceof Error ? error.message : "Could not play audio.";
            setPlaybackError(errorMsg);
            toast({ title: "Playback Error", description: errorMsg, variant: "destructive" });
            setIsPlaying(false); // Ensure state is correct on error
        });
    }
}, [audioUrl, isLoadingAudio, isPlaying, playbackError, toast]);


   const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (audioRef.current) {
        audioRef.current.volume = vol;
        // If volume is adjusted above 0, unmute
        if (vol > 0 && isMuted) {
            setIsMuted(false);
            audioRef.current.muted = false;
        }
        // If volume is set to 0, mute
        else if (vol === 0 && !isMuted) {
             setIsMuted(true);
             audioRef.current.muted = true;
        }
    }
  };

   const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (audioRef.current) {
      audioRef.current.muted = newMutedState;
       // If unmuting and volume was 0, set a default volume
       if (!newMutedState && volume === 0) {
          const defaultVol = 0.5;
          setVolume(defaultVol);
          audioRef.current.volume = defaultVol;
       }
    }
  };


  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-semibold">{surah.name} ({surah.transliteration})</CardTitle>
        <CardDescription>
             Verses {rangeStart} - {rangeEnd} (of {surah.verseCount})
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {currentVerse ? (
          <div
            className={cn(
                "space-y-4 p-4 border rounded-md bg-card shadow",
                // Add cursor pointer only when audio is available and not errored
                audioUrl && !playbackError && !isLoadingAudio ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""
            )}
            onClick={audioUrl && !playbackError && !isLoadingAudio ? togglePlayPause : undefined} // Make text clickable for play/pause, check loading state
             role={audioUrl && !playbackError ? "button" : undefined}
             aria-label={audioUrl && !playbackError ? (isPlaying ? "Pause verse audio" : "Play verse audio") : undefined}
             tabIndex={audioUrl && !playbackError ? 0 : -1} // Make it focusable if clickable
             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { audioUrl && !playbackError && !isLoadingAudio && togglePlayPause(); e.preventDefault(); }}} // Keyboard accessibility, check loading state
          >
            <p lang="ar" dir="rtl" className="text-2xl font-medium text-right mb-2">{currentVerse.arabicText}</p>
            <p className="text-lg italic">"{currentVerse.translation}"</p>
            <div className="flex justify-between items-center mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()} > {/* Prevent controls click from bubbling to card */}
               <p className="text-sm text-muted-foreground">({surah.transliteration} {surah.id}:{currentVerse.id})</p>
               {/* Audio Controls */}
               <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlayPause}
                    disabled={isLoadingAudio || !audioUrl || !!playbackError} // Disable on error too
                    aria-label={isPlaying ? "Pause verse audio" : "Play verse audio"}
                  >
                    {isLoadingAudio ? <Loader2 className="h-5 w-5 animate-spin" /> : isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 text-primary" />}
                  </Button>
                   <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                     disabled={!audioUrl || !!playbackError} // Disable on error
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                   <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.05}
                    className={cn("w-[100px]", !audioUrl || !!playbackError ? 'opacity-50 cursor-not-allowed' : '')}
                    onValueChange={handleVolumeChange}
                    aria-label="Volume control"
                     disabled={!audioUrl || !!playbackError} // Disable on error
                    />
               </div>
            </div>
             {playbackError && (
                <p className="text-xs text-destructive text-center mt-2">{playbackError}</p>
            )}
              {!audioUrl && !isLoadingAudio && !playbackError && ( // Show message if audio is definitively unavailable
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
