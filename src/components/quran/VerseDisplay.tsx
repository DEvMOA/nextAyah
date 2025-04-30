// src/components/quran/VerseDisplay.tsx
'use client';

import type * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Verse, Surah } from '@/services/quran';
import { getVerseAudioUrl } from '@/services/quran';
import { ChevronLeft, ChevronRight, RefreshCw, Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils'; // Import cn for conditional classes

interface VerseDisplayProps {
  surah: Surah;
  currentVerse: Verse | null;
  previousVerses: Verse[];
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
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null); // State for playback errors


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


  // Fetch audio URL when currentVerse changes
  useEffect(() => {
    stopAndResetAudio(); // Stop previous audio immediately
    setAudioUrl(null); // Reset URL state
    setPlaybackError(null); // Clear previous errors

    if (currentVerse?.verseKey) {
      setIsLoadingAudio(true);
      getVerseAudioUrl(currentVerse.verseKey)
        .then(url => {
          setAudioUrl(url);
          // Preload the audio metadata. Consider 'auto' if immediate playback is likely.
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.preload = 'metadata';
          }
        })
        .catch(error => {
          console.error("Error fetching audio URL:", error);
          const errorMessage = error instanceof Error ? error.message : 'Could not load audio.';
          setPlaybackError(errorMessage); // Store error message
          toast({
            title: "Audio Unavailable",
            description: errorMessage,
            variant: "destructive",
          });
          setAudioUrl(null);
        })
        .finally(() => setIsLoadingAudio(false));
    } else {
      setIsLoadingAudio(false); // No verse, so not loading
    }
  }, [currentVerse, toast, stopAndResetAudio]); // Include stopAndResetAudio


  // Audio ended event handler
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to beginning
    }
  }, []);

  // Setup audio element and event listeners
  useEffect(() => {
    let currentAudio = audioRef.current; // Capture ref value

    if (audioUrl && !currentAudio) {
      // Create audio element only if it doesn't exist and URL is available
      const newAudio = new Audio(audioUrl);
      newAudio.volume = isMuted ? 0 : volume;
      newAudio.muted = isMuted;
      newAudio.preload = 'metadata'; // Preload metadata
      newAudio.addEventListener('ended', handleAudioEnded);
       newAudio.addEventListener('error', (e) => {
            console.error("Audio element error:", e);
            const errorMsg = (e.target as HTMLAudioElement)?.error?.message || "Unknown audio error";
            setPlaybackError(`Audio Error: ${errorMsg}`);
            setIsPlaying(false); // Stop trying to play on error
            toast({ title: "Audio Playback Error", description: errorMsg, variant: "destructive"});
        });
      audioRef.current = newAudio;
      currentAudio = newAudio; // Update local variable
    } else if (audioUrl && currentAudio && currentAudio.src !== audioUrl) {
      // If element exists but URL changed, update src and reset state
      currentAudio.src = audioUrl;
      currentAudio.preload = 'metadata'; // Ensure preload is set
      stopAndResetAudio(); // Reset playback state
      // Ensure listeners are attached (remove old, add new)
      currentAudio.removeEventListener('ended', handleAudioEnded);
      currentAudio.addEventListener('ended', handleAudioEnded);
      // Consider re-attaching error listener if needed
    } else if (!audioUrl && currentAudio) {
       // If URL becomes null, clean up
       stopAndResetAudio();
       currentAudio.removeEventListener('ended', handleAudioEnded);
       currentAudio.removeEventListener('error', () => {}); // Remove error listener
       audioRef.current = null; // Allow GC
    }

    // Update volume and mute state if element exists
    if (currentAudio) {
        currentAudio.volume = volume;
        currentAudio.muted = isMuted;
    }


    // Cleanup function
    return () => {
      const audio = audioRef.current; // Use ref directly in cleanup
      if (audio) {
        // Don't pause here necessarily, let the next effect handle it or unmount do it
        audio.removeEventListener('ended', handleAudioEnded);
        audio.removeEventListener('error', () => {}); // Clean up error listener too
      }
    };
  }, [audioUrl, volume, isMuted, handleAudioEnded, stopAndResetAudio, toast]); // Added dependencies


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
            onClick={audioUrl && !playbackError ? togglePlayPause : undefined} // Make text clickable for play/pause
             role={audioUrl && !playbackError ? "button" : undefined}
             aria-label={audioUrl && !playbackError ? (isPlaying ? "Pause verse audio" : "Play verse audio") : undefined}
             tabIndex={audioUrl && !playbackError ? 0 : -1} // Make it focusable if clickable
             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { togglePlayPause(); e.preventDefault(); }}} // Keyboard accessibility
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

    