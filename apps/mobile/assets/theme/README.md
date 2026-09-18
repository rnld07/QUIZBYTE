# Symbole für die Design-Auswahl

Hier liegen eigene Symbole für die drei Optionen unter **Mehr → Design**. Sie
ersetzen dort das eingebaute Icon (Sonne, Mond, Handy).

## Bild hinzufügen

1. Bild in diesen Ordner legen und nach der Option benennen:

   | Datei | Option |
   | --- | --- |
   | `light.png` | Hell |
   | `dark.png` | Dunkel |
   | `system.png` | System |

2. In `src/content/themeImages.ts` die passende Zeile einkommentieren. Metro löst
   `require()` beim Build auf – deshalb braucht **jedes** Bild dort einen
   statischen Eintrag.

Ohne Eintrag bleibt das bisherige Symbol stehen. Es können also auch nur ein
oder zwei der drei Bilder hinterlegt werden.

## Empfehlung für die Bilder

| | |
| --- | --- |
| Seitenverhältnis | 1:1 (quadratisch) |
| Größe | mindestens 128 × 128 px, besser 256 × 256 px |
| Format | PNG oder JPG – ein transparenter Hintergrund ist nicht nötig |
| Dateigröße | möglichst unter 60 KB pro Bild (landet im App-Bundle) |

Das Bild füllt das runde Feld (36 px) komplett aus und wird auf den Kreis
zugeschnitten – ein quadratisches Bild kommt also rund heraus. Der dünne Rahmen
bleibt als Ring drumherum sichtbar. Ein paar Punkte, die dabei helfen:

- Das Motiv **mittig** setzen: an den Rändern wird beschnitten, aus einem
  Quadrat bleibt der eingeschriebene Kreis übrig.
- Nicht quadratische Bilder werden mittig auf 1:1 zugeschnitten.
- Bei 36 px tragen kräftige Formen; feine Linien und Text sind nicht mehr zu
  erkennen.
- Die Bilder werden **nicht** eingefärbt – was im Bild steht, kommt so heraus.
