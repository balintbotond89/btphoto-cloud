# Epic-ek és User Story-k

**Dokumentum státusza:** fejlesztési baseline v0.1  
**Projekt:** BTPhoto Private Cloud  
**Baseline azonosító:** `BTPC-BL-2026-09-13-v0.1`  
**Baseline dátuma:** `2026-09-13`

A backlog jelenlegi változata 5 MVP epicet és 1 későbbi bővítési irányt tartalmaz. A szerkezet az üzleti követelményekből indul ki, az elfogadási kritériumok pedig közvetlenül előkészítik a funkcionális követelményeket és a teszteseteket.

A cél, hogy a dokumentum elég részletes legyen a fejlesztéshez és a Codex feladatkiadásokhoz, de ne duplikálja a `03-funkcionalis-kovetelmenyek.md` részletes rendszer-specifikációját.

---

## Epic 1 – Adminisztráció, ügyfél- és galériakezelés

- Epic neve: Adminisztráció, ügyfél- és galériakezelés
- Leírás: A fotós biztonságos belső felületen kezelhesse az ügyfeleket és a hozzájuk tartozó galériákat.
- Üzleti célok:
  - `BR-FNC-0001` – Ügyfél- és galériakezelés biztosítása
  - `BR-DAT-0001` – Követhető média- és metaadatmodell kialakítása
- Hatókör:
  - admin bejelentkezés
  - ügyfél létrehozása
  - galéria létrehozása és listázása
  - galéria alapállapotának kezelése
- Epic szintű elfogadási feltétel: Bejelentkezett admin létre tud hozni egy ügyfelet és hozzá egy privát állapotú galériát, amely később médiafeltöltés célja lehet.

### US-0001 – Admin bejelentkezés

- US azonosító: `US-0001`
- US neve: Admin bejelentkezés
- Epic: Adminisztráció, ügyfél- és galériakezelés
- Státusz: elfogadott
- Prioritás: kritikus
- Story Pont: 5
- Rövid leírás:
  - Mint fotós/admin, azt szeretném, hogy biztonságosan bejelentkezhessek az admin felületre, azért hogy csak jogosult felhasználó kezelhesse az ügyfélanyagokat.
- Részletes leírás: A belső admin felületek és módosító API-végpontok csak hitelesített felhasználó számára legyenek elérhetők.
- Elfogadási kritériumok:
  - `AC-FR-AUT-0001-01`: Adott érvényes admin hitelesítési adat, amikor a felhasználó bejelentkezik, akkor a rendszer létrehoz egy érvényes munkamenetet vagy tokent és megnyitja az admin felületet.
  - `AC-FR-AUT-0001-02`: Adott a felhasználó nincs hitelesítve, amikor védett admin végpontot hív, akkor a rendszer megtagadja a hozzáférést.
  - `AC-FR-AUT-0001-03`: Adott hibás hitelesítési adat, amikor bejelentkezési kísérlet történik, akkor a rendszer általános, biztonságos hibaüzenettel elutasítja.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-AUT-0001`
- Modul/osztály/alrendszer referencia:
  - `SecurityConfig`
  - `AuthController`
  - `AuthService`

### US-0002 – Ügyfél létrehozása

- US azonosító: `US-0002`
- US neve: Ügyfél létrehozása
- Epic: Adminisztráció, ügyfél- és galériakezelés
- Státusz: elfogadott
- Prioritás: kritikus
- Story Pont: 3
- Rövid leírás:
  - Mint fotós/admin, azt szeretném, hogy új ügyfelet hozhassak létre, azért hogy a galériákat konkrét ügyfélhez tudjam rendelni.
- Részletes leírás: Az admin minimálisan névvel hoz létre ügyfelet; e-mail megadható, és ha megadásra kerül, validált adatként tárolandó.
- Elfogadási kritériumok:
  - `AC-FR-DAT-0001-01`: Adott érvényes ügyféladatok, amikor az admin új ügyfelet rögzít, akkor a rendszer eltárolja és egyedi azonosítót ad neki.
  - `AC-FR-DAT-0001-02`: Adott hiányzik a kötelező név, amikor mentés történne, akkor a rendszer validációs hibát ad.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-DAT-0001`
- Modul/osztály/alrendszer referencia:
  - `ClientController`
  - `ClientService`
  - `ClientRepository`

### US-0003 – Galéria létrehozása és listázása

