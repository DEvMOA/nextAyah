// src/app/surahs/page.tsx
'use client';

import type * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSurahList, type Surah } from '@/services/quran';
import type { SurahConfig } from '@/types/quran';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const LOCAL_STORAGE_KEY = 'quranExplorerConfig';

export default function ConfigurationPage() {
  const [allSurahs, setAllSurahs] = useState<Surah[]>([]);
  const [selectedConfigs, setSelectedConfigs] = useState<SurahConfig[]>([]);
  const [isLoadingSurahs, setIsLoadingSurahs] = useState(true);
  const [errors, setErrors] = useState<Record<number, string>>({}); // Errors per Surah ID
  const { toast } = useToast();
  const router = useRouter();

  // Fetch all Surahs on mount
  useEffect(() => {
    async function fetchSurahs() {
      try {
        setIsLoadingSurahs(true);
        const surahList = await getSurahList();
        setAllSurahs(surahList);
      } catch (error) {
        console.error("Error fetching Surah list:", error);
        toast({
          title: "Error Loading Surahs",
          description: "Failed to load the list of Surahs. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingSurahs(false);
      }
    }
    fetchSurahs();
  }, [toast]);

  // Load saved configuration from local storage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsedConfig: SurahConfig[] = JSON.parse(savedConfig);
         // Basic validation
         if (Array.isArray(parsedConfig) && parsedConfig.every(c => typeof c.surahId === 'number' && typeof c.startVerse === 'number' && typeof c.endVerse === 'number')) {
            setSelectedConfigs(parsedConfig);
         } else {
           console.warn("Invalid config found in local storage.");
           localStorage.removeItem(LOCAL_STORAGE_KEY);
         }
      } catch (error) {
        console.error("Error parsing saved configuration:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear invalid data
      }
    }
  }, []);

  const surahMap = useMemo(() => {
    return new Map(allSurahs.map(s => [s.id, s]));
  }, [allSurahs]);

  const validateRange = useCallback((surahId: number, start: number, end: number): string | null => {
    const surah = surahMap.get(surahId);
    if (!surah) return "Surah details not found.";
    if (isNaN(start) || isNaN(end) || start < 1 || end < 1) return "Verse numbers must be positive.";
    if (start > end) return "Start verse cannot be greater than end verse.";
    if (start > surah.verseCount || end > surah.verseCount) return `Verse range exceeds max verses (${surah.verseCount}).`;
    return null; // No error
  }, [surahMap]);

  const handleSelectSurah = (surahId: number, checked: boolean) => {
    setErrors(prev => ({ ...prev, [surahId]: '' })); // Clear error on change
    if (checked) {
      const surah = surahMap.get(surahId);
      if (surah) {
        // Add new config with default full range
        setSelectedConfigs(prev => [...prev, {
          surahId: surah.id,
          startVerse: 1,
          endVerse: surah.verseCount,
          surahDetails: surah, // Include details
        }]);
      }
    } else {
      // Remove config for this Surah
      setSelectedConfigs(prev => prev.filter(config => config.surahId !== surahId));
    }
  };

  const handleRangeChange = (surahId: number, type: 'start' | 'end', value: string) => {
    const numValue = parseInt(value, 10);
    setSelectedConfigs(prev => prev.map(config => {
      if (config.surahId === surahId) {
        const updatedConfig = {
          ...config,
          [type === 'start' ? 'startVerse' : 'endVerse']: isNaN(numValue) ? 1 : numValue, // Default to 1 if NaN
        };
         // Perform validation after update
         const validationError = validateRange(surahId, updatedConfig.startVerse, updatedConfig.endVerse);
         setErrors(prevErrors => ({ ...prevErrors, [surahId]: validationError || '' }));
        return updatedConfig;
      }
      return config;
    }));
  };

  const handleGoToRandom = () => {
    // Final validation before saving and navigating
    const currentErrors: Record<number, string> = {};
    let hasErrors = false;
    selectedConfigs.forEach(config => {
        const error = validateRange(config.surahId, config.startVerse, config.endVerse);
        if (error) {
            currentErrors[config.surahId] = error;
            hasErrors = true;
        }
    });

     setErrors(currentErrors);

    if (hasErrors) {
      toast({
        title: "Invalid Configuration",
        description: "Please fix the errors in the selected Surah ranges before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (selectedConfigs.length === 0) {
      toast({
        title: "No Surahs Selected",
        description: "Please select at least one Surah and define its verse range.",
        variant: "destructive",
      });
      return;
    }

    // Strip surahDetails before saving to keep local storage light
    const configsToSave = selectedConfigs.map(({ surahDetails, ...rest }) => rest);

    // Save to local storage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configsToSave));

    // Navigate to the random page
    router.push('/random');
  };

  const renderLoadingState = () => (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <Skeleton className="h-7 w-3/4 mb-2" />
        <Skeleton className="h-5 w-1/2" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-3 border rounded">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 flex-grow" />
          </div>
        ))}
      </CardContent>
       <CardFooter className="border-t p-4 flex justify-end">
            <Skeleton className="h-10 w-32" />
        </CardFooter>
    </Card>
  );

  const selectedSurahIds = useMemo(() => new Set(selectedConfigs.map(c => c.surahId)), [selectedConfigs]);

  return (
    <main className="container mx-auto p-4 md:p-8 flex justify-center items-start min-h-screen">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Configure Quran Explorer</CardTitle>
            <CardDescription>Select Surahs and specify verse ranges for random generation.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingSurahs ? (
              renderLoadingState()
            ) : (
              <ScrollArea className="h-[60vh] border-t border-b">
                <div className="p-4 space-y-4">
                  {allSurahs.map((surah) => {
                    const isSelected = selectedSurahIds.has(surah.id);
                    const config = isSelected ? selectedConfigs.find(c => c.surahId === surah.id) : null;
                    const error = errors[surah.id];

                    return (
                      <div key={surah.id} className={`p-4 border rounded-md ${isSelected ? 'bg-muted/30' : ''} ${error ? 'border-destructive' : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`surah-${surah.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectSurah(surah.id, !!checked)}
                              aria-labelledby={`label-${surah.id}`}
                            />
                            <Label htmlFor={`surah-${surah.id}`} id={`label-${surah.id}`} className="cursor-pointer flex flex-col">
                                <span className="font-medium">{surah.id}. {surah.name} ({surah.transliteration})</span>
                                <span className="text-xs text-muted-foreground">{surah.verseCount} verses - {surah.revelationPlace}</span>
                            </Label>
                          </div>
                         </div>

                        {isSelected && config && (
                          <div className="mt-3 pl-8 space-y-3">
                             <div className="flex items-center gap-4">
                                <div className="flex-1 space-y-1">
                                <Label htmlFor={`start-${surah.id}`}>Start Verse</Label>
                                <Input
                                    id={`start-${surah.id}`}
                                    type="number"
                                    min="1"
                                    max={surah.verseCount}
                                    value={config.startVerse}
                                    onChange={(e) => handleRangeChange(surah.id, 'start', e.target.value)}
                                    className={`h-9 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                    aria-describedby={error ? `error-${surah.id}` : undefined}
                                />
                                </div>
                                <div className="flex-1 space-y-1">
                                <Label htmlFor={`end-${surah.id}`}>End Verse</Label>
                                <Input
                                    id={`end-${surah.id}`}
                                    type="number"
                                    min="1"
                                    max={surah.verseCount}
                                    value={config.endVerse}
                                    onChange={(e) => handleRangeChange(surah.id, 'end', e.target.value)}
                                     className={`h-9 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                    aria-describedby={error ? `error-${surah.id}` : undefined}
                                />
                                </div>
                            </div>
                            {error && (
                                <p id={`error-${surah.id}`} className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3"/> {error}
                                </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
           <CardFooter className="p-4 flex justify-end">
                <Button onClick={handleGoToRandom} disabled={isLoadingSurahs}>
                    Go to Random Verse <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>

         {/* Display Summary of Selections */}
          {selectedConfigs.length > 0 && (
            <Card className="w-full shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Selected Surahs & Ranges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {selectedConfigs.sort((a, b) => a.surahId - b.surahId).map(config => {
                         const surah = surahMap.get(config.surahId);
                         const error = errors[config.surahId];
                        return (
                            <div key={config.surahId} className={`flex justify-between items-center p-2 rounded ${error ? 'bg-destructive/10 text-destructive' : ''}`}>
                                <span>{surah ? `${surah.id}. ${surah.transliteration}` : `Surah ${config.surahId}`}</span>
                                <span className="text-sm">
                                    Verses: {config.startVerse} - {config.endVerse}
                                    {error && <span className="ml-2 font-semibold">(Error!)</span>}
                                </span>
                            </div>
                        );
                    })}
                    {Object.values(errors).some(e => e) && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Configuration Errors</AlertTitle>
                            <AlertDescription>
                                Please review the highlighted Surahs above and correct the verse ranges.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        )}
      </div>
    </main>
  );
}
