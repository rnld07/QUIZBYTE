# Glücksrad

Hier kommt das Bild des Glücksrads hinein. Solange die Datei fehlt, zeichnet die
App das Rad selbst – aus denselben Feldern, gegen die gedreht wird.

**Datei:** `wheel.png` — danach in `src/content/wheelImage.ts` die zweite Zeile
einkommentieren (Metro löst `require()` beim Bauen auf, deshalb der feste
Eintrag).

## Was das Bild zeigen muss

Nur die **Scheibe** – kein Zeiger, kein Knauf in der Mitte, kein Schatten
außenrum. Zeiger, Nabe und Rahmen zeichnet die App darüber, damit sie beim
Drehen stehen bleiben.

- **Quadratisch**, mindestens 1024 × 1024 px, PNG mit Transparenz außerhalb des
  Kreises. Der Kreis füllt das Bild randfüllend aus (kein Rand, keine Ränder
  aus Weiß).
- **Neun gleich große Felder** à 40°, im Uhrzeigersinn, das erste beginnt exakt
  bei 12 Uhr.
- Die Reihenfolge der XP-Zahlen ist vorgegeben und darf sich **nicht** ändern –
  die App dreht auf genau dieses Feld:

  | Feld | Winkel (im Uhrzeigersinn ab 12 Uhr) | Beschriftung |
  |-----:|-------------------------------------|--------------|
  | 1    | 0° – 40°                            | **10**       |
  | 2    | 40° – 80°                           | **25**       |
  | 3    | 80° – 120°                          | **5**        |
  | 4    | 120° – 160°                         | **50**       |
  | 5    | 160° – 200°                         | **15**       |
  | 6    | 200° – 240°                         | **0**        |
  | 7    | 240° – 280°                         | **20**       |
  | 8    | 280° – 320°                         | **100**      |
  | 9    | 320° – 360°                         | **30**       |

- Die Zahl steht **mittig im Feld**, mit dem Kopf nach außen (von der Mitte
  gelesen), etwa auf zwei Dritteln des Radius. „XP" muss nicht dabeistehen.
- Die Mitte bleibt auf etwa 25 % des Durchmessers frei – dort sitzt die Nabe.
- Kräftige, gut unterscheidbare Farben, benachbarte Felder nie gleich. Die
  seltenen Felder (**100** und **0**) dürfen herausstechen.

Passt die Reihenfolge im Bild nicht zur Tabelle, zeigt der Zeiger auf ein
anderes Feld als das, was ausgezahlt wurde. Die Auszahlung entscheidet immer der
Server, das Bild ist nur die Anzeige.