- US azonosító: `US-0003`
- US neve: Galéria létrehozása és listázása
- Epic: Adminisztráció, ügyfél- és galériakezelés
- Státusz: elfogadott
- Prioritás: kritikus
- Story Pont: 5
- Rövid leírás:
  - Mint fotós/admin, azt szeretném, hogy ügyfélhez galériát hozhassak létre és a galériákat listázhassam, azért hogy egy fotózás teljes anyagát egy üzleti egységként kezelhessem.
- Részletes leírás: A galéria cím, ügyfélkapcsolat, opcionális eseménydátum és leírás mellett egyedi azonosítóval és alapértelmezetten privát állapottal jön létre.
- Elfogadási kritériumok:
  - `AC-FR-DAT-0002-01`: Adott létező ügyfél és érvényes galériaadatok, amikor az admin galériát hoz létre, akkor a rendszer eltárolja a galériát és az ügyfélhez kapcsolja.
  - `AC-FR-DAT-0002-02`: Adott új galéria jön létre, akkor alapértelmezett állapota nem publikus.
  - `AC-FR-DAT-0002-03`: Adott több galéria létezik, amikor az admin lekéri a galérialistát, akkor a rendszer visszaadja az alapadatokat és státuszokat.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-DAT-0002`
- Modul/osztály/alrendszer referencia:
  - `GalleryController`
  - `GalleryService`
  - `GalleryRepository`

---

## Epic 2 – Médiafeltöltés és médiakezelés

- Epic neve: Médiafeltöltés és médiakezelés
- Leírás: A fotós galériához médiát tölthessen fel úgy, hogy a fájl a saját NFS storage-on, a hozzá tartozó metaadat pedig CockroachDB-ben tárolódjon.
- Üzleti célok:
  - `BR-PRC-0001` – Médiafeltöltési és client proofing folyamat támogatása
  - `BR-DAT-0001` – Követhető média- és metaadatmodell kialakítása
- Hatókör:
  - JPEG feltöltés
  - fájlvalidáció
  - média metaadat rögzítés
  - admin galérianézet
  - később thumbnail/preview
- Epic szintű elfogadási feltétel: Egy JPEG fájl galériához feltölthető, fizikailag a MicroServer média storage-ra kerül, metaadata adatbázisba íródik, majd a webes felületen megjelenik.

### US-0004 – JPEG feltöltése galériához

- US azonosító: `US-0004`
- US neve: JPEG feltöltése galériához
- Epic: Médiafeltöltés és médiakezelés
- Státusz: elfogadott
- Prioritás: kritikus
- Story Pont: 8
- Rövid leírás:
  - Mint fotós/admin, azt szeretném, hogy JPEG képet tölthessek fel egy galériához, azért hogy az ügyfélanyagot a saját privát felhőmben kezelhessem.
- Részletes leírás: A backend ellenőrzi a fájlt, a bináris tartalmat a galéria NFS könyvtárába írja, majd a média metaadatait CockroachDB-ben rögzíti.
- Elfogadási kritériumok:
  - `AC-FR-MED-0001-01`: Adott létező galéria és támogatott JPEG, amikor az admin feltölti, akkor a fájl a galéria storage könyvtárába kerül és létrejön a médiarekord.
  - `AC-FR-MED-0001-02`: Adott nem támogatott fájl érkezik, amikor feltöltés történne, akkor a rendszer elutasítja és nem hoz létre sikeres médiarekordot.
  - `AC-FR-MED-0001-03`: Adott a storage írás sikertelen, amikor feltöltés történik, akkor a rendszer a teljes műveletet sikertelennek jelzi.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-MED-0001`
- Modul/osztály/alrendszer referencia:
  - `MediaController`
  - `MediaService`
  - `MediaStorageService`
  - `MediaAssetRepository`

### US-0005 – Feltöltött média megjelenítése az admin galériában

- US azonosító: `US-0005`
- US neve: Feltöltött média megjelenítése az admin galériában
- Epic: Médiafeltöltés és médiakezelés
- Státusz: elfogadott
- Prioritás: kritikus
- Story Pont: 5
- Rövid leírás:
  - Mint fotós/admin, azt szeretném, hogy a galériában vizuálisan lássam a feltöltött képeket, azért hogy ellenőrizhessem a galéria tartalmát.
