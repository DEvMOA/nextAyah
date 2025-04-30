// src/types/quran.ts

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
   * The translation of the verse (based on selected language).
   */
  translation: string; // Using translations[0].text
  /**
   * The Surah ID this verse belongs to.
   */
  surahId: number;
   /**
   * The unique key for the verse (e.g., "1:1"). Used for API lookups like audio.
   */
  verseKey: string; // Using verse_key from API
  /**
   * The URL for the verse's audio recitation (optional).
   */
  audioUrl?: string;
}

/**
 * Represents the configuration for a selected Surah, including verse range.
 */
export interface SurahConfig {
  /**
   * The ID of the selected Surah.
   */
  surahId: number;
  /**
   * The starting verse number for the random selection range (inclusive).
   */
  startVerse: number;
  /**
   * The ending verse number for the random selection range (inclusive).
   */
  endVerse: number;
   /**
   * Optional: Pre-fetched Surah details to avoid extra lookups later.
   * We keep this to potentially display Surah names in summaries without extra fetches.
   */
   surahDetails?: Surah;
}

/**
 * Represents an available Quran reciter.
 */
export interface Reciter {
    id: number;
    name: string;
    style?: string; // e.g., Murattal, Mujawwad
}

/**
 * Represents an available Quran translation.
 */
export interface TranslationInfo {
    id: number;
    language: string;
    name: string;
    author?: string;
}

/**
 * Represents the overall settings for the Quran Explorer stored in local storage.
 */
export interface QuranExplorerSettings {
    /**
     * Array of Surah configurations (selected Surahs and ranges).
     */
    selectedConfigs: SurahConfig[];
    /**
     * The ID of the selected reciter.
     */
    reciterId: number;
    /**
     * The ID of the selected translation.
     */
    translationId: number;
}
