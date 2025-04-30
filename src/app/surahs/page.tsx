// src/app/surahs/page.tsx
'use client';

import type * as React from 'react';
import { useState, useEffect } from 'react';
import { SurahSelector } from '@/components/quran/SurahSelector';
import { getSurahList, type Surah } from '@/services/quran';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function SurahsPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [isLoadingSurahs, setIsLoadingSurahs] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSurahs() {
      try {
        setIsLoadingSurahs(true);
        const surahList = await getSurahList();
        setSurahs(surahList);
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
  }, [toast]);

  return (
    <main className="container mx-auto p-4 md:p-8 flex justify-center items-start min-h-screen">
      <div className="w-full max-w-xl">
        {isLoadingSurahs ? (
          <Card className="w-full shadow-lg">
            <CardHeader className="border-b">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-10 w-full mt-2" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 space-y-2 h-96"> {/* Increased height */}
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <SurahSelector surahs={surahs} />
        )}
      </div>
    </main>
  );
}