- Részletes leírás: A média lista az adatbázis metaadataiból épül fel, a képi tartalmat pedig a storage-on lévő fájl alapján szolgálja ki a rendszer.
- Elfogadási kritériumok:
  - `AC-FR-MED-0002-01`: Adott galériához tartoznak médiarekordok és fájlok, amikor az admin megnyitja a galériát, akkor a képek megjelennek.
  - `AC-FR-MED-0002-02`: Adott egy médiafájl fizikailag hiányzik, amikor a galéria betöltődik, akkor a teljes oldal nem omlik össze, és a hibás média kezelhető állapotban jelenik meg.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-MED-0002`
- Modul/osztály/alrendszer referencia:
  - `GalleryController`
  - `MediaQueryService`
  - frontend gallery komponensek

---

## Epic 3 – Privát galériamegosztás

- Epic neve: Privát galériamegosztás
- Leírás: A fotós privát, visszavonható hozzáférést generálhasson a galériához, az ügyfél pedig admin fiók nélkül tekinthesse meg a saját tartalmát.
- Üzleti célok:
  - `BR-FNC-0002` – Privát ügyfélgaléria és megosztás biztosítása
- Hatókör:
  - megosztási token/link
  - ügyféloldali galérianézet
  - hozzáférés visszavonása
- Epic szintű elfogadási feltétel: A fotós linket generál, az ügyfél ezen keresztül csak a megfelelő galériát látja, a link pedig admin oldalról érvényteleníthető.

### US-0006 – Privát galérialink létrehozása és visszavonása

- US azonosító: `US-0006`
- US neve: Privát galérialink létrehozása és visszavonása
- Epic: Privát galériamegosztás
- Státusz: elfogadott
- Prioritás: kritikus
- Story Pont: 5
- Rövid leírás:
  - Mint fotós/admin, azt szeretném, hogy egyedi privát linket generálhassak és szükség esetén visszavonhassak, azért hogy kontrolláljam az ügyfélhozzáférést.
- Részletes leírás: A hozzáférési token ne legyen egyszerűen kitalálható az adatbázis belső azonosítójából, és visszavonás után ne maradjon használható.
- Elfogadási kritériumok:
  - `AC-FR-SHR-0001-01`: Adott létező galéria, amikor az admin megosztási hozzáférést hoz létre, akkor a rendszer egyedi, nem triviálisan kitalálható tokent generál.
  - `AC-FR-SHR-0001-02`: Adott aktív megosztás, amikor az admin visszavonja, akkor a korábbi link többé nem ad hozzáférést.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-SHR-0001`
- Modul/osztály/alrendszer referencia:
  - `GalleryShareController`
  - `GalleryShareService`
  - `GalleryShareRepository`

### US-0007 – Ügyfélgaléria megtekintése

- US azonosító: `US-0007`
- US neve: Ügyfélgaléria megtekintése
- Epic: Privát galériamegosztás
- Státusz: elfogadott
- Prioritás: kritikus
- Story Pont: 5
- Rövid leírás:
  - Mint ügyfél, azt szeretném, hogy a kapott privát linken keresztül megtekinthessem a galériámat, azért hogy egyszerűen átnézhessem a fotózás anyagát.
