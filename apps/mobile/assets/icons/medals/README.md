# Bilder für die Medaillen

Fünf Bilder für acht Medaillen: eines je Stufe. Welche Medaille es ist, steht
als Name und Aufgabe darunter — was das Bild zeigt, ist **wie weit** sie ist.

## Bild hinzufügen

1. Bild in diesen Ordner legen und nach der Stufe benennen:

   | Datei | Stufe |
   | --- | --- |
   | `locked.png` | noch nicht verdient (ausgegraut) |
   | `bronze.png` | Bronze |
   | `silver.png` | Silber |
   | `gold.png` | Gold |
   | `platinum.png` | Platin |

2. In `src/content/medalIcons.ts` die passende Zeile einkommentieren. Metro löst
   `require()` beim Build auf – deshalb braucht **jedes** Bild dort einen
   statischen Eintrag.

Ohne Eintrag bleibt die gezeichnete Scheibe stehen: ein Ring in der Farbe der
Stufe mit einem Medaillen-Zeichen darin. Du kannst also auch nur eine oder zwei
Stufen hinterlegen — die übrigen sehen dann weiter aus wie bisher.

Wichtig: `locked.png` sollte schon selbst stumpf sein (grau, ohne Glanz). Ein
hinterlegtes Bild wird nicht nachträglich ausgegraut — der Ordner entscheidet,
wie die ungelöste Stufe aussieht.

## Empfehlung für die Bilder

| | |
| --- | --- |
| Seitenverhältnis | 1:1 (quadratisch) |
| Größe | mindestens 192 × 192 px, besser 384 × 384 px |
| Format | **PNG mit transparentem Hintergrund** |
| Dateigröße | möglichst unter 80 KB pro Bild (landet im App-Bundle) |

Dargestellt werden sie mit 68 px, ohne Feld darum — das Bild ist die Medaille.
Ein paar Punkte, die dabei helfen:

- **Transparenter Hintergrund**, sonst steht ein Kästchen im Feld.
- Die Bilder werden **nicht** eingefärbt – was im Bild steht, kommt so heraus.
  Bronze muss also selbst bronzefarben sein.
- Die fünf sollten dieselbe Form und dieselbe Größe im Bild haben; nebeneinander
  im Regal fällt sonst auf, dass Gold größer ist als Silber.
- Bei dieser Größe tragen kräftige Formen; feine Linien verschwinden.
- Etwas Luft zum Rand lassen.

Platin bekommt zusätzlich einen hellblauen Schein hinter dem Bild — die Stufe,
die kaum jemand erreicht, darf sich auch abheben.
