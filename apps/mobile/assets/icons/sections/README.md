# Symbole für Überschriften und Schaltflächen

Hier liegen eigene Symbole für einzelne Bereiche der App. Sie ersetzen dort das
eingebaute Icon.

## Bild hinzufügen

1. Bild in diesen Ordner legen und nach der Bedeutung benennen:

   | Datei | Wofür | Wo es auftaucht |
   | --- | --- | --- |
   | `pdf.png` | PDF speichern | Lernzettel, Knopf „Als PDF" |
   | `images.png` | Seiten als Bilder speichern | Lernzettel, Knopf „Als Bilder" |
   | `answers.png` | Antworten (richtig/falsch) | Deine Analyse, Block „Antworten" |
   | `difficulty.png` | Schwierigkeitsstufe | Deine Analyse und Kategorie-Details, Block „Nach Schwierigkeit"; Filter bei den gespeicherten Fragen |
   | `categories.png` | Kategorien | Filter bei den gespeicherten Fragen |
   | `mode.png` | Spielmodus (Controller) | Deine Analyse, Block „Nach Modus" |
   | `total.png` | Insgesamt | Deine Analyse, Block „Insgesamt" |

   Benannt ist jede Datei nach dem, was sie **bedeutet**, nicht nach dem
   Bildschirm: „Schwierigkeit" steht an zwei Stellen, und ein Bild reicht für
   beide.

2. In `src/content/sectionIcons.ts` die passende Zeile einkommentieren. Metro
   löst `require()` beim Build auf – deshalb braucht **jedes** Bild dort einen
   statischen Eintrag.

## Was die Bilder können müssen

- Quadratisch, mindestens 256 × 256 px, PNG mit Transparenz.
- Gezeichnet wird es einfarbig nicht – das Bild kommt so auf den Schirm, wie es
  ist. Es muss also auf dunklem Grund von selbst lesbar sein.
- Das Motiv füllt die Fläche möglichst aus, ohne eigenen Rand oder Rahmen: die
  App zeichnet je nach Ort ein getöntes Plättchen darunter.

Ohne Eintrag bleibt das bisherige Symbol stehen. Du kannst also auch nur eins
oder zwei der sieben hinterlegen.
