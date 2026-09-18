# Logo

Aus **einer** Datei entstehen App-Icon, Startbildschirm und die Marke im
App-Header.

| Datei | Rolle |
| --- | --- |
| `logo.png` | die Quelle – hier wird getauscht |
| `logo-mark.png` | daraus erzeugt: freigestellt, für den Header |

`logo-mark.png` wird nicht von Hand bearbeitet: Es ist `logo.png` ohne seinen
dunklen Untergrund, damit die Marke auf jedem Hintergrund sitzt.

## Logo austauschen

Neue Datei als `logo.png` hier ablegen und Bescheid geben – dann werden alle
Varianten neu erzeugt. Empfehlung für die Quelldatei:

| | |
| --- | --- |
| Seitenverhältnis | 1:1 (quadratisch) |
| Größe | mindestens 1024 × 1024 px |
| Format | PNG |
| Untergrund | einfarbig und dunkel (wird automatisch freigestellt) oder transparent |
| Motiv | mittig, mit Luft am Rand |

Zum Motiv: Android schneidet App-Icons je nach Gerät rund oder als Squircle zu
und beschneidet dabei bis zu ein Drittel des Rands. Alles Wichtige sollte
deshalb in den mittleren zwei Dritteln liegen. Und weil der App-Hintergrund
sehr dunkel ist (`#03080F`), funktionieren helle Motive am besten.

## Was daraus gebaut wird

| Ziel | Datei | Aufbereitung |
| --- | --- | --- |
| iOS-App-Icon | `assets/images/icon.png` | 1024 px, randlos, ohne Transparenz |
| Android-Vordergrund | `assets/images/android-icon-foreground.png` | Motiv auf 60 % verkleinert, freigestellt |
| Android-Hintergrund | `assets/images/android-icon-background.png` | einfarbig `#03080F` |
| Android einfarbig | `assets/images/android-icon-monochrome.png` | weiße Silhouette für Themed Icons |
| Startbildschirm | `assets/images/splash-icon.png` | freigestellt, 62 % |
| Web-Favicon | `assets/images/favicon.png` | 48 × 48 px |
| Header in der App | `logo-mark.png` über `src/components/brand/Logo.tsx` | freigestellt |

Die Pfade der Icon-Dateien stehen in `app.json`; die Dateinamen bleiben gleich,
getauscht wird nur der Inhalt.

**Wichtig:** Ein neues App-Icon erscheint erst nach einem neuen Build
(`npx expo prebuild --clean`, danach EAS-Build). In einem laufenden Expo Go
bleibt das alte Icon stehen – das Logo im Header dagegen ändert sich sofort.
