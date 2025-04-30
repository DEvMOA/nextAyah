// src/components/quran/VerseDisplay.tsx
'use client';

import type * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Verse, Surah } from '@/services/quran';
import { getVerseAudioUrl } from '@/services/quran';
import { ChevronLeft, ChevronRight, RefreshCw, Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider'; // Import Slider for volume control

interface VerseDisplayProps {
  surah: Surah;
  currentVerse: Verse | null;
  previousVerses: Verse[]; // Although removed from display, keep prop for potential future use or internal logic
  onGenerateRandom: () => void;
  onNavigate: (direction: 'previous' | 'next') => void;
  rangeStart?: number; // Optional: Start of the allowed verse range
  rangeEnd?: number;   // Optional: End of the allowed verse range
}

export function VerseDisplay({
  surah,
  currentVerse,
  previousVerses, // Prop remains but is not used for rendering this section anymore
  onGenerateRandom,
  onNavigate,
  rangeStart = 1, // Default to full Surah range if not provided
  rangeEnd = surah.verseCount, // Default to full Surah range if not provided
}: VerseDisplayProps) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7); // Initial volume (0 to 1)
  const [isMuted, setIsMuted] = useState(false);

  // Determine navigation bounds based on the provided range
  const canNavigatePrevious = currentVerse ? currentVerse.id > rangeStart : false;
  const canNavigateNext = currentVerse ? currentVerse.id < rangeEnd : false;

  // Fetch audio URL when currentVerse changes
  useEffect(() => {
    if (currentVerse?.verseKey) {
      setIsLoadingAudio(true);
      setAudioUrl(null); // Reset previous URL
      getVerseAudioUrl(currentVerse.verseKey)
        .then(url => {
          setAudioUrl(url);
          // If audio element exists, update its source
          if (audioRef.current) {
            audioRef.current.src = url;
          }
        })
        .catch(error => {
          console.error("Error fetching audio URL:", error);
          toast({
            title: "Audio Unavailable",
            description: `Could not load audio for ${currentVerse.verseKey}.`,
            variant: "destructive",
          });
          setAudioUrl(null);
        })
        .finally(() => setIsLoadingAudio(false));
    } else {
      setAudioUrl(null); // Clear URL if no verse
      setIsLoadingAudio(false);
    }
     // Stop playing when verse changes
     if (audioRef.current) {
        audioRef.current.pause();
     }
     setIsPlaying(false);

  }, [currentVerse, toast]);


  // Audio ended event handler
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to beginning
    }
  }, []);

  // Setup audio element and event listener
  useEffect(() => {
     if (audioUrl && !audioRef.current) {
      // Create audio element only if it doesn't exist and URL is available
      audioRef.current = new Audio(audioUrl);
      audioRef.current.volume = isMuted ? 0 : volume; // Set initial volume/mute state
      audioRef.current.addEventListener('ended', handleAudioEnded);
    } else if (audioUrl && audioRef.current && audioRef.current.src !== audioUrl) {
      // If element exists but URL changed, update src and reset state
      audioRef.current.src = audioUrl;
      audioRef.current.pause();
      setIsPlaying(false);
      // Ensure listener is attached (might be removed if element was recreated)
      audioRef.current.removeEventListener('ended', handleAudioEnded);
      audioRef.current.addEventListener('ended', handleAudioEnded);
    } else if (!audioUrl && audioRef.current) {
       // If URL becomes null, clean up
       audioRef.current.pause();
       audioRef.current.removeEventListener('ended', handleAudioEnded);
       audioRef.current = null; // Allow GC
       setIsPlaying(false);
    }

    // Cleanup function to remove listener when component unmounts or URL becomes null
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('ended', handleAudioEnded);
        // Don't nullify ref here, let the effect that clears the URL handle it
      }
    };
  }, [audioUrl, volume, isMuted, handleAudioEnded]); // Add volume/mute dependencies


  const togglePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
        // Ensure currentTime is 0 if it ended previously
       if (audioRef.current.ended) {
           audioRef.current.currentTime = 0;
       }
      audioRef.current.play().catch(error => {
         console.error("Error playing audio:", error);
         toast({ title: "Playback Error", description: "Could not play audio.", variant: "destructive" });
         setIsPlaying(false); // Ensure state is correct on error
      });
    }
    setIsPlaying(!isPlaying);
  };

   const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (audioRef.current) {
        audioRef.current.volume = vol;
    }
     if (vol > 0 && isMuted) {
         setIsMuted(false); // Unmute if volume is adjusted above 0
         if (audioRef.current) audioRef.current.muted = false;
     } else if (vol === 0 && !isMuted) {
         setIsMuted(true); // Mute if volume is set to 0
          if (audioRef.current) audioRef.current.muted = true;
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
       // If muting, reflect volume visually as 0 without changing the underlying volume state
    }
  };


  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-semibold">{surah.name} ({surah.transliteration})</CardTitle>
        {/* Display the specific range being used */}
        <CardDescription>
             Verses {rangeStart} - {rangeEnd} (of {surah.verseCount})
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {currentVerse ? (
          <div className="space-y-4 p-4 border rounded-md bg-card shadow">
            <p lang="ar" dir="rtl" className="text-2xl font-medium text-right mb-2">{currentVerse.arabicText}</p>
            <p className="text-lg italic">"{currentVerse.translation}"</p>
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
               <p className="text-sm text-muted-foreground">({surah.transliteration} {surah.id}:{currentVerse.id})</p>
               {/* Audio Controls */}
               <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlayPause}
                    disabled={isLoadingAudio || !audioUrl}
                    aria-label={isPlaying ? "Pause verse audio" : "Play verse audio"}
                  >
                    {isLoadingAudio ? <Loader2 className="h-5 w-5 animate-spin" /> : isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
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
                    value={[isMuted ? 0 : volume]} // Reflect mute state visually
                    max={1}
                    step={0.05}
                    className="w-[100px]"
                    onValueChange={handleVolumeChange}
                    aria-label="Volume control"
                    />
               </div>
            </div>
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
