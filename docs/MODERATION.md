# Moderation

Was QuizByte heute an Moderation hat, und was für Melden/Blockieren von Nutzern
noch fehlen würde.

## Vorhanden

### Benutzernamen-Filter

Beim Anlegen und beim Ändern eines Namens. Zwei Stellen, absichtlich doppelt:

- **App:** `isBlockedUsername()` in `packages/shared/src/validation/usernameFilter.ts`,
  aufgerufen von `validateUsername()`. Die Liste liegt in
  `packages/shared/src/validation/blockedUsernames.ts`.
- **Datenbank:** `public.username_is_blocked()` samt Trigger
  `profiles_reject_blocked_username` auf `public.profiles`
  (`…_username_filter.sql`). Ohne diesen Teil wäre der Filter wirkungslos – mit
  dem öffentlichen anon-Key lässt sich die App umgehen und direkt in die Tabelle
  schreiben.

Wird die Liste geändert, muss sie **an beiden Stellen** geändert werden.

### Fragen melden

`question_reports` mit eigener RLS: jeder darf eine Meldung schreiben, lesen
kann sie nur, wer sie geschrieben hat, plus die Admins im Adminpanel.

### Nutzer melden

`user_reports` – dieselbe Bauart wie bei den Fragen, dieselbe RLS: anlegen darf
jeder Angemeldete, lesen nur der Melder. Der Gemeldete erfährt nichts; für ihn
ändert sich nichts.

Ein Unique auf (`reporter_id`, `reported_id`, `reason`) verhindert, dass
dieselbe Person mit demselben Grund mehrfach gemeldet wird. Ein **anderer**
Grund geht weiter durch: wer erst den Namen und später Spam meldet, meldet
zweierlei. Die App behandelt den Unique-Verstoß still als Erfolg – zweimal
gemeldet ist nicht weniger gemeldet als einmal.

Gründe: `username`, `spam`, `harassment`, `cheating`, `other`.

### Nutzer blockieren

`user_blocks` (`blocker_id`, `blocked_id`) plus `is_blocked(a, b)`, das in
**beide** Richtungen prüft: wer blockiert, will den anderen nicht sehen, und wer
blockiert wurde, soll keinen Weg zurück finden.

Wirkt an diesen Stellen:

- `search_users` – Blockierte tauchen in der Suche nicht mehr auf
- `send_friend_request` – lehnt ab, ohne den Grund zu nennen
- `block_user` löscht die Freundschaft samt offener Anfrage. Alles, was an der
  Freundschaft hängt – Chat, Duelle, Freundesprofil, Rangliste – fällt damit von
  selbst weg, weil es über `are_friends()` läuft.

Gemeinsame Duelle und Nachrichten bleiben in der Datenbank stehen. Sie sind
Vergangenheit, und Vergangenheit wird nicht gelöscht, weil zwei sich zerstritten
haben.

Rückgängig über **Einstellungen → Blockierte Nutzer**. Das ist der einzige Weg
zurück: der andere ist bis dahin überall versteckt, auch in der Suche.

### Adminpanel

**Meldungen** (`/reports`) listet die gemeldeten Nutzer mit Grund, Beschreibung,
Melder, Gemeldetem, Zeitpunkt und der Gesamtzahl der Meldungen gegen diese
Person. Pro Zeile: als bearbeitet markieren (oder wieder öffnen), Namen
zurücksetzen, sperren, entsperren. Darunter die letzten Moderationsschritte.

Alle vier Aktionen laufen über `security definer`-Funktionen, die die
Admin-Rolle selbst prüfen – die Prüfung im Panel ist die zweite Verteidigung,
nicht die erste. Jede schreibt eine Zeile nach `admin_actions`.

### Sperren

`profiles.suspended_at` plus `is_suspended()`. Ein gesperrtes Konto kann:

- keine Runde anlegen und keine Antwort speichern (Policies auf
  `quiz_sessions` und `quiz_attempts`)
- niemanden melden (Policy auf `user_reports`)
- keine Freundschaftsanfrage schicken (`send_friend_request`)
- seinen Namen nicht ändern (Trigger)
- in der Suche nicht mehr gefunden werden

Lesen und abmelden geht weiter. Die App zeigt eine Wand mit der Begründung –
die Sperre selbst hängt nicht an dieser Wand, sondern an den Policies.

### Konto löschen

`delete_my_account()` löscht die Zeile in `auth.users`; alles Persönliche hängt
per `on delete cascade` daran. Fragen und Lernzettel bleiben (`on delete set
null` auf `created_by`) – Inhalt gehört der App, nicht ihrem Autor. Ein
Admin-Konto lehnt die Funktion ab, sonst könnte man sich aus dem Panel
aussperren. Die App verlangt vorher das Passwort und das getippte Wort
„LÖSCHEN".

### Bremsen

| Aktion | Grenze | Wo |
| --- | --- | --- |
| Freundschaftsanfragen | 20 pro Stunde | `send_friend_request` |
| Meldungen | 10 pro Tag, und derselbe Grund gegen dieselbe Person nur einmal | Trigger + Unique |
| Namensänderung | einmal pro 24 Stunden | Trigger |
| Blockieren | 30 pro Stunde | Trigger |

Gezählt wird in den Tabellen, die es ohnehin gibt – keine eigene Zähl-Tabelle.

### Privatsphäre

`profiles.searchable` und `profiles.allow_friend_requests`, beide
standardmäßig an, in den Einstellungen umschaltbar. Durchgesetzt in
`search_users` und `send_friend_request`. Eine Ausnahme: wer mich bereits
angefragt hat, erreicht mich weiterhin – sonst hätten zwei Leute, die beide
keine Anfragen wollen, keinen Weg mehr zueinander, obwohl sie ihn gerade beide
gehen.

## Noch offen

- **Melden außerhalb des Profils**: heute nur über das Drei-Punkte-Menü auf dem
  Profil. Ein Eintrag im Chat-Kopf wäre der nächste sinnvolle Ort.
- **Gesperrte Konten in alten Freundeslisten**: wer schon befreundet ist, sieht
  den Gesperrten weiter in seiner Liste. Schreiben kann der Gesperrte nichts,
  aber die Zeile steht da. Wenn das stören soll, müsste `get_my_friends` sie
  ausblenden.
- **Automatik**: nichts sperrt von selbst. Auch bei zwanzig Meldungen gegen
  dieselbe Person entscheidet ein Mensch.
