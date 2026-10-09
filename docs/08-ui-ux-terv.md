# UI/UX terv

**Dokumentum státusza:** fejlesztési baseline v0.1  
**Projekt:** BTPhoto Private Cloud  
**Baseline azonosító:** `BTPC-BL-2026-09-13-v0.1`  
**Baseline dátuma:** `2026-09-13`

**Kapcsolódó dokumentumok:**
- `01-uzleti-kovetelmenyek.md`
- `02-epicek-es-user-storyk.md`
- `03-funkcionalis-kovetelmenyek.md`
- `04-nem-funkcionalis-kovetelmenyek.md`
- `05-technikai-kovetelmenyek.md`
- `06-teszteset-gyujtemeny.md`
- `07-nyomonkovethetosegi-matrix.md`
- `09-rendszerterv-es-szolgaltatasarchitektura.md`

Ez a dokumentum a BTPhoto Private Cloud teljes webes felületi rendszerének vizuális és interakciós tervét rögzíti.

A cél két, egymással összefüggő, de eltérő használati mód kiszolgálása:

1. **Fotós/Admin felület** – funkcionális, áttekinthető munkafelület ügyfelek, galériák, média és kiválasztások kezelésére.
2. **Ügyfélgaléria** – képcentrikus, prémium megjelenésű, egyszerű és mobilbarát privát galériaélmény.

