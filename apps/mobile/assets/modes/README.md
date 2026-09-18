# Hintergrundbilder für die Modus-Kacheln

Hier liegen die Hintergrundbilder der Kacheln auf der Modusauswahl – der Seite,
die nach dem Tippen auf eine Kategorie kommt.

## Bild hinzufügen

1. Bild in diesen Ordner legen und **nach der Modus-Id benennen**:

   | Datei | Modus |
   | --- | --- |
   | `classic.png` | Klassisch |
   | `blitz.png` | Blitz |
   | `survival.png` | Survival |
   | `perfect.png` | Perfekte Runde |

2. In `src/content/modeImages.ts` die passende Zeile einkommentieren. Metro löst
   `require()` beim Build auf – deshalb braucht **jedes** Bild dort einen
   statischen Eintrag.

Ohne Eintrag behält die Kachel den farbigen Verlauf in der Farbe der Kategorie,
es geht also nichts kaputt, wenn hier erst ein oder zwei Bilder liegen.

## Empfehlung für die Bilder

| | |
| --- | --- |
| Seitenverhältnis | ca. 5:4 quer (die Kachel ist etwas breiter als hoch) |
| Größe | mindestens 700 × 570 px, besser 1100 × 900 px |
| Format | PNG, JPG oder WEBP |
| Dateigröße | möglichst unter 300 KB pro Bild (landet im App-Bundle) |

Über dem Bild liegt ein dunkler Verlauf, damit Name und Beschreibung lesbar
bleiben. Motive wirken deshalb am besten, wenn sie **mittig/oben** sitzen und
die untere Hälfte ruhig ist. Sehr dunkle Bilder verschwinden im Verlauf – etwas
hellere Motive kommen besser.

In der oberen rechten Ecke sitzt das ⓘ für die Modus-Erklärung; dort sollte
nichts Wichtiges liegen.
