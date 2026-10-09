# BTPhoto Private Cloud – Fejlesztési baseline v0.2

**Baseline azonosító:** `BTPC-BL-2026-10-09-v0.2`
**Dátum:** `2026-10-09`
**Előző baseline:** `BTPC-BL-2026-09-13-v0.1`
**Cél:** az elfogadott Astro frontend, témarendszer, UI-komponensek és interakciós követelmények dokumentációs állapotának rögzítése.

## Baseline hatókör

Ez a baseline a `03-funkcionalis-kovetelmenyek.md`–`09-rendszerterv-es-szolgaltatasarchitektura.md` dokumentumok aktuális állapotát rögzíti. A `BASELINE-v0.1.md` történeti baseline marad, tartalmát ez a fájl nem írja felül.

## Baseline döntések

- A frontend technológiai baseline Astro 7, TypeScript és Tailwind CSS.
- A statikus szerkezet Astro komponensekben, az indokolt interakciók minimális natív kliensoldali TypeScript modulokban valósulnak meg.
- A világos és sötét témarendszer rendszerpreferenciát követő alapállapotot, megőrzött kézi választást és tokenalapú színeket használ.
- Az ipari-editoriális UI világos hidegszürke, sötét grafit és oxidvörös hangsúlyszínre épül.
- Az újrafelhasználható alapkomponensek köre: Button, Input, Card, Badge, Toast, Dialog, LoadingState, EmptyState és ErrorState.
- A walking skeleton interakciós rétege koordinátakurzort, mágneses gombállapotot, canvas-alapú topografikus hullámot, felfedést és korlátozott scroll-parallaxot tartalmaz.
- A mozgásrendszer nem módosítja a natív görgetést, érintős vagy durva mutatós eszközön letiltja a koordinátakurzort, és tiszteletben tartja a `prefers-reduced-motion` beállítást.
- A frontend unit tesztelési baseline Vitest; a quality gate része az Astro/TypeScript check, lint, unit teszt és production build.
- A követelményláncban a frontend baseline elsődleges elemei: `NFR-USB-0002`, `NFR-PER-0001`, `NFR-MNT-0002`, `TR-TCH-0002`, `TC-QLT-0003`, `TC-UI-0004`–`TC-UI-0008`.

## Baseline dokumentumok SHA-256

- `03-funkcionalis-kovetelmenyek.md`
  `5d3b05693909fea67306274030d5d7a34cb6d49cae23c8082100927848f7b439`
- `04-nem-funkcionalis-kovetelmenyek.md`
  `e7b89cde75e25a4bb6cbc1be8bd9e55ee4fb062091e1dfb3dc9674c71b65185c`
- `05-technikai-kovetelmenyek.md`
  `183b6005f703f87fc11d610cf064a0fd7246cd4b298b3511a75e86ee13fb3ff0`
- `06-teszteset-gyujtemeny.md`
  `d2ac63157b4cb291e0b2c7cb05ce8bad0596132e202a5f999478c80d1308ccdf`
- `07-nyomonkovethetosegi-matrix.md`
  `12d5508ec25305b02de78e8e6a5481ba550ae1d698a361dc5f860602e1714f4d`
- `08-ui-ux-terv.md`
  `3f4f44c12691bc6a50ea479c700ebf730aa7792076ded4f7dc3fb39513698e5f`
- `09-rendszerterv-es-szolgaltatasarchitektura.md`
  `edb8c1eb01269982c93c207922d77ff690d7d0ed3d585becfeb20873a19e6b6e`

## Következő implementációs scope

A frontend checkpoint után a walking skeleton következő fázisa a `sql01` CockroachDB és a valódi Flyway-integráció megvalósítása és ellenőrzése.
