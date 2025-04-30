// src/services/quran.ts

const API_BASE_URL = 'https://api.quran.com/api/v4';

/**
 * Represents a Surah (chapter) in the Quran.
 */
export interface Surah {
  /**
   * The ID (chapter number) of the Surah.
   */
  id: number;
  /**
   * The Arabic name of the Surah.
   */
  name: string; // Using name_arabic from API
  /**
   * The number of verses in the Surah.
   */
  verseCount: number; // Using verses_count from API
  /**
   * The transliteration of the Surah name.
   */
  transliteration: string; // Using name_simple from API
  /**
   * The revelation place (Makkah or Madinah).
   */
   revelationPlace: string; // Using revelation_place from API
   /**
    * The translated name of the Surah.
    */
   translatedName: string; // Using translated_name.name from API
}

/**
 * Represents a verse from the Quran.
 */
export interface Verse {
  /**
   * The ID (verse number within the Surah) of the verse.
   */
  id: number; // Using verse_number from API
  /**
   * The text of the verse in Arabic (Uthmani script).
   */
  arabicText: string; // Using text_uthmani from API
  /**
   * The translation of the verse (defaulting to English).
   */
  translation: string; // Using translations[0].text (assuming English is the first)
  /**
   * The Surah ID this verse belongs to.
   */
  surahId: number;
}

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
  const data = await fetchData<{ chapters: any[] }>(`${API_BASE_URL}/chapters?language=en`);

  // Map the API response to our Surah interface
  return data.chapters.map((chapter: any): Surah => ({
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
  const data = await fetchData<{ chapter: any }>(`${API_BASE_URL}/chapters/${surahId}?language=en`);
  const chapter = data.chapter;

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
  const data = await fetchData<{ verse: any }>(
    `${API_BASE_URL}/verses/by_key/${surahId}:${verseId}?language=en&words=false&translations=131&fields=text_uthmani`
  );

  const verseData = data.verse;

   // Basic validation in case the API returns unexpected data for a valid-looking key
   if (!verseData || !verseData.verse_number) {
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
  };
}


/**
 * Retrieves a random verse from a Surah.
 * Fetches Surah details first if needed to get verse count.
 *
 * @param surahId The ID of the Surah.
 * @param knownVerseCount Optional: Provide verse count to avoid an extra API call.
 * @returns A promise that resolves to a Verse object.
 */
export async function getRandomVerse(surahId: number, knownVerseCount?: number): Promise<Verse> {
     if (isNaN(surahId) || surahId < 1 || surahId > 114) {
         throw new Error(`Invalid Surah ID for random verse: ${surahId}`);
     }
    let verseCount = knownVerseCount;

    // If verse count isn't provided, fetch the Surah details first
    if (verseCount === undefined || verseCount <= 0) { // Check if verseCount is invalid too
        try {
            // Use getSurahDetails which includes validation
            const surahInfo = await getSurahDetails(surahId);
            verseCount = surahInfo.verseCount;
        } catch (error) {
            console.error(`Error fetching surah info for random verse (Surah ${surahId}):`, error);
             throw new Error(`Could not determine verse count for Surah ${surahId}`);
        }
    }

    if (!verseCount || verseCount <= 0) { // Final check
         throw new Error(`Invalid verse count (${verseCount}) for Surah ${surahId}`);
    }

    // Generate a random verse number (1-based index)
    const randomVerseId = Math.floor(Math.random() * verseCount) + 1;

    // Fetch the randomly selected verse
    return getVerse(surahId, randomVerseId);
}
