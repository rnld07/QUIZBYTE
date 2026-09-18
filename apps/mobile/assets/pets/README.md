# Bilder für Katze und Hund

Hier liegen die Zeichnungen für die Avatare. Alles hier ist **optional**: Für
jede Rasse, die kein Bild hat, zeichnet die App weiter ihre eigene Version. Du
kannst also mit einer einzigen Rasse anfangen.

## Der Aufbau: zwei Ebenen

Ein Avatar besteht aus zwei übereinanderliegenden PNGs:

| Datei | Was passiert damit |
| --- | --- |
| `…-fur.png` | wird in der **gewählten Fellfarbe eingefärbt** |
| `…-lines.png` | bleibt genau so, wie du es gezeichnet hast |

Der Grund: Einfärben trifft **jeden** sichtbaren Pixel eines Bildes. Läge alles
in einer Datei, würden Umrisse, Augen und Nase in der Fellfarbe verschwinden.
Deshalb: die Silhouette in eine Datei (am besten in **reinem Weiß**, dann stimmt
die Farbe hinterher exakt), alles was seine Farbe behalten soll in die andere.

Beide Ebenen sind einzeln optional:

- **beide** → Fell in der gewählten Farbe, Details darüber (der Normalfall)
- **nur `-lines`** → dein Bild wird unverändert angezeigt, die Fellfarben-
  Einstellung hat dann für diese Rasse keine Wirkung
- **nur `-fur`** → eine einfarbige Silhouette

## Dateien

### Katze — `cat/`

| Rasse | Dateien |
| --- | --- |
| Kurzhaar | `shorthair-fur.png`, `shorthair-lines.png` |
| Getigert | `tabby-fur.png`, `tabby-lines.png` |
| Siam | `siam-fur.png`, `siam-lines.png` |
| Langhaar | `longhair-fur.png`, `longhair-lines.png` |
| Perser | `perser-fur.png`, `perser-lines.png` |

### Hund — `dog/`

| Rasse | Dateien |
| --- | --- |
| Beagle | `beagle-fur.png`, `beagle-lines.png` |
| Schäferhund | `shepherd-fur.png`, `shepherd-lines.png` |
| Dalmatiner | `dalmatiner-fur.png`, `dalmatiner-lines.png` |
| Mops | `mops-fur.png`, `mops-lines.png` |
| Husky | `husky-fur.png`, `husky-lines.png` |

### Zubehör — `accessories/`

Hier färbt die `-fur`-Ebene nicht die Fellfarbe ein, sondern die **Zubehörfarbe**
(rot, blau, grün, violett, gold, pink).

| Teil | Dateien |
| --- | --- |
| Brille rund | `glasses-round-fur.png`, `glasses-round-lines.png` |
| Brille eckig | `glasses-square-fur.png`, `glasses-square-lines.png` |
| Sonnenbrille | `glasses-shades-fur.png`, `glasses-shades-lines.png` |
| Schleife | `bow-fur.png`, `bow-lines.png` |
| Halsband | `collar-fur.png`, `collar-lines.png` |
| Mütze | `cap-fur.png`, `cap-lines.png` |
| Kopfhörer | `headphones-fur.png`, `headphones-lines.png` |

## Eintragen

Metro löst `require()` beim Build auf – jede Datei braucht deshalb einen
statischen Eintrag in `src/content/petArtwork.ts`. Dort stehen alle Zeilen schon
auskommentiert; einkommentieren genügt:

```ts
cat: {
  shorthair: {
    fur: require('../../assets/pets/cat/shorthair-fur.png'),
    lines: require('../../assets/pets/cat/shorthair-lines.png'),
  },
},
```

Die Schlüssel (`shorthair`, `beagle`, `bow` …) sind dieselben Ids wie in
`packages/shared/src/domain/profile/avatar.ts`. Wer eine Rasse umbenennen oder
hinzufügen will, ändert sie dort – und dann hier.

## Empfehlung für die Bilder

| | |
| --- | --- |
| Seitenverhältnis | 1:1 (quadratisch) |
| Größe | 512 × 512 px |
| Format | **PNG mit transparentem Hintergrund** |
| Dateigröße | möglichst unter 150 KB pro Datei (landet im App-Bundle) |

Wichtig für ein stimmiges Ergebnis:

- **Alle Dateien exakt gleich groß und deckungsgleich.** Die Ebenen werden
  einfach übereinandergelegt; wer `-lines` um ein paar Pixel verschiebt, sieht
  das sofort.
- **Zubehör auf demselben Raster zeichnen** wie die Tiere. Eine Brille ist ein
  512 × 512 großes Bild, das fast ganz leer ist und nur an der richtigen Stelle
  die Brille zeigt – so sitzt sie bei jeder Rasse gleich.
- Der Avatar wird **rund beschnitten** und oft klein dargestellt (32–104 px).
  Was in den Ecken liegt, ist weg; feine Striche verschwinden.
- Ein Profilrahmen kann außen anliegen – etwas Luft zum Rand hilft.
- Die `-fur`-Ebene in **reinem Weiß** (`#FFFFFF`) zeichnen. Graustufen werden
  nicht abgedunkelt, sondern genauso eingefärbt – ein graues Fell käme also in
  derselben Farbe heraus wie ein weißes.
