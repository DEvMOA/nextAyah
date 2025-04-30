// src/services/quran.ts

import type { Surah, Verse } from '@/types/quran'; // Import types

const API_BASE_URL = 'https://api.quran.com/api/v4';

// --- API Response Types (Internal) ---
interface ApiChapter {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: [number, number];
  translated_name: {
    language_name: string;
    name: string;
  };
}

interface ApiVerseTranslation {
    id: number;
    language_name: string;
    text: string;
    resource_name: string | null;
    resource_id: number;
}

interface ApiVerse {
    id: number;
    verse_number: number;
    verse_key: string;
    juz_number: number;
    hizb_number: number;
    rub_el_hizb_number: number;
    ruku_number: number;
    manzil_number: number;
    page_number: number;
    text_uthmani: string;
    translations: ApiVerseTranslation[];
}

interface ChaptersListResponse {
    chapters: ApiChapter[];
}

interface ChapterResponse {
    chapter: ApiChapter;
}

interface VerseResponse {
    verse: ApiVerse;
}

interface ApiAudioFile {
    id: number;
    chapter_id: number;
    file_size: number;
    format: string;
    audio_url: string; // Changed from url to audio_url based on potential API structure
    duration: number;
    verse_timings: unknown[]; // Type according to actual data if needed
}

interface ApiAudioResponse {
    audio_files: ApiAudioFile[];
}

// --- End API Response Types ---


