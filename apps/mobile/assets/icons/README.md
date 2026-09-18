# Eigene Symbole

Hier liegen eigene Symbole für einzelne Stellen in der App. Sie ersetzen dort
das eingebaute Icon.

## Bild hinzufügen

1. Bild in diesen Ordner legen und nach der Stelle benennen:

   | Datei | Wo es erscheint | Darstellung |
   | --- | --- | --- |
   | `study-sheets.png` | Mehr → Überschrift „Lernzettel" | 26 px, neben der Überschrift |
   | `repeat-questions.png` | Fortschritt → „Falsche Fragen wiederholen" | 66 px, frei stehend ohne Feld |
   | `invite-friends.png` | Freunde → „App weiterempfehlen" | 66 px, frei stehend ohne Feld |
   | `coming-soon.png` | Startseite → Dialog „Coming soon" | 76 px, frei stehend ohne Feld |
   | `settings.png` | Kopfzeile oben links + „Einstellungen" unter „Mehr" | 40 px bzw. 26 px |

   Das Zahnrad erscheint an zwei Stellen: im Knopf oben links, der auf jedem Tab
   zu sehen ist, und in der Zeile „Einstellungen" unter „Mehr". Der Knopf in
   einer laufenden Quizrunde behält sein eingebautes Symbol.

2. In `src/content/appIcons.ts` die passende Zeile einkommentieren. Metro löst
   `require()` beim Build auf – deshalb braucht **jedes** Bild dort einen
   statischen Eintrag.

Ohne Eintrag bleibt das bisherige Symbol stehen, es geht also nichts kaputt,
wenn hier erst ein Bild liegt.

## Empfehlung für die Bilder

| | |
| --- | --- |
| Seitenverhältnis | 1:1 (quadratisch) |
| Größe | mindestens 128 × 128 px, besser 256 × 256 px |
| Format | **PNG mit transparentem Hintergrund** |
| Dateigröße | möglichst unter 60 KB pro Bild (landet im App-Bundle) |

Die Symbole werden klein dargestellt (26–76 px, siehe Tabelle oben) und **nicht**
eingefärbt – was im Bild steht, kommt so heraus. Ein paar Punkte, die dabei
helfen:

- **Transparenter Hintergrund**, sonst steht ein weißes oder schwarzes Kästchen
  im Kreis dahinter.
- Die App hat einen Hell- und einen Dunkel-Modus. Ein Motiv in einer mittleren,
  kräftigen Farbe funktioniert auf beiden; reines Weiß verschwindet im Hellen,
  reines Schwarz im Dunklen.
- Etwas Luft zum Rand lassen – das Symbol sitzt in einem runden bzw. abgerundeten
  Feld und wird auf dessen Größe eingepasst.
- Bei so kleiner Darstellung tragen kräftige Formen; feine Linien und Text sind
  nicht mehr zu erkennen.

## Weitere Stellen

Sollen später mehr Stellen ein eigenes Symbol bekommen: in
`src/content/appIcons.ts` den Schlüssel zu `APP_ICON_KEYS` hinzufügen und an der
Stelle `<AppIcon name="…" fallback="…" />` statt `<Ionicons …>` verwenden.
