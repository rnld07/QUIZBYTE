# Symbole für Profil und Profil bearbeiten

Hier liegen eigene Symbole für die Stellen rund ums Profil. Sie ersetzen dort
das eingebaute Icon.

## Bild hinzufügen

1. Bild in diesen Ordner legen und nach der Stelle benennen:

   | Datei | Wo es erscheint |
   | --- | --- |
   | `edit.png` | Profil → der Stift neben dem Namen |
   | `username.png` | Profil bearbeiten → Überschrift „BENUTZERNAME" |
   | `avatar.png` | Profil bearbeiten → Überschrift „AVATAR" |
   | `breed.png` | Profil bearbeiten → Zeile „Rasse" |
   | `fur.png` | Profil bearbeiten → Zeile „Fellfarbe" |
   | `glasses.png` | Profil bearbeiten → Zeile „Brille" |
   | `accessory.png` | Profil bearbeiten → Zeile „Zubehör" |
   | `accent.png` | Profil bearbeiten → Zeile „Farbe des Zubehörs" |

2. In `src/content/profileIcons.ts` die passende Zeile einkommentieren. Metro
   löst `require()` beim Build auf – deshalb braucht **jedes** Bild dort einen
   statischen Eintrag.

Ohne Eintrag bleibt das bisherige Symbol stehen. Du kannst also auch nur eins
oder zwei der acht hinterlegen.

## Empfehlung für die Bilder

| | |
| --- | --- |
| Seitenverhältnis | 1:1 (quadratisch) |
| Größe | mindestens 128 × 128 px, besser 256 × 256 px |
| Format | **PNG mit transparentem Hintergrund** |
| Dateigröße | möglichst unter 60 KB pro Bild (landet im App-Bundle) |

Die Symbole sind klein: der Stift 16 px, die Überschriften 13 px, die Zeilen im
Avatarbereich 13 px. Ein paar Punkte, die dabei helfen:

- **Transparenter Hintergrund**, sonst steht ein Kästchen im getönten Feld.
- Die Symbole werden **nicht** eingefärbt – was im Bild steht, kommt so heraus.
  Die farbige Platte dahinter bleibt aber: Blau beim Benutzernamen, Gelb beim
  Avatar, und pro Zeile die Farbe des jeweiligen Teils.
- Bei dieser Größe tragen kräftige Formen; feine Linien verschwinden.
- Etwas Luft zum Rand lassen – das Symbol sitzt in einem kleinen Feld und wird
  auf dessen Größe eingepasst.
