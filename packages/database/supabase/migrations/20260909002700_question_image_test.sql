-- =============================================================================
-- QuizByte – Testbild an einer Grundlagen-Frage
--
-- Die Fragen unterstützen seit jeher ein Bild (`questions.image_url`), es war
-- nur nie eines gesetzt. Damit sich die Darstellung im Quiz testen lässt,
-- bekommt die Binärzahl-Frage eine kleine Grafik: vier Kästchen für die Bits
-- von 1011, gesetzte Bits gefüllt.
--
-- Bewusst als Data-URI und nicht als Datei im Bucket `question-images`: so
-- hängt der Test an keinem Upload und an keinem fremden Server. Echte
-- Fragenbilder gehören später in den Bucket.
-- =============================================================================

update public.questions
set image_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVAAAACECAIAAABJUuQDAAACI0lEQVR42u3XMRGAMBBE0fQIoKOmiQmU4AjJYIFJqty+mW/g2LyCtu2npJCaTyABLwl4ScBLAl4S8JKAlwS8JOAlAS8JeEnAS8BLAl4S8JKAlwS8JOAlAS8JeEnASwJeEvAS8JKAlwS8JOAlAS8JeEnASwJeEvCSpsEfz1ugse/Sr7tAY7cn717+duCBtzvwwAMPPPCB4Ff8TwMeeOCB9+jdDjzwdgfe8MADDzzwwAMPPPDAAw888MADDzzwwAMPPPDAAw888MADDzzwwAMPPPDAAw888B6924EH3u7AGx544IEHHnjggQceeOCBBx544IEHHnjggQceeOCBBx544IEHHnjggQceeOCBB96jdzvwwNsdeMMDDzzwwAMPPPDAAw888MADDzzwwAMPPPDAAw888MADDzzwwAMPPPDAAw888MAD73bggQceeMMDb3fggQceeOCBBx544IEHHnjggQceeOCBBx544IEHHnjggQceeOCBBx544IEH3u3AA+/RA2944O0OPPDAAw888MADDzzwwAMPPPDAAw888MADDzzwwAMPPPDAAw888MADDzzwwAMPPPAevduBB97uwBseeOCBzwS/dB6924EHHnjgDQ+83cPBSyoW8BLwkoCXBLwk4CUBLwl4ScBLAl4S8JKAlwS8BLwk4CUBLwl4ScBLAl4S8JKAlwS8JOAlAS8BLwl4ScBLAl4S8JKAlwS8JOAlAS/pXx9pfDsD/PlFtwAAAABJRU5ErkJggg=='
where id = '20000000-0000-4000-8000-000000000058';