- Részletes leírás: Az ügyféloldali nézet reszponzív, képcentrikus és csak az érvényes tokenhez tartozó galéria tartalmát jeleníti meg.
- Elfogadási kritériumok:
  - `AC-FR-SHR-0002-01`: Adott érvényes megosztási token, amikor az ügyfél megnyitja a linket, akkor a megfelelő galéria és annak engedélyezett képei jelennek meg.
  - `AC-FR-SHR-0002-02`: Adott érvénytelen vagy visszavont token, amikor galériahozzáférés történne, akkor a rendszer nem adja vissza a privát tartalmat.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-SHR-0002`
- Modul/osztály/alrendszer referencia:
  - `PublicGalleryController`
  - `GalleryShareService`
  - frontend public gallery komponensek

---

## Epic 4 – Client proofing és digitális átadás

- Epic neve: Client proofing és digitális átadás
- Leírás: Az ügyfél képeket tudjon kijelölni, a kiválasztást véglegesíteni, a fotós pedig strukturáltan lássa az eredményt; az engedélyezett végleges tartalom később letölthető legyen.
- Üzleti célok:
  - `BR-PRC-0002` – Ügyfélkiválasztás és digitális átadás támogatása
- Hatókör:
  - kép kiválasztás/kedvenc
  - kiválasztás véglegesítése
  - admin kiválasztási nézet
  - médiaelemenkénti letöltésengedélyezés
  - engedélyezett média letöltése
- Epic szintű elfogadási feltétel: Egy ügyfél privát galériából képet jelöl ki és véglegesít, majd a fotós ugyanazt a kiválasztást a megfelelő galériában visszakapja.

### US-0008 – Kép kiválasztása ügyfélként

- US azonosító: `US-0008`
- US neve: Kép kiválasztása ügyfélként
- Epic: Client proofing és digitális átadás
- Státusz: elfogadott
- Prioritás: kritikus
- Story Pont: 5
- Rövid leírás:
  - Mint ügyfél, azt szeretném, hogy képeket jelölhessek ki a galériából, azért hogy egyértelműen jelezzem a fotósnak, mely felvételeket választom.
- Részletes leírás: A kijelölés a galériához tartozó selection objektumban kerül tárolásra, ugyanaz a média ugyanabba a selectionbe nem kerülhet duplikáltan.
- Elfogadási kritériumok:
  - `AC-FR-WFL-0001-01`: Adott érvényes ügyfélgaléria, amikor az ügyfél képet jelöl ki, akkor a kijelölés tárolódik és vizuálisan látható.
  - `AC-FR-WFL-0001-02`: Adott már kijelölt kép, amikor ugyanazt a médiaelemet újra jelölné, akkor nem keletkezik duplikált selection item.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-WFL-0001`
- Modul/osztály/alrendszer referencia:
  - `SelectionController`
  - `SelectionService`
  - `SelectionRepository`

### US-0009 – Kiválasztás véglegesítése és admin megtekintése

- US azonosító: `US-0009`
- US neve: Kiválasztás véglegesítése és admin megtekintése
- Epic: Client proofing és digitális átadás
- Státusz: elfogadott
- Prioritás: kritikus
- Story Pont: 5
- Rövid leírás:
  - Mint ügyfél, azt szeretném, hogy véglegesíthessem a kiválasztásomat, azért hogy a fotós tudja, mikor fejeztem be a válogatást; mint fotós, szeretném ezt az eredményt látni.
- Részletes leírás: A véglegesítés állapotváltozást eredményez, és az admin nézetben a megfelelő galériához kötve jelenik meg.
- Elfogadási kritériumok:
  - `AC-FR-WFL-0002-01`: Adott legalább egy kijelölt kép, amikor az ügyfél véglegesíti a kiválasztást, akkor a selection állapota véglegesre vált.
  - `AC-FR-WFL-0002-02`: Adott véglegesített selection, amikor az admin megnyitja a galéria kiválasztási nézetét, akkor a megfelelő képek jelennek meg.
  - `AC-FR-WFL-0002-03`: Adott más ügyfél vagy galéria selectionje, amikor az admin egy konkrét galériát néz, akkor idegen selection item nem keveredik bele.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-WFL-0002`
- Modul/osztály/alrendszer referencia:
  - `SelectionController`
  - `SelectionService`
  - admin selection view

### US-0010 – Engedélyezett kép letöltése

- US azonosító: `US-0010`
- US neve: Engedélyezett kép letöltése
- Epic: Client proofing és digitális átadás
- Státusz: elfogadott
- Prioritás: magas
- Story Pont: 5
- Rövid leírás:
  - Mint ügyfél, azt szeretném, hogy a fotós által átadásra engedélyezett képet letölthessem, azért hogy a végleges fájl helyben is rendelkezésemre álljon.
- Részletes leírás: A download végpont csak érvényes galériahozzáférés és letöltési jogosultság mellett szolgálhatja ki a fájlt.
- Elfogadási kritériumok:
  - `AC-FR-DWN-0001-01`: Adott érvényes hozzáférés és letöltésre engedélyezett média, amikor az ügyfél letölti, akkor a megfelelő fájl kerül kiszolgálásra.
  - `AC-FR-DWN-0001-02`: Adott a média nem tartozik a token galériájához vagy nem engedélyezett, amikor letöltés történne, akkor a rendszer megtagadja.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-DWN-0001`
- Modul/osztály/alrendszer referencia:
  - `DownloadController`
  - `DownloadService`

### US-0013 – Média letöltésének engedélyezése adminisztrátorként

