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
  previousVerses: Verse[];
  onGenerateRandom: () => void;
  onNavigate: (direction: 'previous' | 'next') => void;
}

export function VerseDisplay({
  surah,
  currentVerse,
  previousVerses,
  onGenerateRandom,
  onNavigate,
}: VerseDisplayProps) {

  const canNavigatePrevious = currentVerse ? currentVerse.id > 1 : false;
  const canNavigateNext = currentVerse ? currentVerse.id < surah.verseCount : false;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-semibold">{surah.name} ({surah.transliteration})</CardTitle>
        <CardDescription>{surah.verseCount} verses</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {previousVerses.length > 0 && (
          <div>
            <h3 className="text-md font-medium mb-2 text-muted-foreground">Previous Verses:</h3>
            <ScrollArea className="h-40 border rounded-md p-4 bg-secondary/50">
              <div className="space-y-4">
                {previousVerses.map((verse) => (
                  <div key={verse.id} className="text-sm border-b pb-2 last:border-b-0">
                     <p lang="ar" dir="rtl" className="text-lg mb-1 text-right">{verse.arabicText}</p>
                     <p className="text-muted-foreground italic">"{verse.translation}"</p>
                     <p className="text-xs text-muted-foreground mt-1">({surah.transliteration} {surah.id}:{verse.id})</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        {currentVerse ? (
          <div className="space-y-4 p-4 border rounded-md bg-card shadow">
            <p lang="ar" dir="rtl" className="text-2xl font-medium text-right mb-2">{currentVerse.arabicText}</p>
            <p className="text-lg italic">"{currentVerse.translation}"</p>
            <p className="text-sm text-muted-foreground">({surah.transliteration} {surah.id}:{currentVerse.id})</p>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Click "Generate Random Verse" to start.</p>
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
           <RefreshCw className="h-4 w-4 mr-2" /> Random Verse
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
