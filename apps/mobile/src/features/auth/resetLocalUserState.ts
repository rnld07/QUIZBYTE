import { queryClient } from '@/services/query/queryClient';
import { useQuizSessionStore } from '@/state/quizSessionStore';

/**
 * Raeumt weg, was dem vorigen Konto gehoerte.
 *
 * Drei Stellen brauchen das und hatten bisher jede ihre eigene, unvollstaendige
 * Fassung: Anmelden mit einem anderen Konto, Abmelden, Konto loeschen. Geleert
 * wurde dabei nur der Abfragezwischenspeicher – eine laufende Runde im
 * Arbeitsspeicher blieb stehen und gehoerte nach dem Wechsel jemand anderem.
 *
 * Was ausdruecklich **nicht** weggeraeumt wird, ist die Antwort-Warteschlange.
 * Ihre Eintraege tragen ihre `userId` bei sich; sie gehoeren dem vorigen Konto
 * und koennen gesendet werden, sobald es sich wieder anmeldet. Versendet wird
 * ohnehin nur, was zum gerade angemeldeten Konto gehoert. Nur beim Loeschen
 * eines Kontos gibt es nichts mehr zu senden – das macht `forgetAttemptsOfUser`.
 */
export function resetLocalUserState(): void {
  useQuizSessionStore.getState().abandon();
  queryClient.clear();
}
