# Symbol für das Daily Quiz

Hier liegt das Bild, das auf der Startseite links in der Daily-Quiz-Karte sitzt –
an der Stelle, wo bisher das Kalender-Symbol ist.

## Bild hinzufügen

1. Bild in diesen Ordner legen und `daily.png` nennen.
2. In `src/content/dailyImage.ts` die auskommentierte Zeile aktivieren und die
   Zeile darüber (`= undefined`) löschen:

   ```ts
   const DAILY_IMAGE: ImageSourcePropType = require('../../assets/daily/daily.png');
   ```

   Metro löst `require()` beim Build auf – deshalb braucht das Bild diesen
   statischen Eintrag.

Ohne Eintrag bleibt das Kalender-Symbol stehen, es geht also nichts kaputt.

## Empfehlung für das Bild

| | |
| --- | --- |
| Seitenverhältnis | 1:1 (quadratisch) |
| Größe | mindestens 200 × 200 px, besser 400 × 400 px |
| Format | PNG (gern mit Transparenz) oder WEBP |
| Dateigröße | möglichst unter 100 KB (landet im App-Bundle) |

Das Bild wird klein dargestellt (46 px) und in ein abgerundetes Quadrat
geschnitten. Motive, die bis an den Rand laufen, werden dabei beschnitten – ein
wenig Luft ringsum hilft.

Die Karte hat zwei Zustände: blau, solange das Tagesquiz offen ist, und grau,
sobald es gespielt wurde. Im grauen Zustand wird das Bild leicht abgedunkelt.
Ein Bild, das auf Blau **und** auf Grau funktioniert, passt also am besten –
oder eines mit transparentem Hintergrund.
