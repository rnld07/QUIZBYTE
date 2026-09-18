-- =============================================================================
-- QuizByte – Schwierigkeitsgrade für den Fragenbestand
--
-- Der ursprüngliche Seed kannte praktisch nur 'easy' (36×) und 'medium' (11×),
-- 'hard' kam gar nicht vor – dadurch blieb die Auswertung nach Schwierigkeit
-- und der Schwierigkeitsfilter wirkungslos.
--
-- Einstufung:
--   easy   – reine Definition / Abkürzung, direkt abrufbar
--   medium – Verständnis nötig, Abgrenzung ähnlicher Begriffe
--   hard   – Rechnung, Detailwissen oder eine oft verwechselte Feinheit
--
-- Nur die Seed-Fragen werden angefasst; später gepflegte Fragen bleiben, wie
-- sie im Admin gesetzt wurden.
-- =============================================================================

update public.questions set difficulty = 'easy' where id in (
  '20000000-0000-4000-8000-000000000002',  -- DNS übersetzt Domainnamen
  '20000000-0000-4000-8000-000000000003',  -- HTTPS-Port
  '20000000-0000-4000-8000-000000000007',  -- DHCP
  '20000000-0000-4000-8000-000000000011',  -- CIA-Schutzziele
  '20000000-0000-4000-8000-000000000012',  -- Phishing
  '20000000-0000-4000-8000-000000000015',  -- Zwei-Faktor-Authentifizierung
  '20000000-0000-4000-8000-000000000018',  -- Firewall
  '20000000-0000-4000-8000-000000000021',  -- CPU führt Befehle aus
  '20000000-0000-4000-8000-000000000022',  -- RAM vs. SSD
  '20000000-0000-4000-8000-000000000023',  -- Byte = 8 Bit
  '20000000-0000-4000-8000-000000000026',  -- GPU
  '20000000-0000-4000-8000-000000000031',  -- HTTP
  '20000000-0000-4000-8000-000000000032',  -- SQL
  '20000000-0000-4000-8000-000000000033',  -- VPN
  '20000000-0000-4000-8000-000000000035',  -- DNS
  '20000000-0000-4000-8000-000000000036',  -- SSD
  '20000000-0000-4000-8000-000000000037',  -- LAN
  '20000000-0000-4000-8000-000000000051',  -- pwd
  '20000000-0000-4000-8000-000000000053',  -- Kernel
  '20000000-0000-4000-8000-000000000054'   -- NTFS
);

update public.questions set difficulty = 'medium' where id in (
  '20000000-0000-4000-8000-000000000001',  -- OSI: Transportschicht
  '20000000-0000-4000-8000-000000000004',  -- private IPv4 nach RFC 1918
  '20000000-0000-4000-8000-000000000006',  -- Switch arbeitet auf Layer 2
  '20000000-0000-4000-8000-000000000008',  -- Eigenschaften von UDP
  '20000000-0000-4000-8000-000000000013',  -- asymmetrische Verschlüsselung
  '20000000-0000-4000-8000-000000000016',  -- SQL Injection
  '20000000-0000-4000-8000-000000000017',  -- DDoS
  '20000000-0000-4000-8000-000000000024',  -- RAID 1
  '20000000-0000-4000-8000-000000000028',  -- CPU-Cache
  '20000000-0000-4000-8000-000000000034',  -- API
  '20000000-0000-4000-8000-000000000041',  -- Wasserfallmodell
  '20000000-0000-4000-8000-000000000042',  -- Scrum
  '20000000-0000-4000-8000-000000000043',  -- Primärschlüssel
  '20000000-0000-4000-8000-000000000044',  -- Binär 1010
  '20000000-0000-4000-8000-000000000047',  -- Compiler
  '20000000-0000-4000-8000-000000000048',  -- Lastenheft
  '20000000-0000-4000-8000-000000000052',  -- Prozess
  '20000000-0000-4000-8000-000000000056'   -- Virtualisierung
);

update public.questions set difficulty = 'hard' where id in (
  '20000000-0000-4000-8000-000000000005',  -- nutzbare Hosts in einem /26
  '20000000-0000-4000-8000-000000000014',  -- Salt bei Passwort-Hashes
  '20000000-0000-4000-8000-000000000025',  -- NVMe über PCIe
  '20000000-0000-4000-8000-000000000027',  -- 1 KiB = 1024 Byte
  '20000000-0000-4000-8000-000000000038',  -- DSGVO
  '20000000-0000-4000-8000-000000000045',  -- Hexadezimal FF
  '20000000-0000-4000-8000-000000000046',  -- 3-2-1-Regel
  '20000000-0000-4000-8000-000000000055',  -- chmod
  '20000000-0000-4000-8000-000000000057'   -- Swap-Bereich
);
