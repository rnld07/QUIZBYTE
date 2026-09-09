/**
 * Static legal / info pages.
 *
 * PLACEHOLDER TEXTS – must be replaced with the real Datenschutzerklärung,
 * Impressum and Nutzungsbedingungen before the store release.
 */
export type LegalPageKey = 'datenschutz' | 'impressum' | 'nutzungsbedingungen' | 'support' | 'about';

export interface LegalPage {
  title: string;
  paragraphs: string[];
}

export const legalPages: Record<LegalPageKey, LegalPage> = {
  datenschutz: {
    title: 'Datenschutz',
    paragraphs: [
      'Platzhalter: Hier steht vor der Veröffentlichung die vollständige Datenschutzerklärung.',
      'QuizByte speichert deinen Lernfortschritt (beantwortete Fragen, XP, Streak) unter einer anonymen Nutzer-ID. Es werden keine Namen oder E-Mail-Adressen benötigt, solange du kein Konto anlegst.',
      'Nutzungsstatistiken werden ausschließlich ohne personenbezogene Daten erhoben.',
    ],
  },
  impressum: {
    title: 'Impressum',
    paragraphs: ['Platzhalter: Angaben gemäß § 5 DDG werden vor der Veröffentlichung ergänzt.'],
  },
  nutzungsbedingungen: {
    title: 'Nutzungsbedingungen',
    paragraphs: ['Platzhalter: Die Nutzungsbedingungen werden vor der Veröffentlichung ergänzt.'],
  },
  support: {
    title: 'Support',
    paragraphs: [
      'Du hast eine Frage, einen Fehler gefunden oder Feedback zu einer Quizfrage?',
      'Schreib uns – wir melden uns so schnell wie möglich.',
    ],
  },
  about: {
    title: 'Über QuizByte',
    paragraphs: [
      'QuizByte ist eine Lern-App für Informatik: kurze Quizrunden, sofortiges Feedback mit Erklärung, sichtbarer Fortschritt.',
      'Alle Fragen werden redaktionell geprüft, bevor sie in der App erscheinen.',
    ],
  },
};

export function isLegalPageKey(value: string | undefined): value is LegalPageKey {
  return value !== undefined && value in legalPages;
}
