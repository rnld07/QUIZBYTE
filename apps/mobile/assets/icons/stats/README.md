# Symbole für die Statistiken

Hier liegen eigene Symbole für die Zahlen in Fortschritt, Analyse und Profil.
Sie ersetzen dort das eingebaute Icon.

## Bild hinzufügen

1. Bild in diesen Ordner legen und nach der Bedeutung benennen:

   | Datei | Wofür die Zahl steht | Wo sie auftaucht |
   | --- | --- | --- |
   | `xp.png` | XP gesamt | Deine Analyse, Profil, Freundesprofil |
   | `streak.png` | Tag-Streak | Deine Analyse, Fortschritt, Profil (auch „längster Streak") |
   | `correct.png` | richtig / Trefferquote | Deine Analyse, Fortschritt |
   | `wrong.png` | falsch beantwortet | Deine Analyse, Kachel „Falsch" |
   | `duels.png` | Duelle | Deine Analyse, Kachel „Duelle gespielt" |
   | `highscore.png` | Bestwert eines Modus | Profil und Deine Analyse, „Highscores" |
   | `accuracy.png` | Accuracy | Profil, Freundesprofil (neben dem Levelring) |
   | `answered.png` | beantwortet | Fortschritt, Profil, Freundesprofil |
   | `sessions.png` | Quiz-Sessions | Profil, Freundesprofil |
   | `perfect.png` | Perfekte Quiz | Profil |

   Benannt ist jede Datei nach dem, was die Zahl **bedeutet**, nicht nach dem
   Bildschirm: „XP gesamt" steht an drei Stellen, und ein Bild reicht für alle
   drei.

2. In `src/content/statIcons.ts` die passende Zeile einkommentieren. Metro löst
   `require()` beim Build auf – deshalb braucht **jedes** Bild dort einen
   statischen Eintrag.

Ohne Eintrag bleibt das bisherige Symbol stehen. Du kannst also auch nur eins
oder zwei davon hinterlegen.

## Empfehlung für die Bilder

| | |
| --- | --- |
| Seitenverhältnis | 1:1 (quadratisch) |
| Größe | mindestens 128 × 128 px, besser 256 × 256 px |
| Format | **PNG mit transparentem Hintergrund** |
| Dateigröße | möglichst unter 60 KB pro Bild (landet im App-Bundle) |

Die Symbole werden mit 20–22 px dargestellt. Ein paar Punkte, die dabei helfen:

- **Transparenter Hintergrund**, sonst steht ein Kästchen im getönten Feld.
- Die Symbole werden **nicht** eingefärbt – was im Bild steht, kommt so heraus.
  Die farbige Fläche dahinter bleibt aber: Blau bei XP, Rot beim Streak, Gold
  bei den perfekten Quiz.
- Bei dieser Größe tragen kräftige Formen; feine Linien verschwinden.
- Etwas Luft zum Rand lassen.
