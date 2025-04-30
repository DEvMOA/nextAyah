// src/components/quran/SurahSelector.tsx
'use client';

import type * as React from 'react';
import { useState, useMemo, type ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Surah } from '@/services/quran';
import { Search } from 'lucide-react';

interface SurahSelectorProps {
  surahs: Surah[];
  selectedSurah: Surah | null;
  onSelectSurah: (surah: Surah) => void;
}

export function SurahSelector({ surahs, selectedSurah, onSelectSurah }: SurahSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredSurahs = useMemo(() => {
    if (!searchTerm) {
      return surahs;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return surahs.filter(
      (surah) =>
        surah.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        surah.transliteration.toLowerCase().includes(lowerCaseSearchTerm) ||
        surah.id.toString().includes(lowerCaseSearchTerm)
    );
  }, [surahs, searchTerm]);

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-semibold">Select Surah</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search Surahs by name, transliteration, or number..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
            aria-label="Search Surahs"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="p-4 space-y-2">
            {filteredSurahs.length > 0 ? (
              filteredSurahs.map((surah) => (
                <Button
                  key={surah.id}
                  variant={selectedSurah?.id === surah.id ? 'default' : 'outline'}
                  onClick={() => onSelectSurah(surah)}
                  className="w-full justify-start text-left h-auto py-2"
                  aria-pressed={selectedSurah?.id === surah.id}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                        {surah.id}
                      </span>
                      <div>
                        <p className="font-medium">{surah.name}</p>
                        <p className="text-xs text-muted-foreground">{surah.transliteration}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{surah.verseCount} verses</p>
                  </div>
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center">No Surahs found.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