- US azonosító: `US-0013`
- US neve: Média letöltésének engedélyezése adminisztrátorként
- Epic: Client proofing és digitális átadás
- Státusz: elfogadott
- Prioritás: magas
- Story Pont: 3
- Rövid leírás:
  - Mint fotós/admin, azt szeretném, hogy egy galérián belül médiaelemenként engedélyezhessem vagy visszavonhassam a letöltést, azért hogy pontosan szabályozzam, mely végleges képek adhatók át az ügyfélnek.
- Részletes leírás: Az MVP-ben a letöltési jogosultság médiaelemenként kerül tárolásra. Új média alapértelmezés szerint nem letölthető. Az admin kizárólag az adott galériához tartozó médiaelem letöltési állapotát módosíthatja.
- Elfogadási kritériumok:
  - `AC-FR-DWN-0002-01`: Adott a média a megnyitott galériához tartozik és alapértelmezetten nem letölthető, amikor az admin engedélyezi a letöltést, akkor a média letöltési állapota engedélyezettre vált.
  - `AC-FR-DWN-0002-02`: Adott a média letöltése engedélyezett, amikor az admin visszavonja az engedélyt, akkor a későbbi ügyféloldali letöltés megtagadásra kerül.
  - `AC-FR-DWN-0002-03`: Adott a media ID nem a megadott galériához tartozik, amikor az admin az adott galéria kontextusában próbálja módosítani a letöltési engedélyt, akkor a rendszer elutasítja a műveletet.
- Nyomonkövethetőség:
  - Származtatott követelmények: `FR-DWN-0002`
- Modul/osztály/alrendszer referencia:
  - `DownloadPermissionController` vagy a galéria média admin végpontja
  - `DownloadService`
  - `MediaAssetRepository`

---

## Epic 5 – Minőség, üzemeltetés és reprodukálható kiadás

- Epic neve: Minőség, üzemeltetés és reprodukálható kiadás
- Leírás: A rendszer fejlesztése, tesztelése, telepítése és helyreállítása legyen automatizálható és dokumentált.
- Üzleti célok:
  - `BR-OPS-0001` – Saját infrastruktúrán üzemeltethető, menthető szolgáltatás kialakítása
  - `BR-DAT-0001` – Követhető média- és metaadatmodell kialakítása
- Hatókör:
  - automatizált tesztelés
  - quality gate
  - CockroachDB integrációs teszt
  - Docker image build
  - production deploy
  - backup/restore
- Epic szintű elfogadási feltétel: A fő branchre kerülő változás automatikus ellenőrzésen megy át, verziózott image készíthető belőle, az alkalmazás pedig dokumentáltan menthető és helyreállítható.

### US-0011 – Automatizált minőségkapu

- US azonosító: `US-0011`
- US neve: Automatizált minőségkapu
- Epic: Minőség, üzemeltetés és reprodukálható kiadás
- Státusz: elfogadott
- Prioritás: magas
- Story Pont: 5
- Rövid leírás:
  - Mint fejlesztő, azt szeretném, hogy a fő üzleti szabályok, build és statikus ellenőrzések automatizáltan fussanak, azért hogy a hibás változtatások korán felismerhetők legyenek.
- Részletes leírás: A backend JUnit 5/Mockito/MockMvc vagy integrációs tesztekkel, a frontend lint/typecheck/build ellenőrzéssel, a teljes projekt pedig GitHub Actions workflow-val ellenőrződik.
- Elfogadási kritériumok:
  - a backend tesztlánc sikeresen lefut
  - a frontend build és statikus ellenőrzés sikeresen lefut
  - sikertelen kritikus teszt esetén a CI sikertelen
  - production image sikertelen quality gate után nem készülhet
- Nyomonkövethetőség:
  - Származtatott követelmények: `NFR-MNT-0002`, tervezett `TR-DEV-0001`, `TR-DEV-0002`
- Modul/osztály/alrendszer referencia:
  - `.github/workflows`
  - backend tesztek
  - frontend tesztek

### US-0012 – Mentés, helyreállítás és kontrollált deployment

- US azonosító: `US-0012`
- US neve: Mentés, helyreállítás és kontrollált deployment
- Epic: Minőség, üzemeltetés és reprodukálható kiadás
- Státusz: tervezet
- Prioritás: magas
- Story Pont: 8
- Rövid leírás:
  - Mint rendszerüzemeltető, azt szeretném, hogy a szolgáltatás verziózott artifactból telepíthető, az adatbázis és a VM-ek pedig menthetők és visszaállíthatók legyenek, azért hogy egy hiba után kontrolláltan helyreállítható legyen a rendszer.
