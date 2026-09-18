# Begleiter (Rive)

Hier kommen die Rive-Dateien des animierten Begleiters hinein. Solange sie
fehlen, zeigt die App den gezeichneten Avatar mit einfachen Bewegungen als
Platzhalter – alles andere (Zustände, Auslöser, Positionen) funktioniert schon.

**Dateien**

| Datei                  | Tier  |
| ---------------------- | ----- |
| `companion-cat.riv`    | Katze |
| `companion-dog.riv`    | Hund  |

Danach in `src/content/companionRive.ts` die beiden auskommentierten
`require()`-Zeilen aktivieren (Metro löst `require()` beim Bauen auf, deshalb
die festen Einträge) und die beiden `undefined` entfernen.

## Aufbau der Datei

- **Artboard:** `Cat` bzw. `Dog` – genau so geschrieben.
- **State Machine:** `Companion` – eine pro Artboard, exakt dieser Name.
- Der Ruhezustand der State Machine ist **idle**. Dorthin kehrt sie nach jeder
  Animation von selbst zurück; dafür gibt es keinen Eingang.

## Eingänge der State Machine

| Name         | Typ     | Bedeutung                                              |
| ------------ | ------- | ------------------------------------------------------ |
| `blink`      | Trigger | kurzes Blinzeln                                        |
| `lookLeft`   | Trigger | schaut nach links und wieder zurück                    |
| `lookRight`  | Trigger | schaut nach rechts und wieder zurück                   |
| `happy`      | Trigger | richtige Antwort                                       |
| `sad`        | Trigger | falsche Antwort                                        |
| `celebrate`  | Trigger | Level-Up                                               |
| `sleep`      | Boolean | `true` = schläft, `false` = wacht auf                  |

Die Trigger-Animationen müssen **von selbst wieder nach idle** zurückführen.
Die App feuert nur den Auslöser und meldet sich nicht noch einmal.

Dauer der Animationen (die App rechnet damit, wann sie wieder idle ist):
blink 0,32 s · lookLeft/lookRight 1,4 s · happy/sad 1,6 s · celebrate 2,6 s.
Weicht die Datei stark davon ab, müssen die Werte in
`packages/shared/src/domain/companion/states.ts` angepasst werden.

## Gestaltung

- Quadratisches Artboard, **ganzes Tier** (sitzend, mit Pfoten und Schwanz) –
  kein reiner Kopf. Es steht auf der **Unterkante**, die App richtet
  unten-mittig aus.
- Auf dunklem Grund lesbar (QuizByte-Darkmode), ohne eigenen Hintergrund –
  transparent.
- Freundlich und ruhig, nicht kindlich: kleine Bewegungen, keine Dauerbewegung.
  Der Begleiter sitzt teils minutenlang am Bildrand.
- Großer Kopf, kleiner runder Körper (Chibi-Proportionen) – das hält das Tier
  auch klein noch niedlich.
- Zielgröße auf dem Gerät: 104–124 pt hoch. Alles, was bei 104 pt nicht mehr
  lesbar ist, ist zu fein.
