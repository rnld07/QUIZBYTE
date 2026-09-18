import { redirect } from 'next/navigation';

/**
 * Die alte Meldungsseite.
 *
 * Nutzer- und Fragemeldungen liegen jetzt zusammen unter /moderation. Die
 * Umleitung bleibt, weil Lesezeichen und alte Links auf diesen Pfad zeigen.
 */
export default function ReportsPage() {
  redirect('/moderation');
}