- Részletes leírás: A Docker image-ek registryből kerülnek a `docker01` VM-re, a production deploy health checkkel zárul; a `sql01` adatbázisról külön logikai mentés és Proxmox VM backup is készül.
- Elfogadási kritériumok:
  - sikeres main buildből verziózott Docker image készül
  - a deploy secretjei nem kerülnek a Git repository-ba
  - deploy után health check fut
  - legalább egy adatbázis restore teszt dokumentáltan sikeres
  - legalább egy `docker01` vagy `sql01` VM restore teszt dokumentáltan sikeres
- Nyomonkövethetőség:
  - Származtatott követelmények: tervezett `NFR-REL-xxxx`, `TR-OPS-xxxx`
- Modul/osztály/alrendszer referencia:
  - GitHub Actions
  - GHCR
  - `docker01`
  - `sql01`
  - Proxmox backup

---

## Epic 6 – Fotós workflow automatizálás

- Epic neve: Fotós workflow automatizálás
- Leírás: A működő MVP-re később médiafeldolgozási és publikálási automatizmusok építhetők.
- Üzleti célok:
  - `BR-FNC-0003` – Fotós-specifikus automatizálhatóság megalapozása
- Hatókör:
  - thumbnail/preview pipeline
  - metaadat-alapú feldolgozás
  - render queue
  - automatikus publikálás
  - később intelligens válogatás
- Epic szintű elfogadási feltétel: Nem része az első MVP-nek; a meglévő architektúra viszont tegye lehetővé külön médiafeldolgozó komponens hozzáadását a magrendszer újraírása nélkül.

---

## Első fejlesztési vertikális szelet

A projekt első tényleges implementációs célja nem az összes adatbázistábla vagy összes UI előzetes elkészítése, hanem egy teljes, végponttól végpontig működő kisebb folyamat.

A tervezett első szelet:

1. `US-0001` – admin bejelentkezés
2. `US-0002` – ügyfél létrehozása
3. `US-0003` – galéria létrehozása
4. `US-0004` – JPEG feltöltése
5. `US-0005` – média megjelenítése

Sikeresnek akkor tekinthető, ha:
- a frontendről létrejön az ügyfél és a galéria
- a feltöltött JPEG fizikailag a MicroServer NFSv4 media storage-ra kerül
- a CockroachDB-ben létrejön a média metaadata
- a kép az admin webes galérianézetben megjelenik
- a szükséges automatizált tesztek és a CI zölden lefutnak

---

## BR → Epic / User Story kapcsolat

| BR | Epic / User Story |
| --- | --- |
| `BR-FNC-0001` | Epic 1; `US-0002`, `US-0003` |
| `BR-FNC-0002` | Epic 3; `US-0006`, `US-0007` |
| `BR-PRC-0001` | Epic 2; `US-0004`, `US-0005` |
| `BR-PRC-0002` | Epic 4; `US-0008`, `US-0009`, `US-0010`, `US-0013` |
| `BR-DAT-0001` | Epic 1, 2, 5; `US-0002`, `US-0003`, `US-0004`, `US-0011` |
| `BR-OPS-0001` | Epic 5; `US-0011`, `US-0012` |
| `BR-FNC-0003` | Epic 6; POST-MVP |

---

## Következő lépés

A dokumentum alapján a `03-funkcionalis-kovetelmenyek.md` következő verziójában elsőként az alábbi FR-eket kell részletes IPO modellel és Acceptance Criteria blokkokkal kidolgozni:

- `FR-AUT-0001` – Admin hitelesítés
- `FR-DAT-0001` – Ügyfél létrehozása és kezelése
- `FR-DAT-0002` – Galéria létrehozása és listázása
- `FR-MED-0001` – JPEG feltöltés és storage írás
- `FR-MED-0002` – Galéria média listázása/megjelenítése
- `FR-SHR-0001` – Megosztási link létrehozása és visszavonása
- `FR-SHR-0002` – Privát ügyfélgaléria lekérése
- `FR-WFL-0001` – Kép kiválasztása
- `FR-WFL-0002` – Kiválasztás véglegesítése és admin lekérése
- `FR-DWN-0001` – Engedélyezett média letöltése
- `FR-DWN-0002` – Média letöltési jogosultságának adminisztratív kezelése
