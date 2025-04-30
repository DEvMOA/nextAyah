// src/components/quran/VerseDisplay.tsx
'use client';

import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Verse, Surah } from '@/services/quran';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

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

  // Determine navigation bounds based on the provided range
  const canNavigatePrevious = currentVerse ? currentVerse.id > rangeStart : false;
  const canNavigateNext = currentVerse ? currentVerse.id < rangeEnd : false;


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
        {/* Removed the Previous Verses section */}
        {currentVerse ? (
          <div className="space-y-4 p-4 border rounded-md bg-card shadow">
            <p lang="ar" dir="rtl" className="text-2xl font-medium text-right mb-2">{currentVerse.arabicText}</p>
            <p className="text-lg italic">"{currentVerse.translation}"</p>
            <p className="text-sm text-muted-foreground">({surah.transliteration} {surah.id}:{currentVerse.id})</p>
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