A felület vizuális referenciája a [szabolcskatona.hu](https://szabolcskatona.hu/hu/) ipari-editoriális webes rendszere: erős groteszk tipográfia, technikai monospace címkék, szabályos rács, vékony választóvonalak, világos/sötét témák, oxidvörös hangsúlyok, kontúrvonalas háttérelemek és visszafogott, mégis karakteres mozgás.

A terv **nem a referenciaoldal másolata**. A szerkesztési, tipográfiai, szín- és mozgási elvek kerülnek projekt-specifikusan átültetésre; a BTPhoto saját tartalmat, komponenseket, kontúrvonalas grafikát és márkaelemeket használ.

---

# 1. UI/UX célok

## UX-01 – A fotó legyen az elsődleges tartalom

Az ügyféloldalon a felület ne versenyezzen a fotókkal.

Elv:
- nagy képfelületek;
- kevés vizuális zaj;
- visszafogott navigáció;
- egyszerű kijelölési interakció;
- minimális adminisztratív tartalom.

## UX-02 – A fotós munkafolyamat legyen gyors

Az admin felület célja nem látványos marketingoldal, hanem gyors munkavégzés.

Elv:
- egyértelmű státuszok;
- rövid út a galéria létrehozástól a feltöltésig;
- egyértelmű upload állapot;
- a megosztási link könnyen másolható;
- az ügyfél selection eredménye gyorsan áttekinthető.

## UX-03 – Mobilon is teljes értékű ügyfélélmény

A proofing folyamatnak mobiltelefonon is használhatónak kell lennie.

Az ügyfél mobilon is képes legyen:
- galériát megnyitni;
- képet nagyítani;
- képet kijelölni;
- kiválasztási darabszámot látni;
- selectiont véglegesíteni.

## UX-04 – Egyértelmű bizalom és privát jelleg

A felületből legyen érzékelhető, hogy az ügyfél:
- privát anyagot lát;
- nem egy nyilvános fotómegosztó oldalon van;
- a fotós saját szolgáltatásában böngészik.

## UX-05 – Következetes designrendszer

Az admin és ügyfélfelület ugyanazt a vizuális nyelvet használja, de eltérő sűrűséggel.

- ügyfél: levegős, képközpontú;
- admin: tömörebb, funkcionálisabb.

---

# 2. Termékvízió

A BTPhoto felületének karaktere:

- prémium, de nem hivalkodó;
- ipari-editoriális;
- precíz és technikai, de nem rideg;
- fotóközpontú;
- kortárs és professzionális.

A design ne legyen:

- klasszikus NAS vagy fájlkezelő UI;
- túl steril enterprise dashboard;
- generic Bootstrap admin;
- neon színű tech dashboard;
- túl dekoratív, a fotókat háttérbe szorító felület;
- e-commerce jellegű kosár/termékkártya másolat.

---

# 3. Vizuális referencia és adaptáció

A `szabolcskatona.hu` oldalból megtartandó tervezési elvek:

- tizenkét oszlopos, fegyelmezett, reszponzív rács;
- nagy, sűrített groteszk címsorok és monospace műszaki címkék;
- hidegszürke világos, grafit sötét felület és oxidvörös akcentus;
- vékony, funkcionális választóvonalak és kevéssé lekerekített panelek;
- kontúrvonalas és koordináta-jellegű háttérelemek;
- státuszpontok, adatblokkok és indexszámok;
- rövid belépő áttűnés, marquee, hover- és témaváltási animáció;
- mobilon egyszerű navigáció és a tartalom vizuális elsőbbsége.

A BTPhoto-specifikus átalakítás:

| Referenciaelv | BTPhoto megfelelő |
| --- | --- |
| projekt-/esettanulmány-rács | fotógaléria és galérialista |
| technikai adatblokk | galéria-, média- és rendszerstátusz |
| kontúrvonalas háttér | saját, fotózáshoz és infrastruktúrához kötődő absztrakt grafika |
| nagyméretű display tipográfia | galéria- és adminoldal főcíme |
| indexált tartalmi sor | ügyfél-, galéria- és kiválasztási lista |
| oxidvörös kiemelés | CTA, fókusz, kijelölés és élő állapot |
| animált témaváltás | megőrzött világos/sötét felhasználói beállítás |

---

# 4. Információs architektúra

## 4.1 Admin nézetek

Tervezett fő route-ok:

```text
/admin/login
/admin
/admin/clients
/admin/clients/:clientId
/admin/galleries
/admin/galleries/new
/admin/galleries/:galleryId
/admin/galleries/:galleryId/upload
/admin/galleries/:galleryId/share
/admin/galleries/:galleryId/selection
```

Később:

```text
/admin/settings
/admin/audit
```

## 4.2 Ügyféloldali nézetek

Az ügyfél elsődlegesen privát share tokenen keresztül lép be.

Tervezett logika:

```text
/g/:token
```

A route ugyanazon ügyfélgaléria alkalmazáson belül kezeli:

- gallery header;
- grid;
- lightbox;
- selection;
- finalize flow.

Később:

```text
/g/:token/download
```

vagy külön média letöltési végpontok.

---

# 5. Fő navigációs modell

## Admin

Desktop oldalsó navigáció:

```text
BTPhoto
────────────
Áttekintés
Ügyfelek
Galériák
────────────
Rendszer
```

MVP-ben a „Rendszer” rész minimalizálható.

Mobil/tablet admin:
- slide-over vagy hamburger menü;
- kritikus műveletek az oldal tartalmában is elérhetők.

## Ügyfél

Az ügyfélgalériában nincs klasszikus alkalmazásmenü.

Fejléc:
- BTPhoto / fotós logó vagy név;
- galéria cím;
- opcionális selection számláló;
- opcionális „Kiválasztás véglegesítése” művelet.

A navigáció scroll közben keskeny sticky headerre válthat.

---

# 6. Szín- és témarendszer

A BTPhoto két teljes, szemantikusan azonos design token készletet használ. A világos és sötét téma nem külön oldalváltozat: ugyanazokat a komponenseket, állapotokat és információs hierarchiát jeleníti meg.

## 6.1 Világos téma

| Token | Érték | Használat |
| --- | --- | --- |
| `Ground` | `#E7E9EC` | fő háttér |
| `Panel` | `#F4F5F7` | kiemelt felület és panel |
| `Panel 2` | `#DDE0E5` | másodlagos blokk, skeleton |
| `Ink` | `#151A21` | fő szöveg, tömör CTA |
| `Slate` | `#5A6471` | másodlagos szöveg, metaadat |
| `Oxide` | `#B5381F` | akcentus, fókusz, aktív állapot |
| `Rule` | `rgba(21, 26, 33, 0.15)` | finom választóvonal |
| `Rule Strong` | `rgba(21, 26, 33, 0.34)` | erős szerkezeti vonal |

## 6.2 Sötét téma

| Token | Érték | Használat |
| --- | --- | --- |
| `Ground` | `#101418` | fő háttér |
| `Panel` | `#171C22` | kiemelt felület és panel |
| `Panel 2` | `#20262E` | másodlagos blokk, skeleton |
| `Ink` | `#E4E7EB` | fő szöveg |
| `Slate` | `#8C97A5` | másodlagos szöveg, metaadat |
| `Oxide` | `#F26B4A` | akcentus, fókusz, aktív állapot |
| `Rule` | `rgba(228, 231, 235, 0.14)` | finom választóvonal |
| `Rule Strong` | `rgba(228, 231, 235, 0.32)` | erős szerkezeti vonal |

## 6.3 Állapotszínek

A státuszszínek mindkét témában külön tokenértéket kapnak, és mindig szöveggel vagy ikonnal együtt jelennek meg.

| Állapot | Világos | Sötét |
| --- | --- | --- |
| Success | `#2F6B4F` | `#6FBF95` |
| Warning | `#8A5A12` | `#D9A441` |
| Error | `#9B3122` | `#FF8068` |
| Info | `#4D6678` | `#85A6BD` |

## 6.4 Témaválasztás

- első látogatáskor az operációs rendszer `prefers-color-scheme` értéke érvényesül;
- a fejlécben mindig elérhető világos/sötét témaváltó;
- a kézi választás `localStorage` használatával megmarad;
- a téma az első kirajzolás előtt alkalmazandó a hibás témafelvillanás csökkentésére;
- a böngésző `color-scheme` értéke kövesse az aktív témát;
- a témaváltó felirata és `aria-label` értéke jelezze a következő állapotot.

## 6.5 Interakciós szabályok

Primary action:
- `Ink` alap és kontrasztos inverz szöveg;
- hover/focus állapotban `Oxide` akcentus.

Selected photo:
- `Oxide` outline;
- check ikon és szöveges jelzés;
- opcionális, témához igazodó overlay.

Destructive:
- kizárólag valóban destruktív műveletnél error szín;
- megerősítő szöveg nélkül nem lehet csak színre támaszkodni.

---

# 7. Tipográfia

## 7.1 Betűpárosítás

Elfogadott irány:

### Display és főcím
`Archivo Variable`

Használat:
- ügyfélgaléria címe;
- landing/hero cím;
- nagy section heading;
- sűrített, nagybetűs indexcímek.

### UI / törzsszöveg
`IBM Plex Sans Variable`

Használat:
- navigáció;
- gomb;
- input;
- admin táblázat;
- metaadat;
- body.

### Technikai címke és adat
`IBM Plex Mono`

Használat:
- státuszcímke;
- koordináta, dátum és technikai adat;
- badge és index;
- rövid műveleti felirat.

A három betűcsalád helyben csomagolandó, így a megjelenítés nem függ külső fontszolgáltatástól.

## 7.2 Tipográfiai skála

Desktop:

- Display: `88–168px`
- H1: `52–88px`
- H2: `30–36px`
- H3: `22–26px`
- Body L: `18px`
- Body M: `16px`
- Body S: `14px`
- Meta: `12px`

Mobil:

- Display: `56–100px`
- H1: `38–56px`
- H2: `26–30px`
- H3: `20–22px`
- Body: `16px`

## 7.3 Tipográfiai szabály

- a nagy display címsor tömör, sűrített és erős legyen, körülötte nagy negatív térrel;
- admin felületen a display stílus csak az oldal- és szakaszcímeknél használható;
- gomb és törzsszöveg sans-serif, technikai adat monospace;
- monospace hosszú törzsszöveghez nem használható;
- a tipográfiai hierarchia mindkét témában és mobilon is maradjon egyértelmű.

---

# 8. Layout és spacing rendszer

## 8.1 Konténer

Admin:
- desktop max width: `1440px`
- content max width: kb. `1280px`
- sidebar: `240–272px`
- nagy felületeken tizenkét oszlopos szerkezeti rács

Ügyfél:
- gallery header content max width: `1280–1440px`
- gallery grid széles viewporton kitöltheti a hasznos felület nagy részét.

## 8.2 Spacing

Alap: `4px`

Fő lépcsők:

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

## 8.3 Radius

Admin:
- input: `0–4px`
- panel: `0–4px`
- modal: `2–8px`

Ügyfél:
- gallery card: `0–4px`
- hero/cover: `0–8px`
- pill badge: `999px`

A pill forma kizárólag rövid státuszjelzéshez használható. A panelek, képek és fő műveletek alapvetően szögletesek; a vizuális hierarchiát elsősorban rács, választóvonal és tipográfia adja.

---

# 9. Elevation és border

Árnyék csak funkcionális hierarchia jelzésére.

### Admin panel
Elsősorban vékony `Rule` vagy `Rule Strong` választóvonal. Finom árnyék csak lebegő rétegnél vagy kiemelt rendszerpanelnél.

### Modal
Erősebb, de lágy árnyék.

### Gallery image
Alapállapotban nincs nagy árnyék.

Hover:
- minimális emelkedés;
- selected állapotnál outline fontosabb, mint shadow.

Border:
- témafüggő `Rule` és `Rule Strong` token;
- active/focus: `Oxide`.

---

# 10. Ikonrendszer és vizuális jelek

Javasolt:
- egyszerű, négyzetes végű, saját inline SVG ikonok vagy egységes, keretrendszerfüggetlen ikonkészlet;
- kis oxidvörös négyzet mint visszatérő állapot- és márkajel;
- kontúrvonalas, koordináta- és rácsmotívumok kizárólag dekoratív háttérként.

Fő ikonok:
- User
- Users
- Image
- Images
- Upload
- Link
- Copy
- Check
- Heart
- Download
- Trash
- MoreHorizontal
- ChevronLeft / Right
- X
- Shield
- AlertCircle

Szabály:
- ikon ne legyen önmagában kritikus jelentés hordozója tooltip/aria-label nélkül.

---

# 11. Komponensrendszer

## 11.1 Gombok

Típusok:

- `PrimaryButton`
- `SecondaryButton`
- `GhostButton`
- `DestructiveButton`
- `IconButton`

Primary:
- fő folyamat CTA.

Példa:
- Galéria létrehozása
- Feltöltés
- Link létrehozása
- Kiválasztás véglegesítése

## 11.2 Inputok

- Text input
- Email input
- Textarea
- Date input
- Search input

Állapot:
- default
- focus
- invalid
- disabled

A hibaüzenet mindig közvetlenül a mezőhöz kapcsolódjon.

## 11.3 Badge-ek

Admin gallery state:

- `DRAFT`
- később `SHARED`
- később `SELECTION_COMPLETE`
- `ARCHIVED` POST-MVP

Felhasználói nyelven:

- Piszkozat
- Megosztva
- Kiválasztás kész
- Archivált

A rendszer belső enum neve ne legyen kötelezően ugyanaz, mint a UI szöveg.

## 11.4 Toast

Használat:
- link másolva;
- mentés sikeres;
- kisebb nem blokkoló hiba.

Nem használható:
- fontos destruktív megerősítés helyett;
- hosszú hibaleírásra.

## 11.5 Modal / Dialog

Használat:
- destructive confirm;
- selection finalize confirm;
- share revoke confirm.

## 11.6 Skeleton

Használat:
- gallery grid;
- admin listák;
- dashboard summary.

## 11.7 EmptyState

Kötelező:
- nincs ügyfél;
- nincs galéria;
- galéria még üres;
- nincs véglegesített selection.

Az empty state mindig adjon következő releváns lépést, ha a user jogosult rá.

---

# 12. Fotókártya / `MediaTile`

Ez a projekt egyik legfontosabb komponense.

## Admin változat

Megjeleníti:
- képet;
- eredeti fájlnevet vagy rövidített metaadatot;
- upload állapotot;
- opcionális műveleti menüt.

Admin hover:
- finom overlay;
- actions.

## Ügyfél változat

Alap:
- maga a fotó dominál;
- lehetőleg nincs látható technikai metaadat.

Kijelölt állapot:
- jól látható outline;
- check/heart ikon;
- opcionális rövid „Kiválasztva” jelzés.

## Képarány

A grid ne kényszerítsen minden fotót egyetlen négyzetes cropba.

Javasolt:
- masonry-szerű vagy arányt megőrző adaptív grid;
- az első MVP-ben CSS grid + `object-fit: cover` is elfogadható, ha a crop kontrollált;
- lightboxban mindig az eredeti képarány dominál.

---

# 13. Lightbox

## Funkciók

- nagy kép;
- következő / előző;
- bezárás;
- kiválasztás;
- selection állapot;
- billentyűzetes navigáció;
- mobil swipe később.

## Desktop

- kép középen;
- sötét háttér;
- vezérlők a széleken;
- metaadat minimális.

## Mobil

- kép maximális szélességgel;
- alsó action bar;
- nagy, érinthető gombok.

## Billentyűzet

- `Esc`: bezárás
- bal/jobb nyíl: navigáció
- fókusz ne szökjön a dialog mögé.

---

# 14. Admin oldalak

## 14.1 Login

### Cél

Biztonságos, egyszerű belépés.

### Layout

Desktop:
- kétzónás oldal.

Bal:
- márka / fotós hangulatkép vagy absztrakt fotós vizuál.

Jobb:
- login card.

Mobil:
- csak egyszerű login panel + brand header.

### Mezők

- felhasználónév/e-mail
- jelszó
- bejelentkezás CTA

### Állapotok

- loading
- invalid credentials
- backend unavailable

### Backend

- `POST /api/auth/login`

---

## 14.2 Admin Dashboard

### Cél

Gyors belépési pont a napi munkába.

MVP-ben nem szükséges komplex analitika.

Javasolt blokkok:

- Új galéria CTA
- Legutóbbi galériák
- Ügyfelek száma
- Galériák száma
- „Kiválasztás kész” jelzés, ha már van proofing

Később:
- storage usage;
- pending selection;
- recent activity.

---

## 14.3 Ügyféllista

### Fő elemek

- page title;
- „Új ügyfél” CTA;
- search mező;
- lista vagy egyszerű table/card hibrid.

Mezők:
- név;
- e-mail, ha van;
- galériák száma;
- utolsó módosítás később.

### Mobil

Card lista.

### Empty state

> Még nincs ügyfél. Hozd létre az első ügyfelet, hogy galériát rendelhess hozzá.

### Backend

- `GET /api/admin/clients`
- `POST /api/admin/clients`

---

## 14.4 Új ügyfél

Kis, fókuszált form.

Mezők:
- név*
- e-mail
- opcionális megjegyzés később

CTA:
- Ügyfél létrehozása

Cancel:
- vissza

Ne legyen teljes CRM-form.

---

## 14.5 Galérialista

### Fő elemek

- „Új galéria” CTA
- search
- státuszfilter később
- gallery card/list

Gallery card:
- cover thumbnail, ha van;
- cím;
- ügyfél;
- dátum;
- státusz;
- média darabszám.

### Empty state

> Még nincs galéria. Hozd létre az első projektet.

### Backend

- `GET /api/admin/galleries`

---

## 14.6 Új galéria

Mezők:
- ügyfél select/search;
- cím*;
- esemény dátuma;
- leírás.

Default:
- privát / draft.

CTA:
- Galéria létrehozása

A létrehozás után redirect:
- gallery detail / upload.

---

## 14.7 Galéria admin nézet

Ez az admin felület központi munkaképernyője.

### Fejléc

- galéria neve
- ügyfél
- státusz badge
- esemény dátuma
- „Feltöltés”
- „Megosztás”

### Másodlagos navigáció

Tab vagy section:

```text
Képek
Megosztás
Kiválasztás
```

MVP-ben a route maradhat egy oldal, section anchor/tab állapottal.

### Gallery grid

Admin media tile-ok.

### Üres állapot

> A galéria még üres. Tölts fel JPEG képeket az ügyfélanyag létrehozásához.

---

# 15. Upload UX

A feltöltés a projekt első fontos működési flow-ja.

## 15.1 Dropzone

Fő szöveg:

> Húzd ide a képeket, vagy válaszd ki őket a gépedről.

Kiegészítő:

> Az első MVP JPEG/JPG fájlokat támogat.

## 15.2 Feltöltési sor

Minden fájl:
- thumbnail vagy ikon;
- fájlnév;
- méret;
- státusz;
- progress, ha technikailag implementált;
- hibaüzenet.

Státusz:

- várakozik;
- feltöltés;
- sikeres;
- sikertelen.

## 15.3 Hiba

Példa:

> A fájlt nem sikerült elmenteni. Ellenőrizd a kapcsolatot, majd próbáld újra.

Ne jelenjen meg:
- `/srv/storage/...`
- Java exception
- NFS mount részlet.

## 15.4 Első MVP

Az első implementáció egyetlen JPEG feltöltésével is indulhat.

A UI viszont úgy készüljön, hogy később többfájlos upload bővíthető legyen.

---

# 16. Share kezelés

## Galéria megosztás panel

Állapot 1 – nincs share:

- rövid magyarázat;
- „Privát link létrehozása” CTA.

Állapot 2 – aktív share:

- URL;
- copy button;
- „Link másolva” toast;
- „Hozzáférés visszavonása” secondary/destructive action.

### Biztonsági szöveg

> A link birtokában az ügyfél hozzáfér a galériához. Ne oszd meg nyilvánosan.

A token technikai értéke ne jelenjen meg külön debug mezőként.

Backend:
- `POST /api/admin/galleries/{galleryId}/shares`
- revoke endpoint.

---

# 17. Selection admin nézet

## Állapot 1 – nincs selection

> Az ügyfél még nem véglegesítette a kiválasztást.

## Állapot 2 – folyamatban

Később, ha a backend ezt publikus/admin státuszként megadja:

> A válogatás folyamatban van.

## Állapot 3 – végleges

- selected darabszám;
- media grid kizárólag kiválasztott képekkel;
- véglegesítés ideje.

## 17.1 Letöltési engedély kezelése

A `US-0013` lezárásával az MVP-ben a letöltési jogosultság médiaelemenként kezelendő.

Alapállapot:
- új média **nem letölthető**.

Admin selection/media tile kiegészítés:
- `Letölthető` switch vagy checkbox;
- állapotváltás azonnali, egyértelmű visszajelzéssel;
- visszavonáskor megerősítés nem kötelező, mert a fizikai fájl nem törlődik;
- idegen galéria médiaállapota nem módosítható.

Első MVP:
- egyedi médiaelemenkénti kapcsoló.

Későbbi UX:
- „Összes kiválasztott engedélyezése” bulk action.

Backend:
- `PATCH /api/admin/galleries/{galleryId}/media/{mediaId}/download-permission`

Később:
- export;
- megjegyzések.

---

# 18. Ügyfélgaléria

Az ügyféloldal a projekt vizuálisan legfontosabb része.

## 18.1 Gallery hero/header

Tartalom:

- BTPhoto / fotós brand;
- galéria cím;
- esemény dátuma, ha releváns;
- rövid leírás;
- opcionális kép darabszám.

Háttér:
- az aktív témához tartozó `Ground`/`Panel` alap;
- vagy visszafogott cover image.

Nem szükséges nagy marketinghero minden galériához.

## 18.2 Gallery grid

Desktop:
- 3–4 vizuális oszlop;
- adaptív.

Tablet:
- 2–3 oszlop.

Mobil:
- 1–2 oszlop az adott képarányok függvényében.

Cél:
- minél kevesebb zavaró UI;
- a kép dominál.

---

# 19. Client proofing UX

## 19.1 Kép kijelölása

Desktop:
- hover/focus alatt selection control megjelenhet;
- kattintással jelölés.

Mobil:
- ikon mindig könnyen elérhető;
- tap target legalább kényelmes méretű.

Selected:
- outline;
- ikon;
- szükség esetén overlay.

## 19.2 Sticky selection bar

Ha legalább egy kép ki van jelölve:

Desktop:
- alsó vagy felső visszafogott sticky bar.

Mobil:
- alsó sticky action bar.

Tartalom:

```text
5 kép kiválasztva
[ Kiválasztás véglegesítése ]
```

## 19.3 Véglegesítés

Dialog:

**Cím**
> Véglegesíted a kiválasztást?

**Szöveg**
> 5 képet választottál ki.

Az, hogy finalizálás után módosítható-e a selection, még üzleti döntés.

Amíg nincs döntés, a UI szöveg ne ígérjen visszavonhatatlanságot.

CTA:
- Véglegesítés
- Mégsem

## 19.4 Sikerállapot

> Köszönjük! A kiválasztásodat elmentettük.

A fotós oldalán ezután megjelenik a selection.

---

# 20. Ügyféloldali üres és hibaállapotok

## Érvénytelen share

Cím:
> Ez a galéria nem érhető el.

Leírás:
> A link érvénytelen vagy már nem aktív. Kérj új hozzáférést a fotóstól.

Ne mondjuk el:
- token nem létezik;
- token revoked;
- gallery ID;
- technikai security ok.

## Üres galéria

> A galéria még nem tartalmaz megjeleníthető képeket.

## Média betöltési hiba

Egy hibás kép ne omlassza össze a teljes gridet.

Placeholder:
- semleges háttér;
- „A kép jelenleg nem érhető el.”

---

# 21. Loading állapotok

Kötelező loading UX:

- admin listák;
- gallery detail;
- public gallery;
- media grid;
- selection submit;
- share create/revoke.

Szabály:

- rövid műveletnél spinner button state;
- lista/grid betöltésnél skeleton;
- teljes oldal villogó spinner lehetőleg kerülendő.

---

# 22. Error állapotok

## Form validation

Mező alatt:
- konkrét hiba.

Példa:
> Add meg az ügyfél nevét.

## Backend üzleti hiba

Panel/toast, súlyosságtól függően.

## Storage hiba admin oldalon

> A média tárhely jelenleg nem érhető el. A fájl nem került mentésre.

## Publikus oldalon

Belső infrastruktúra információ ne jelenjen meg.

---

# 23. Reszponzív szabályok

Javasolt breakpointok a Tailwind baseline-hoz igazítva:

- mobile: `< 640px`
- small/tablet: `640–767px`
- tablet: `768–1023px`
- desktop: `1024–1279px`
- wide: `≥ 1280px`

## Mobil admin

- sidebar hamburger/drawer;
- table → card/list;
- CTA full-width lehet.

## Mobil ügyfélgaléria

- minimális header;
- sticky selection action;
- lightbox full-screen.

## Desktop ügyfélgaléria

- nagy whitespace;
- széles grid;
- lightbox overlay.

---

# 24. Hozzáférhetőség

Cél: legalább WCAG 2.2 AA szemléletű megvalósítás.

Minimum követelmények:

- látható fókusz minden interaktív elemen;
- megfelelő színkontraszt;
- billentyűzetes navigáció;
- form label-ek;
- hibaüzenet szöveges;
- selected állapot ne csak színnel kommunikáljon;
- modal fókuszkezelés;
- `aria-label` az icon-only gombokhoz;
- képekhez megfelelő alt stratégia;
- `prefers-reduced-motion` tiszteletben tartása fontos animációknál.

## Fotó alt stratégia

Admin:
- technikai/üzleti azonosító használható, ha nincs leíró alt.

Ügyfél:
- ha nincs leíró cím, ne találjunk ki mesterséges képleírást;
- galériaképek esetén kontextusfüggően rövid fájl-/sorszám alapú alt vagy dekoratív kezelés alkalmazható;
- a pontos policy a frontend implementációkor véglegesítendő.

---

# 25. Animáció és áttűnés

A mozgás feladata a hierarchia, az állapotváltozás és a navigáció értelmezésének segítése. A referenciaoldal karakteres mozgásnyelvét a BTPhoto rövidebb, funkcionális animációkkal adaptálja.

Elfogadott mozgási rendszer:

- alap easing: `cubic-bezier(0.16, 1, 0.3, 1)`;
- hover/focus átmenet: `160–240 ms`;
- panel- és oldalbelépés: `600–1000 ms`, lépcsőzetes késleltetéssel;
- modal és lightbox: `180–320 ms` fade/translate;
- témaváltás: böngészőtámogatás esetén View Transition, egyébként rövid színáttűnés;
- élő státusz: visszafogott pulzus, szöveges állapot mellett;
- marquee csak tájékoztató/dekoratív sávban és mérsékelt sebességgel;
- első belépő animáció munkamenetenként legfeljebb egyszer alkalmazható.

Walking-skeleton interakciós réteg:

- finom és hoverképes mutatón teljes viewportos X/Y tengely, célpont és numerikus koordinátakijelzés;
- interaktív elem fölött a célpont méret- és kitöltésváltozással jelez, de sem kattintást, sem fókuszt nem fog el;
- érintős, durva mutatós vagy mobil környezetben a koordinátakurzor kikapcsol, és a natív kurzor nincs elrejtve;
- a hero dekoratív vonalrendszere canvas-alapú hullámmal reagál a mutatóra és a görgetési pozícióra;
- a szekciók IntersectionObserver-alapú felfedést, a kijelölt hero blokkok visszafogott, natív scrollhoz kötött eltolást használnak;
- a görgetést a rendszer nem fogja el és nem időzíti át;
- a folyamatos rajzolás háttérbe kerülő lapnál szünetel, az inicializálás megszüntethető.

Kötelező fallback:

- `prefers-reduced-motion: reduce` esetén a belépő, pulzáló, marquee és témaváltási animáció gyakorlatilag azonnal fusson le vagy álljon le;
- animáció nélkül is minden tartalom, állapot és művelet elérhető legyen;
- a health, upload vagy selection állapot nem közölhető kizárólag mozgással.
- a hullám és parallax kikapcsol, a koordinátakijelzés simítás nélkül frissül;
- a scroll-felfedés nem tarthat tartalmat rejtve.

Kerülendő:
- görgetést akadályozó vagy tartalmat elrejtő intro;
- túlzott parallax;
- öncélú folyamatos mozgás;
- látványos card flip;
- lassú marketing animáció a proofing flow-ban.

---

# 26. Képteljesítmény és vizuális stabilitás

A designnak támogatnia kell a későbbi thumbnail/preview pipeline-t.

Követelmény:

- gallery grid ne legyen hosszú távon eredeti nagy fájlokra építve;
- `width` / `height` vagy aspect ratio ismert legyen a layout stabilitásához;
- lazy loading;
- megfelelő képméret;
- lightbox magasabb felbontást kérhet, mint a grid.

POST-MVP:
- `srcset`;
- WebP/AVIF;
- előtöltés a szomszéd lightbox képre.

---

# 27. Backend kapcsolatok képernyőnként

## Login

- `POST /api/auth/login`
- opcionális `GET /api/auth/me`
- `POST /api/auth/logout`

## Ügyfél lista

- `GET /api/admin/clients`
- `POST /api/admin/clients`

## Galéria lista

- `GET /api/admin/galleries`
- `POST /api/admin/galleries`

## Galéria admin

- `GET /api/admin/galleries/{id}`
- `GET /api/admin/galleries/{id}/media`

## Upload

- `POST /api/admin/galleries/{galleryId}/media`

## Share

- `POST /api/admin/galleries/{galleryId}/shares`
- revoke endpoint

## Public gallery

- `GET /api/public/galleries/{token}`

## Selection

Tervezett:
- selection lekérés;
- item add/remove;
- finalize.

## Admin selection

- `GET /api/admin/galleries/{galleryId}/selections`

A pontos URL-kontraktus a `03-funkcionalis-kovetelmenyek.md` implementációjakor véglegesíthető.

---

# 28. Frontend komponensstruktúra

Elfogadott Astro-struktúra:

```text
frontend/src/
├── components/
│   ├── ui/
│   ├── layout/
│   └── feedback/
├── layouts/
├── features/
│   ├── auth/
│   ├── clients/
│   ├── galleries/
│   ├── media/
│   ├── shares/
│   └── selection/
├── api/
├── lib/
├── pages/
│   ├── admin/
│   └── g/
├── scripts/
└── styles/
```

Architektúra-elv:
- statikus szerkezet és tartalom Astro komponensben;
- kliensoldali TypeScript kizárólag interaktív részekhez;
- API-hívás központosított `api/` modulból;
- összetett interakció később indokolt esetben külön Astro islandként vezethető be;
- teljes oldalra kiterjedő kliensoldali futtatókörnyezet nem alapértelmezett.

## Design token helye

Például:
- Tailwind theme;
- CSS custom properties;
- `styles/tokens.css` vagy a globális stílus tokenrétege.

A komponensek ne hardcode-olják mindenhol ugyanazokat a hex kódokat.

Megvalósított UI Slice 0 komponensek:

| Komponens | Astro megvalósítás | Kötelező szemantika |
| --- | --- | --- |
| Button | `components/ui/Button.astro` | link/gomb szerep, tiltott állapot, látható fókusz |
| Input | `components/ui/Input.astro` | label, leírás, `aria-invalid`, szöveges hiba |
| Card | `components/ui/Card.astro` | szemantikus tartalmi konténer és opcionális fejléc |
| Badge | `components/ui/Badge.astro` | tokenalapú neutral/accent/success/warning/error tónus |
| Toast | `components/ui/Toast.astro` + `scripts/toast.ts` | udvarias élő régió, hiba esetén `alert`, bezárás |
| Dialog | `components/ui/Dialog.astro` + `scripts/dialog.ts` | natív modal, kezdőfókusz, Tab-kör, Escape és fókusz-visszaadás |
| LoadingState | `components/feedback/LoadingState.astro` | `role=status`, `aria-busy`, szöveges állapot |
| EmptyState | `components/feedback/EmptyState.astro` | saját címkézett szekció és műveleti slot |
| ErrorState | `components/feedback/ErrorState.astro` | `role=alert`, szöveges hiba és műveleti slot |

---

# 29. Javasolt design token változók

Példa:

```css
:root {
  --ground: #E7E9EC;
  --panel: #F4F5F7;
  --panel-2: #DDE0E5;
  --ink: #151A21;
  --slate: #5A6471;
  --rule: rgb(21 26 33 / 15%);
  --rule-strong: rgb(21 26 33 / 34%);
  --oxide: #B5381F;
  --success: #2F6B4F;
  --warning: #8A5A12;
  --error: #9B3122;
}

:root[data-theme="dark"] {
  --ground: #101418;
  --panel: #171C22;
  --panel-2: #20262E;
  --ink: #E4E7EB;
  --slate: #8C97A5;
  --rule: rgb(228 231 235 / 14%);
  --rule-strong: rgb(228 231 235 / 32%);
  --oxide: #F26B4A;
  --success: #6FBF95;
  --warning: #D9A441;
  --error: #FF8068;
}
```

A tényleges kontrasztarányokat implementációkor ellenőrizni kell.

---

# 30. Első frontend implementációs scope

A UI-t ne az összes képernyő egyszerre történő megépítésével kezdjük.

## UI Slice 0 – Design system skeleton

- Astro layout és komponensalap;
- világos/sötét globális tokenek;
- rendszerpreferenciát követő, megőrzött témaválasztás;
- helyben csomagolt fontok;
- button;
- input;
- card;
- badge;
- toast;
- dialog;
- loading/empty/error komponens.

## UI Slice 1 – Első üzleti vertikum

Kapcsolódó:
- `US-0001`
- `US-0002`
- `US-0003`
- `US-0004`
- `US-0005`

Képernyők:

1. Login
2. Ügyféllista + új ügyfél
3. Galérialista + új galéria
4. Galéria admin nézet
5. Egy JPEG upload
6. Média grid

## UI Slice 2 – Share

1. Share panel
2. Link copy
3. Revoke confirm
4. Public gallery

## UI Slice 3 – Proofing

1. Public media tile selection
2. Lightbox
3. Selection counter
4. Finalize dialog
5. Admin selection view

---

# 31. UI/UX tesztkapcsolatok

| UI terület | Kapcsolódó teszt |
| --- | --- |
| mobil gallery | `TC-UI-0001` |
| keyboard proofing | `TC-UI-0002` |
| selected state | `TC-UI-0003` |
| világos/sötét témarendszer | `TC-UI-0004` |
| mozgáscsökkentett megjelenés | `TC-UI-0005` |
| koordinátakurzor és eszközfüggő fallback | `TC-UI-0006` |
| hullám/scroll mozgás és életciklus | `TC-UI-0007` |
| UI Slice 0 komponensek hozzáférhetősége | `TC-UI-0008` |
| első teljes admin flow | `TC-E2E-0001` |
| privát galéria | `TC-E2E-0002` |
| proofing | `TC-E2E-0003` |
| frontend quality | `TC-QLT-0003` |

---

# 32. Nyitott UI/UX döntések

Nem szükséges mindet az MVP fejlesztés megkezdése előtt lezárni.

1. Galériagrid masonry vagy szabályos adaptív grid legyen?
2. Gallery hero használjon-e cover képet?
3. A kiválasztási ikon szív vagy check legyen?
4. Az admin dashboard szükséges-e már az első release-ben, vagy a Galériák oldal legyen a kezdőképernyő?
5. A selection véglegesítés után módosítható-e?
6. A share panel egy aktív vagy több aktív linket kezeljen?
7. Bulk letöltésengedélyezés szükséges-e az MVP után? (Az MVP döntés: média-szintű, default tiltott.)
8. Készüljön-e saját BTPhoto logó vagy első körben csak tipográfiai wordmark?
9. A fotós neve / vállalkozás neve mennyire legyen testreszabható ügyféloldalon?

---

# 33. UI/UX és követelménykapcsolat

| UI elem | US / FR |
| --- | --- |
| Login | `US-0001`, `FR-AUT-0001` |
| Ügyfél űrlap | `US-0002`, `FR-DAT-0001` |
| Galéria létrehozás | `US-0003`, `FR-DAT-0002` |
| Upload | `US-0004`, `FR-MED-0001` |
| Admin media grid | `US-0005`, `FR-MED-0002` |
| Share panel | `US-0006`, `FR-SHR-0001` |
| Public gallery | `US-0007`, `FR-SHR-0002` |
| Selection UI | `US-0008`, `FR-WFL-0001` |
| Finalize UI | `US-0009`, `FR-WFL-0002` |
| Admin selection view | `US-0009`, `FR-WFL-0002` |
| Download UI | `US-0010`, `US-0013`, `FR-DWN-0001`, `FR-DWN-0002` |

---

# 34. Szakirodalmi és vizuális referencia

Szakirodalmi háttér:

[1] Krug, S.: *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability*. 3rd Edition. New Riders, 2014.

[2] Norman, D. A.: *The Design of Everyday Things*. Revised and Expanded Edition. Basic Books, 2013.

[3] Tidwell, J. – Brewer, C. – Valencia, A.: *Designing Interfaces: Patterns for Effective Interaction Design*. 3rd Edition. O’Reilly Media, 2020.

[4] Garrett, J. J.: *The Elements of User Experience: User-Centered Design for the Web and Beyond*. 2nd Edition. New Riders, 2010.

Vizuális és technikai referenciák:

- Katona Szabolcs – [szabolcskatona.hu](https://szabolcskatona.hu/hu/)
- átvett tervezési elvek: világos/sötét téma, ipari-editoriális tipográfia, technikai címkék, strukturált rács, oxidvörös akcentus, kontúrvonalas vizuál és visszafogott mozgás
- a konkrét BTPhoto tartalom, komponensek, grafikai elemek és interakciók saját projekt-specifikus adaptációk
- Astro dokumentáció – [Astro Components](https://docs.astro.build/en/basics/astro-components/)
- Astro dokumentáció – [Testing](https://docs.astro.build/en/guides/testing/)
- Astro dokumentáció – [View transitions](https://docs.astro.build/en/guides/view-transitions/)
- Astro dokumentáció – [Styling and Tailwind](https://docs.astro.build/en/guides/styling/)

---

# 35. Baseline állapot

A UI/UX terv a `BTPC-BL-2026-09-13-v0.1` fejlesztési baseline része.

A `GAP-001` lezárult:
- `US-0013`
- `FR-DWN-0002`
- média-szintű, alapértelmezetten tiltott letöltési jogosultság.

A frontend technológiai és vizuális baseline Astro 7, TypeScript, Tailwind CSS, valamint teljes világos/sötét témarendszer. A frontend checkpoint lezárása után folytatható a CockroachDB/Flyway walking skeleton, majd az első vertikális feature.