// Helper function to fetch data with error handling
async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Try to parse error response, but handle cases where it might not be JSON
      let errorMessage = `Failed to fetch data (Status: ${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = `API Error (${response.status}): ${errorData?.error || errorData?.message || 'Unknown API error'}`;
      } catch (jsonError) {
         // If response is not JSON, use the status text
         errorMessage = `API Error (${response.status}): ${response.statusText || 'Failed to fetch data'}`;
      }
      throw new Error(errorMessage);
    }
    return await response.json() as T;
  } catch (error) {
    console.error(`Fetch error for URL ${url}:`, error);
    // Ensure the error thrown is an Error object
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(String(error) || 'An unknown fetch error occurred');
    }
  }
}


/**
 * Retrieves a list of all Surahs.
 *
 * @returns A promise that resolves to an array of Surah objects.
 */
export async function getSurahList(): Promise<Surah[]> {
  // Fetch chapters with English language specified
  const data = await fetchData<ChaptersListResponse>(`${API_BASE_URL}/chapters?language=en`);

  // Map the API response to our Surah interface
  return data.chapters.map((chapter: ApiChapter): Surah => ({
    id: chapter.id,
    name: chapter.name_arabic,
    verseCount: chapter.verses_count,
    transliteration: chapter.name_simple,
    revelationPlace: chapter.revelation_place,
    translatedName: chapter.translated_name.name,
  }));
}

/**
 * Retrieves details for a specific Surah.
 *
 * @param surahId The ID (chapter number) of the Surah.
 * @returns A promise that resolves to a Surah object.
 */
export async function getSurahDetails(surahId: number): Promise<Surah> {
  if (isNaN(surahId) || surahId < 1 || surahId > 114) {
      throw new Error(`Invalid Surah ID: ${surahId}`);
  }
  const data = await fetchData<ChapterResponse>(`${API_BASE_URL}/chapters/${surahId}?language=en`);
  const chapter = data.chapter;

  // Add validation in case API returns unexpected empty object for a valid ID
  if (!chapter || !chapter.id) {
    throw new Error(`Could not find details for Surah ${surahId}.`);
  }


  return {
    id: chapter.id,
    name: chapter.name_arabic,
    verseCount: chapter.verses_count,
    transliteration: chapter.name_simple,
    revelationPlace: chapter.revelation_place,
    translatedName: chapter.translated_name.name,
  };
}


/**
 * Retrieves a specific verse from a Surah, including its English translation.
 *
 * @param surahId The ID (chapter number) of the Surah.
 * @param verseId The ID (verse number) of the verse.
 * @returns A promise that resolves to a Verse object.
 */
export async function getVerse(surahId: number, verseId: number): Promise<Verse> {
   if (isNaN(surahId) || surahId < 1 || surahId > 114 || isNaN(verseId) || verseId < 1) {
       throw new Error(`Invalid Surah or Verse ID: ${surahId}:${verseId}`);
   }
  // Fetch the specific verse with fields for Arabic text and English translation (ID 131 for Saheeh International)
  const data = await fetchData<VerseResponse>(
    `${API_BASE_URL}/verses/by_key/${surahId}:${verseId}?language=en&words=false&translations=131&fields=text_uthmani`
  );

  const verseData = data.verse;

   // Basic validation in case the API returns unexpected data for a valid-looking key
   if (!verseData || !verseData.verse_number || verseData.verse_number !== verseId) {
       throw new Error(`Verse ${surahId}:${verseId} not found or invalid response.`);
   }

  const translationText = verseData.translations?.[0]?.text || 'Translation not available.';

  // Clean up HTML entities sometimes present in translations
  const cleanedTranslation = translationText.replace(/<[^>]*>?/gm, '');

  return {
    id: verseData.verse_number,
    arabicText: verseData.text_uthmani,
    translation: cleanedTranslation,
    surahId: surahId, // Use the input surahId
    verseKey: verseData.verse_key, // Add verse_key for audio lookup
  };
}

/**
 * Retrieves the audio URL for a specific verse by a specific reciter.
 *
 * @param verseKey The verse key (e.g., "1:1").
 * @param reciterId The ID of the reciter (default: 7 for Mishary Rashid Alafasy).
 * @returns A promise that resolves to the audio URL string.
 * @throws Error if audio cannot be found or fetched.
 */
export async function getVerseAudioUrl(verseKey: string, reciterId: number = 7): Promise<string> {
    if (!verseKey || !verseKey.includes(':')) {
        throw new Error(`Invalid verse key for audio lookup: ${verseKey}`);
    }
    const data = await fetchData<ApiAudioResponse>(
        `${API_BASE_URL}/recitations/${reciterId}/by_ayah/${verseKey}` // Changed endpoint based on common patterns
    );

    const audioFile = data.audio_files?.[0];

    if (!audioFile || !audioFile.audio_url) {
        throw new Error(`Audio not found for verse ${verseKey} by reciter ${reciterId}.`);
    }

    // The API might return a relative URL, prepend base if needed (adjust base as necessary)
    // Example: If audio_url is /wbw/001_001_001.mp3, prepend https://verses.quran.com/
    // Based on inspection, quran.com seems to use this base for audio.
    const audioBaseUrl = 'https://verses.quran.com/';
    return audioFile.audio_url.startsWith('/')
        ? `${audioBaseUrl}${audioFile.audio_url.substring(1)}`
        : audioFile.audio_url;
}


/**
 * Retrieves a random verse from a Surah within a specified range.
 * Requires Surah details (verse count) to be known or fetched.
 *
 * @param surahId The ID of the Surah.
 * @param startVerse The starting verse number of the range (inclusive).
 * @param endVerse The ending verse number of the range (inclusive).
 * @param knownVerseCount Optional: Provide total verse count to potentially avoid fetching details.
 * @returns A promise that resolves to a Verse object.
 * @throws Error if the range is invalid or verse fetching fails.
 */
export async function getRandomVerseInRange(
    surahId: number,
    startVerse: number,
    endVerse: number,
    knownVerseCount?: number
): Promise<Verse> {
    if (isNaN(surahId) || surahId < 1 || surahId > 114) {
        throw new Error(`Invalid Surah ID for random verse: ${surahId}`);
    }
    if (isNaN(startVerse) || isNaN(endVerse) || startVerse < 1 || endVerse < 1 || startVerse > endVerse) {
         throw new Error(`Invalid verse range: ${startVerse}-${endVerse}`);
    }

    let verseCount = knownVerseCount;

    // If verse count isn't provided or might be outdated, fetch the Surah details
    if (verseCount === undefined || verseCount <= 0) {
        try {
            const surahInfo = await getSurahDetails(surahId); // This includes validation
            verseCount = surahInfo.verseCount;
        } catch (error) {
            console.error(`Error fetching surah info for random verse (Surah ${surahId}):`, error);
            throw new Error(`Could not determine verse count for Surah ${surahId}`);
        }
    }

     // Validate the provided range against the actual verse count
     if (startVerse > verseCount || endVerse > verseCount) {
         throw new Error(`Range ${startVerse}-${endVerse} exceeds max verses (${verseCount}) for Surah ${surahId}`);
     }

    // Generate a random verse number *within the specified range*
    const rangeSize = endVerse - startVerse + 1;
    const randomVerseId = Math.floor(Math.random() * rangeSize) + startVerse;

    // Fetch the randomly selected verse using the existing getVerse function
    return getVerse(surahId, randomVerseId);
}

// Note: The previous `getRandomVerse` function is removed as it's superseded by `getRandomVerseInRange` logic used in the random page.
// If a simple random verse from the *entire* Surah is needed elsewhere, it can be called as:
// getRandomVerseInRange(surahId, 1, surahDetails.verseCount, surahDetails.verseCount)
