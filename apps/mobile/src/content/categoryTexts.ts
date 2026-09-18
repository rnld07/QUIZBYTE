/**
 * Short taglines shown under the category name on the start screen.
 *
 * Kept in the app rather than read from `categories.description` so the wording
 * can be adjusted without a database migration. Unknown slugs fall back to the
 * description stored on the category.
 */
const CATEGORY_TAGLINES: Record<string, string> = {
  random: 'Zufällige Fragen aus allen Kategorien',
  fachinformatik: 'Programmierung, Netzwerke, Datenbanken u. v. m.',
  'it-security': 'Sicherheit, Angriffe und Schutzmaßnahmen',
  grundlagen: 'Zahlensysteme, Algorithmen und Rechnerarchitektur',
  hardware: 'PC-Komponenten, Speicher und Peripherie',
  'it-abkuerzungen': 'Wichtige IT-Begriffe kurz erklärt',
  betriebssysteme: 'Windows, Linux, Prozesse und Dateisysteme',
};

export function categoryTagline(slug: string | null | undefined, fallback: string | null): string | null {
  if (slug && CATEGORY_TAGLINES[slug]) return CATEGORY_TAGLINES[slug];
  return fallback;
}
