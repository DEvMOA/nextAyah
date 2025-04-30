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
   * The translation of the verse (defaulting to English).
   */
  translation: string; // Using translations[0].text (assuming English is the first)
  /**
   * The Surah ID this verse belongs to.
   */
  surahId: number;
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
   */
   surahDetails?: Surah;
}
