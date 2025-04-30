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
      const errorData = await response.json();
      throw new Error(`API Error (${response.status}): ${errorData.message || 'Failed to fetch data'}`);
    }
    return await response.json() as T;
  } catch (error) {
    console.error(`Fetch error for URL ${url}:`, error);
    throw error; // Re-throw the error to be caught by the calling function
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
 * Retrieves a specific verse from a Surah, including its English translation.
 *
 * @param surahId The ID (chapter number) of the Surah.
 * @param verseId The ID (verse number) of the verse.
 * @returns A promise that resolves to a Verse object.
 */
export async function getVerse(surahId: number, verseId: number): Promise<Verse> {
  // Fetch the specific verse with fields for Arabic text and English translation (ID 131 for Saheeh International)
  const data = await fetchData<{ verse: any }>(
    `${API_BASE_URL}/verses/by_key/${surahId}:${verseId}?language=en&words=false&translations=131&fields=text_uthmani`
  );

  const verseData = data.verse;
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
    let verseCount = knownVerseCount;

    // If verse count isn't provided, fetch the Surah details first
    if (!verseCount) {
        try {
            const surahInfo = await fetchData<{ chapter: any }>(`${API_BASE_URL}/chapters/${surahId}?language=en`);
            verseCount = surahInfo.chapter.verses_count;
        } catch (error) {
            console.error(`Error fetching surah info for random verse (Surah ${surahId}):`, error);
            // Fallback or re-throw
             throw new Error(`Could not determine verse count for Surah ${surahId}`);
        }
    }

    if (!verseCount || verseCount <= 0) {
         throw new Error(`Invalid verse count (${verseCount}) for Surah ${surahId}`);
    }

    // Generate a random verse number (1-based index)
    const randomVerseId = Math.floor(Math.random() * verseCount) + 1;

    // Fetch the randomly selected verse
    return getVerse(surahId, randomVerseId);
}
