// src/services/quran.ts

import type { Surah, Verse, Reciter, TranslationInfo } from '@/types/quran'; // Import types

const API_BASE_URL = 'https://api.quran.com/api/v4';
const AUDIO_BASE_URL = 'https://verses.quran.com/'; // Base URL for audio files

// --- Available Reciters ---
// IDs based on https://quran.com/reciters (inspect network requests or common knowledge)
export const availableReciters: Reciter[] = [
    { id: 7, name: "Mishary Rashid Alafasy", style: "Murattal" },
    { id: 1, name: "Abdul Basit Abdul Samad", style: "Mujawwad" },
    { id: 2, name: "Abdur-Rahman as-Sudais", style: "Murattal" },
    { id: 4, name: "Abu Bakr al-Shatri", style: "Murattal" },
    { id: 5, name: "Hani ar-Rifai", style: "Murattal" },
    // Add more as desired
];
export const DEFAULT_RECITER_ID = 7; // Mishary Rashid Alafasy

// --- Available Translations ---
// IDs based on https://quran.com/translations or API docs
export const availableTranslations: TranslationInfo[] = [
    { id: 131, language: "English", name: "Dr. Mustafa Khattab, the Clear Quran", author: "Dr. Mustafa Khattab" },
    { id: 20, language: "English", name: "Saheeh International", author: "Saheeh International" },
    // { id: 33, language: "French", name: "Hamidullah", author: "Muhammad Hamidullah" }, // Removed due to API returning incorrect language text
    // Add more as desired
];
export const DEFAULT_TRANSLATION_ID = 131; // Dr. Mustafa Khattab


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

interface ApiVerseAudio {
    url: string | null; // URL can be null if audio is not available
    segments: unknown[]; // Type according to actual data if needed
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
    audio?: ApiVerseAudio; // Make audio optional
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
  // Fetch chapters with English language specified for metadata like translated name
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
 * Retrieves a specific verse from a Surah, including its translation and audio URL.
 *
 * @param surahId The ID (chapter number) of the Surah.
 * @param verseId The ID (verse number) of the verse.
 * @param translationId The ID of the desired translation.
 * @param reciterId The ID of the reciter for the audio.
 * @returns A promise that resolves to a Verse object.
 */
export async function getVerse(
    surahId: number,
    verseId: number,
    translationId: number = DEFAULT_TRANSLATION_ID,
    reciterId: number = DEFAULT_RECITER_ID
): Promise<Verse> {
   if (isNaN(surahId) || surahId < 1 || surahId > 114 || isNaN(verseId) || verseId < 1) {
       throw new Error(`Invalid Surah or Verse ID: ${surahId}:${verseId}`);
   }
    // Fallback logic: if the selected translationId is not available, use the default.
    if (isNaN(translationId) || !availableTranslations.some(t => t.id === translationId)) {
        console.warn(`Invalid or unavailable translationId ${translationId}, falling back to default ${DEFAULT_TRANSLATION_ID}`);
        translationId = DEFAULT_TRANSLATION_ID;
    }
    // Fallback logic: if the selected reciterId is not available, use the default.
    if (isNaN(reciterId) || !availableReciters.some(r => r.id === reciterId)) {
        console.warn(`Invalid or unavailable reciterId ${reciterId}, falling back to default ${DEFAULT_RECITER_ID}`);
        reciterId = DEFAULT_RECITER_ID;
    }

  // Fetch the specific verse with fields for Arabic text, the specified translation, and audio
  const data = await fetchData<VerseResponse>(
    `${API_BASE_URL}/verses/by_key/${surahId}:${verseId}?language=en&words=false&translations=${translationId}&fields=text_uthmani,audio&audio=${reciterId}`
  );

  const verseData = data.verse;

   // Basic validation in case the API returns unexpected data for a valid-looking key
   if (!verseData || !verseData.verse_number || verseData.verse_number !== verseId) {
       throw new Error(`Verse ${surahId}:${verseId} not found or invalid response.`);
   }

   // Log the received translations to help debug API issues
   // console.log(`Translations received for ${verseData.verse_key} (requested ${translationId}):`, verseData.translations);


  // Find the specific translation from the response, fall back if not found
  const translation = verseData.translations?.find(t => t.resource_id === translationId);
  const translationText = translation?.text || 'Translation not available.';

  // Clean up HTML entities sometimes present in translations
  const cleanedTranslation = translationText.replace(/<[^>]*>?/gm, '');

  // Construct audio URL if available
  let audioUrl: string | undefined = undefined;
  const relativeAudioUrl = verseData.audio?.url; // Use optional chaining
  if (relativeAudioUrl) {
    // Prepend base URL if the URL is relative (common case)
    audioUrl = relativeAudioUrl.startsWith('http') ? relativeAudioUrl : `${AUDIO_BASE_URL}${relativeAudioUrl}`;
  } else {
    // Don't throw an error here, just log a warning. The VerseDisplay will handle it.
    // This avoids breaking the UI if just one verse audio is missing.
    console.warn(`Audio URL not found for verse ${verseData.verse_key} with reciter ${reciterId}.`);
  }

  return {
    id: verseData.verse_number,
    arabicText: verseData.text_uthmani,
    translation: cleanedTranslation,
    surahId: surahId, // Use the input surahId
    verseKey: verseData.verse_key,
    audioUrl: audioUrl, // Add the potentially undefined audio URL
  };
}


/**
 * Retrieves a random verse from a Surah within a specified range, using selected settings.
 * Requires Surah details (verse count) to be known or fetched.
 *
 * @param surahId The ID of the Surah.
 * @param startVerse The starting verse number of the range (inclusive).
 * @param endVerse The ending verse number of the range (inclusive).
 * @param translationId The ID of the desired translation.
 * @param reciterId The ID of the reciter for the audio.
 * @param knownVerseCount Optional: Provide total verse count to potentially avoid fetching details.
 * @returns A promise that resolves to a Verse object.
 * @throws Error if the range is invalid or verse fetching fails.
 */
export async function getRandomVerseInRange(
    surahId: number,
    startVerse: number,
    endVerse: number,
    translationId: number = DEFAULT_TRANSLATION_ID,
    reciterId: number = DEFAULT_RECITER_ID,
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
    return getVerse(surahId, randomVerseId, translationId, reciterId);
}
