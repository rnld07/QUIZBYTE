# Schriftzug

Hier liegt der QuizByte-Schriftzug, der oben in der Kopfzeile neben dem Logo
steht. Ohne Datei wird der Schriftzug weiterhin gesetzt – „Quiz" in der
Textfarbe, „Byte" in Blau.

Das ist **nicht** das Logo: das runde Zeichen daneben kommt aus
`assets/brand/` und wird dort getauscht.

## Schriftzug hinzufügen

1. Bild als `wordmark.png` in diesen Ordner legen.
2. In `src/content/wordmark.ts` die auskommentierte Zeile einkommentieren und
   die Zeile darüber (`= undefined`) löschen. Metro löst `require()` beim Build
   auf – deshalb braucht das Bild dort einen statischen Eintrag.

## Empfehlung für das Bild

| | |
| --- | --- |
| Seitenverhältnis | breit, etwa 4:1 bis 6:1 – **eng um die Buchstaben** |
| Höhe | rund 144 px reicht (dargestellt werden höchstens 48) |
| Format | **PNG mit transparentem Hintergrund** |
| Dateigröße | möglichst unter 100 KB (landet im App-Bundle) |

Der Schriftzug wird so groß wie möglich dargestellt: bis zu **48 px hoch** und
**184 px breit** – mehr gibt die Kopfzeile zwischen den beiden Knöpfen und dem
Logo nicht her. Welche der beiden Grenzen zuerst greift, entscheidet das
Seitenverhältnis; verzerrt oder abgeschnitten wird nie.

- **Eng beschneiden.** Das ist der wichtigste Punkt. Leerraum im Bild wird
  mitskaliert, und der Schriftzug wird winzig: die erste Fassung war 1254 × 1254
  px groß, der Schriftzug darin nur 1118 × 276 – er kam mit rund 11 px Höhe
  heraus statt mit 45. Die beschnittene Fassung liegt jetzt hier, das Original
  daneben als `wordmark-source.png`.
- **Transparenter Hintergrund**, sonst steht ein Kästchen in der Kopfzeile.
- Die App hat einen Hell- und einen Dunkel-Modus, und der Schriftzug wird
  **nicht** eingefärbt. Reines Weiß verschwindet im Hellen, reines Schwarz im
  Dunklen – ein mittlerer Ton oder das Blau der App funktioniert in beiden.
- Bei 28 px Höhe sind sehr dünne Striche kaum noch zu sehen.
