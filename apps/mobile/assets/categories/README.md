# Hintergrundbilder für die Kategorie-Kacheln

Hier liegen die Hintergrundbilder der quadratischen Kategorie-Kacheln auf der
Startseite.

## Bild hinzufügen

1. Bild in diesen Ordner legen und **nach dem Kategorie-Slug benennen**, z. B.
   `it-security.png`. Die Slugs stehen in der Datenbank (`categories.slug`) –
   aktuell: `fachinformatik`, `it-security`, `netzwerke`, `hardware`,
   `it-abkuerzungen`, `betriebssysteme`. Die Zufalls-Kachel nutzt `random`.
2. In `src/content/categoryImages.ts` die passende Zeile einkommentieren bzw.
   ergänzen. Metro löst `require()` beim Build auf – deshalb braucht **jedes**
   Bild dort einen statischen Eintrag.

Ohne Eintrag bleibt die Kachel beim bisherigen Verlaufs-Look, es geht also
nichts kaputt.

## Empfehlung für die Bilder

| | |
| --- | --- |
| Seitenverhältnis | 1:1 (quadratisch) |
| Größe | mindestens 600 × 600 px, besser 900 × 900 px |
| Format | PNG, JPG oder WEBP |
| Dateigröße | möglichst unter 300 KB pro Bild (landet im App-Bundle) |

Über dem Bild liegt ein dunkler Verlauf, damit Name und Fragenzahl lesbar
bleiben. Motive funktionieren daher am besten, wenn sie **mittig/oben** liegen
und die untere Hälfte ruhig ist. Sehr dunkle Bilder verschwinden im Scrim –
etwas hellere Motive wirken besser.
