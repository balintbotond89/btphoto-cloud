# Funkcionális követelmények és Acceptance Criteria

**Dokumentum státusza:** fejlesztési baseline v0.1  
**Projekt:** BTPhoto Private Cloud  
**Baseline azonosító:** `BTPC-BL-2026-09-13-v0.1`  
**Baseline dátuma:** `2026-09-13`

**Kapcsolódó dokumentumok:**
- `01-uzleti-kovetelmenyek.md`
- `02-epicek-es-user-storyk.md`
- `04-nem-funkcionalis-kovetelmenyek.md`
- `05-technikai-kovetelmenyek.md`
- `06-teszteset-gyujtemeny.md`
- `07-nyomonkovethetosegi-matrix.md`
- `09-rendszerterv-es-szolgaltatasarchitektura.md`

A dokumentum a BTPhoto Private Cloud MVP közvetlenül implementálható funkcionális követelményeit tartalmazza. A szerkezet a korábbi sikeres projekt mintáját követi: minden funkcionális követelmény egyedi azonosítót, prioritást, IPO modellt, funkcionális részleteket, technikai referenciát, nyomonkövethetőséget és külön azonosított Acceptance Criteria blokkokat kap.

A dokumentum célja, hogy a fejlesztés megkezdésekor ne kelljen újraértelmezni a user story-kat. A technológiai döntések részletes indoklása ugyanakkor nem itt, hanem az `05-technikai-kovetelmenyek.md` és `09-rendszerterv-es-szolgaltatasarchitektura.md` dokumentumokban található.

---

# FR összefoglaló

| FR | Megnevezés | Kapcsolódó US | Prioritás |
| --- | --- | --- | --- |
| `FR-AUT-0001` | Admin hitelesítés és védett admin hozzáférés | `US-0001` | kritikus |
| `FR-DAT-0001` | Ügyfél létrehozása és lekérdezése | `US-0002` | kritikus |
| `FR-DAT-0002` | Galéria létrehozása és listázása | `US-0003` | kritikus |
| `FR-MED-0001` | JPEG feltöltése és NFS storage-ra mentése | `US-0004` | kritikus |
| `FR-MED-0002` | Galéria médiaelemeinek lekérdezése és megjelenítése | `US-0005` | kritikus |
| `FR-SHR-0001` | Privát galériamegosztás létrehozása és visszavonása | `US-0006` | kritikus |
| `FR-SHR-0002` | Privát ügyfélgaléria lekérdezése | `US-0007` | kritikus |
| `FR-WFL-0001` | Kép kiválasztása client proofing során | `US-0008` | kritikus |
| `FR-WFL-0002` | Kiválasztás véglegesítése és admin lekérdezése | `US-0009` | kritikus |
| `FR-DWN-0001` | Engedélyezett média letöltése | `US-0010` | magas |
| `FR-DWN-0002` | Média letöltési jogosultságának adminisztratív kezelése | `US-0013` | magas |

---

# 1. FR-AUT-0001 – Admin hitelesítés és védett admin hozzáférés

- FR azonosító: `FR-AUT-0001`
- FR neve: Admin hitelesítés és védett admin hozzáférés
- Kategória: `FR-AUT-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Leírás: A rendszer biztosítsa a fotós/admin hitelesítését, és akadályozza meg, hogy hitelesítés nélküli felhasználó belső admin funkciókat vagy módosító API-végpontokat érjen el.
- Részletes leírás: A felhasználó érvényes admin hitelesítési adatokkal beléphet. A sikeres hitelesítés után a rendszer egy hitelesített munkamenetet biztosít. A pontos technikai mechanizmus — szerveroldali session vagy tokenalapú megoldás — technikai követelményként kerül véglegesítésre, ezért a funkcionális követelmény ezt nem köti egy konkrét implementációhoz.

## IPO modell

- Input:
  - felhasználónév vagy e-mail
  - jelszó
- Process:
  - bemeneti validáció
  - admin felhasználó keresése
  - jelszó ellenőrzése
  - hitelesített állapot létrehozása
  - védett végpontokon jogosultság ellenőrzése
- Output:
  - sikeres hitelesítés és admin hozzáférés
  - vagy konzisztens hitelesítési/jogosultsági hiba

## Érintettek

- fotós/admin
- rendszerüzemeltető

## Funkcionális részletek

- az admin oldal és az `/api/admin/**` jellegű végpontok hitelesítést igényelnek
- hibás bejelentkezés nem hozhat létre hitelesített állapotot
- a hibaüzenet ne árulja el, hogy a felhasználónév vagy a jelszó volt hibás
- kijelentkezés után a korábbi hitelesített állapot a választott technikai megoldás szabályai szerint érvénytelenítendő
- jelszó egyszerű szövegként nem tárolható

## Tervezett API-k

- `POST /api/auth/login`
- `POST /api/auth/logout`
- opcionálisan: `GET /api/auth/me`

A végleges API-szerződés az implementáció indulásakor rögzítendő.

## Technikai specifikáció és megjegyzések

Tervezett backend komponensek:
- `SecurityConfig`
- `AuthController`
- `AuthService`
- `AdminUserRepository`
- globális biztonsági/exception kezelés

## Nyomonkövethetőség

- BR:
  - `BR-FNC-0001`
  - `BR-FNC-0002`
- US:
  - `US-0001`
- későbbi TC:
  - `TC-AUT-0001`
  - `TC-AUT-0002`
  - `TC-API-0001`

## Acceptance Criteria

### AC-FR-AUT-0001-01 – Sikeres admin bejelentkezés

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - létezik aktív admin felhasználó
  - a felhasználó érvényes hitelesítési adatokat ad meg
- Amikor:
  - bejelentkezési kérést küld
- Akkor:
  - a rendszer sikeresen hitelesíti
  - létrejön a választott technikai megoldás szerinti hitelesített állapot
  - a védett admin erőforrások elérhetővé válnak

### AC-FR-AUT-0001-02 – Hitelesítés nélküli admin hozzáférés tiltása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - a kéréshez nem tartozik érvényes admin hitelesítés
- Amikor:
  - a kliens védett admin végpontot hív
- Akkor:
  - a rendszer megtagadja a hozzáférést
  - admin adat nem kerül visszaadásra

### AC-FR-AUT-0001-03 – Hibás hitelesítés kezelése

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - hibás bejelentkezési adatok érkeznek
- Amikor:
  - a bejelentkezési kísérlet megtörténik
- Akkor:
  - a rendszer nem hoz létre hitelesített állapotot
  - általános hitelesítési hibát ad
  - nem különbözteti meg publikus válaszban a nem létező felhasználót és a hibás jelszót

---

# 2. FR-DAT-0001 – Ügyfél létrehozása és lekérdezése

- FR azonosító: `FR-DAT-0001`
- FR neve: Ügyfél létrehozása és lekérdezése
- Kategória: `FR-DAT-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Leírás: A rendszer biztosítsa ügyfélrekord létrehozását, egyedi technikai azonosító kiosztását és a létrehozott ügyfél későbbi lekérdezését.
- Részletes leírás: Az ügyfél a fotós üzleti partnere, akihez galériák kapcsolódnak. Az MVP-ben az ügyfélmodell szándékosan egyszerű; nem teljes CRM profilt ír le.

## IPO modell

- Input:
  - név
  - opcionális e-mail
  - opcionális megjegyzés vagy későbbi kiegészítő mezők
- Process:
  - kötelező mezők validációja
  - e-mail formátumellenőrzés, ha meg van adva
  - ügyfélazonosító generálása
  - adatbázisba mentés
- Output:
  - létrehozott ügyfél DTO
  - vagy validációs hiba

## Érintettek

- fotós/admin

## Funkcionális részletek

- név kötelező
- a név nem lehet üres vagy csak whitespace
- e-mail az MVP első változatában opcionális
- megadott e-mailnek formailag érvényesnek kell lennie
- az ügyfél rendszerazonosítója a kliens által nem adható meg
- azonos e-mail egyediségéről a jelenlegi üzleti dokumentumok nem rendelkeznek, ezért ezt a v0.1 nem kényszeríti ki

## Tervezett API-k

- `POST /api/admin/clients`
- `GET /api/admin/clients/{id}`
- `GET /api/admin/clients`

Az ügyféllista keresése és szerkesztése későbbi finomításban bővíthető.

## Technikai specifikáció és megjegyzések

Tervezett komponensek:
- `ClientController`
- `ClientService`
- `ClientRepository`
- `Client`
- `ClientCreateRequest`
- `ClientResponse`

## Nyomonkövethetőség

- BR:
  - `BR-FNC-0001`
  - `BR-DAT-0001`
- US:
  - `US-0002`
- későbbi TC:
  - `TC-DAT-0001`
  - `TC-DAT-0002`

## Acceptance Criteria

### AC-FR-DAT-0001-01 – Ügyfél sikeres létrehozása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - hitelesített admin felhasználó
  - érvényes ügyféladatok
- Amikor:
  - új ügyfelet hoz létre
- Akkor:
  - a rendszer elmenti az ügyfelet
  - egyedi rendszerazonosítót rendel hozzá
  - a válasz tartalmazza a létrehozott ügyfél alapadatait

### AC-FR-DAT-0001-02 – Kötelező név validációja

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - az ügyfél neve hiányzik vagy üres
- Amikor:
  - az admin mentést kezdeményez
- Akkor:
  - a rendszer validációs hibát ad
  - ügyfélrekord nem jön létre

---

# 3. FR-DAT-0002 – Galéria létrehozása és listázása

- FR azonosító: `FR-DAT-0002`
- FR neve: Galéria létrehozása és listázása
- Kategória: `FR-DAT-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Leírás: A rendszer biztosítsa egy galéria létrehozását létező ügyfélhez, valamint az admin által kezelhető galérialista lekérdezését.
- Részletes leírás: A galéria egy fotózás vagy projekt logikai egysége. Médiaállományok, privát megosztási hozzáférések és ügyfélkiválasztások ehhez kapcsolódnak.

## IPO modell

- Input:
  - ügyfélazonosító
  - galéria címe
  - opcionális esemény/fotózás dátuma
  - opcionális leírás
- Process:
  - ügyfél létezésének ellenőrzése
  - kötelező mezők validációja
  - galériaazonosító generálása
  - kezdeti állapot beállítása
  - mentés
- Output:
  - létrehozott galéria DTO
  - vagy validációs / hiányzó erőforrás hiba

## Érintettek

- fotós/admin

## Funkcionális részletek

- galéria cím kötelező
- minden galéria pontosan egy ügyfélhez tartozik az MVP-ben
- nem létező ügyfélhez galéria nem hozható létre
- új galéria nem lehet automatikusan publikus
- javasolt kezdeti alkalmazásállapot: `DRAFT`
- a publikus elérés nem a galéria belső azonosítójára épül, hanem külön share mechanizmusra
- a listában legalább a következők jelenjenek meg:
  - azonosító
  - cím
  - ügyfél
  - állapot
  - létrehozás dátuma
  - opcionálisan esemény dátuma

## Tervezett API-k

- `POST /api/admin/galleries`
- `GET /api/admin/galleries`
- `GET /api/admin/galleries/{id}`

## Technikai specifikáció és megjegyzések

Tervezett komponensek:
- `GalleryController`
- `GalleryService`
- `GalleryRepository`
- `Gallery`
- `GalleryCreateRequest`
- `GalleryResponse`

A pontos státuszmodell a funkciók bővülésével később kiterjeszthető.

## Nyomonkövethetőség

- BR:
  - `BR-FNC-0001`
  - `BR-DAT-0001`
- US:
  - `US-0003`
- későbbi TC:
  - `TC-DAT-0003`
  - `TC-DAT-0004`
  - `TC-SEA-0001`

## Acceptance Criteria

### AC-FR-DAT-0002-01 – Galéria sikeres létrehozása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - létezik a megadott ügyfél
  - érvényes galériaadatok érkeznek
- Amikor:
  - az admin galériát hoz létre
- Akkor:
  - a rendszer elmenti a galériát
  - a galériát az ügyfélhez kapcsolja
  - egyedi azonosítót ad
  - a válaszban visszaadja az alapadatokat

### AC-FR-DAT-0002-02 – Új galéria nem publikus

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - új galéria létrehozása történik
- Amikor:
  - a mentés sikeresen befejeződik
- Akkor:
  - a galéria alapértelmezés szerint nem érhető el publikus ügyfél URL-en
  - nincs automatikusan aktív share token

### AC-FR-DAT-0002-03 – Galériák listázása

- Prioritás: magas
- Státusz: elfogadott
- Adott:
  - több galéria létezik
- Amikor:
  - az admin lekéri a galérialistát
- Akkor:
  - a rendszer visszaadja a galériák alapadatait
  - a galériákhoz tartozó ügyfél azonosítható
  - a státusz megjeleníthető

---

# 4. FR-MED-0001 – JPEG feltöltése és NFS storage-ra mentése

- FR azonosító: `FR-MED-0001`
- FR neve: JPEG feltöltése és NFS storage-ra mentése
- Kategória: `FR-MED-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Leírás: A rendszer tegye lehetővé JPEG kép feltöltését létező galériához úgy, hogy a bináris fájl az NFSv4 média storage-ra, a hozzá tartozó metaadat pedig CockroachDB-be kerüljön.
- Részletes leírás: Ez a projekt elsődleges end-to-end architektúra-validációs funkciója. A feltöltésnek össze kell kapcsolnia a React frontend, Spring Boot backend, NFS media storage és CockroachDB rétegeket.

## IPO modell

- Input:
  - galériaazonosító
  - multipart JPEG fájl
- Process:
  - admin hitelesítés ellenőrzése
  - galéria létezésének ellenőrzése
  - fájltípus és méret validációja
  - biztonságos rendszerfájlnév vagy UUID előállítása
  - célkönyvtár meghatározása
  - bináris fájl storage-ra írása
  - alap média-metaadat meghatározása
  - médiarekord adatbázisba mentése
- Output:
  - létrehozott `MediaAsset` DTO
  - vagy konzisztens upload/storage/validációs hiba

## Érintettek

- fotós/admin
- rendszerüzemeltető

## Funkcionális részletek

Az MVP-ben kötelezően támogatott:
- JPEG/JPG feltöltés

Minimum metaadat:
- media UUID
- gallery ID
- eredeti fájlnév
- relatív storage path
- MIME type
- fájlméret
- feltöltési idő
- szélesség
- magasság, ha megbízhatóan meghatározható

A rendszer:
- nem tárolja a teljes képet SQL BLOB-ként
- nem használja kontroll nélkül az eredeti fájlnevet fizikai célútvonalként
- nem enged tetszőleges kliensoldali path megadását
- nem jelezheti sikeresnek a feltöltést, ha a tényleges fájlírás nem sikerült

## Storage struktúra

Tervezett relatív struktúra:

```text
galleries/<gallery-uuid>/originals/<media-uuid>.<ext>
```

A backend adatbázisban relatív útvonalat tárol.

## Konzisztenciaelv

A funkcionális követelmény nem ír elő konkrét technikai tranzakciós mintát, de megköveteli:

- ne maradjon normál sikeres állapotú adatbázisrekord fizikailag hiányzó feltöltés mögött
- sikertelen adatbázismentés esetén az esetleg már kiírt fájl takarítása vagy későbbi konzisztencia-kezelése legyen megoldott

A pontos implementáció a technikai terv része.

## Tervezett API

- `POST /api/admin/galleries/{galleryId}/media`
- Content-Type: `multipart/form-data`

## Technikai specifikáció és megjegyzések

Tervezett komponensek:
- `MediaController`
- `MediaService`
- `MediaStorageService`
- `NfsMediaStorageService`
- `MediaAssetRepository`
- `MediaAsset`
- `MediaResponse`

A storage absztrakció célja, hogy az üzleti logika ne közvetlen, szétszórt fájlrendszerhívásokból álljon.

## Nyomonkövethetőség

- BR:
  - `BR-PRC-0001`
  - `BR-DAT-0001`
- US:
  - `US-0004`
- későbbi TC:
  - `TC-MED-0001`
  - `TC-MED-0002`
  - `TC-MED-0003`
  - `TC-MED-0004`

## Acceptance Criteria

### AC-FR-MED-0001-01 – JPEG sikeres feltöltése

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - létezik a célgaléria
  - az admin hitelesített
  - támogatott JPEG fájl érkezik
  - a média storage írható
- Amikor:
  - az admin feltölti a fájlt
- Akkor:
  - a fájl a galéria média könyvtárába kerül
  - létrejön a kapcsolódó `MediaAsset` rekord
  - a rekord a megfelelő galériára hivatkozik
  - a válasz tartalmazza a létrehozott médiaazonosítót

### AC-FR-MED-0001-02 – Nem támogatott fájl elutasítása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - nem támogatott fájltípus érkezik
- Amikor:
  - feltöltés történne
- Akkor:
  - a rendszer elutasítja a kérést
  - normál sikeres médiarekord nem jön létre
  - a fájl nem válik galériatartalommá

### AC-FR-MED-0001-03 – Storage írási hiba kezelése

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - az NFS média storage nem írható vagy nem elérhető
- Amikor:
  - feltöltés történik
- Akkor:
  - a rendszer nem ad sikeres választ
  - nem marad üzletileg sikeresként kezelhető médiarekord
  - a kliens érthető, de belső pathot nem felfedő hibát kap

---

# 5. FR-MED-0002 – Galéria médiaelemeinek lekérdezése és megjelenítése

- FR azonosító: `FR-MED-0002`
- FR neve: Galéria médiaelemeinek lekérdezése és megjelenítése
- Kategória: `FR-MED-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Leírás: A rendszer tegye lehetővé egy galériához tartozó médiaelemek lekérdezését és a képek admin felületen történő megjelenítését.
- Részletes leírás: A galéria médiája nem adatbázisban tárolt bináris tartalomból épül. Az adatbázis a metaadatot és relatív pathot biztosítja, a tényleges tartalom a media storage-ból kerül kiszolgálásra.

## IPO modell

- Input:
  - galériaazonosító
  - hitelesített admin kérés
- Process:
  - galéria ellenőrzése
  - médiarekordok lekérdezése
  - megjelenítéshez szükséges DTO összeállítása
  - média/preview URL vagy kiszolgálási végpont képzése
- Output:
  - média lista
  - a frontend számára megjeleníthető hivatkozásokkal

## Érintettek

- fotós/admin

## Funkcionális részletek

- csak az adott galériához tartozó médiaelemek adhatók vissza
- a lista legalább:
  - médiaazonosító
  - eredeti fájlnév
  - MIME type
  - méret
  - dimenziók
  - megjelenítési hivatkozás
- egy hiányzó fizikai fájl nem okozhat teljes, kezeletlen oldalleállást
- hiányzó fájl külön hibás médiaállapotként kezelhető

## Tervezett API-k

- `GET /api/admin/galleries/{galleryId}/media`
- `GET /api/admin/media/{mediaId}/content` vagy külön preview végpont

A pontos tartalomkiszolgálási szerződés később véglegesíthető.

## Technikai specifikáció és megjegyzések

Tervezett komponensek:
- `MediaController`
- `MediaQueryService`
- `MediaStorageService`
- frontend `GalleryMediaGrid`

## Nyomonkövethetőség

- BR:
  - `BR-PRC-0001`
- US:
  - `US-0005`
- későbbi TC:
  - `TC-MED-0005`
  - `TC-MED-0006`

## Acceptance Criteria

### AC-FR-MED-0002-01 – Feltöltött képek megjelenítése

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - a galériához léteznek érvényes médiarekordok és fizikai fájlok
- Amikor:
  - az admin megnyitja a galériát
- Akkor:
  - a rendszer visszaadja a galéria médiaelemeit
  - a frontend a képeket meg tudja jeleníteni

### AC-FR-MED-0002-02 – Hiányzó fizikai fájl kezelése

- Prioritás: magas
- Státusz: elfogadott
- Adott:
  - létezik médiarekord, de a fizikai fájl nem érhető el
- Amikor:
  - a galéria média listája betöltődik
- Akkor:
  - a teljes kérés nem eredményez kezeletlen szerverhibát
  - a hibás médiaelem elkülöníthető
  - a felület kezelhető visszajelzést tud adni

---

# 6. FR-SHR-0001 – Privát galériamegosztás létrehozása és visszavonása

- FR azonosító: `FR-SHR-0001`
- FR neve: Privát galériamegosztás létrehozása és visszavonása
- Kategória: `FR-SHR-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Leírás: A rendszer tegye lehetővé, hogy admin egy galériához privát, nehezen kitalálható megosztási hozzáférést hozzon létre, majd azt visszavonja.
- Részletes leírás: A megosztási URL nem a galéria belső sorszámának közvetlen publikálására épül. A hozzáférés külön üzleti objektumként kezelendő.

## IPO modell

- Input:
  - galériaazonosító
  - admin parancs megosztás létrehozására vagy visszavonására
- Process:
  - admin hitelesítés
  - galéria ellenőrzése
  - kriptográfiailag megfelelő vagy hasonlóan nehezen kitalálható token létrehozása
  - share rekord mentése
  - visszavonás esetén státusz módosítása
- Output:
  - megosztási URL / share DTO
  - vagy hiba

## Érintettek

- fotós/admin
- ügyfél

## Funkcionális részletek

- a share token nem lehet a galéria ID egyszerű kódolása
- share rekord egy konkrét galériához tartozik
- visszavont share tokennel privát tartalom nem érhető el
- token lejárat és opcionális jelszó nem része a jelenlegi MVP követelménynek
- egy galériához több share rekord technikailag engedhető, de az MVP UI egyszerűsége érdekében az aktív megosztások kezelését később pontosíthatjuk

## Tervezett API-k

- `POST /api/admin/galleries/{galleryId}/shares`
- `DELETE /api/admin/galleries/{galleryId}/shares/{shareId}`
  vagy
- `PATCH /api/admin/galleries/{galleryId}/shares/{shareId}/revoke`

A végleges HTTP szerződés a backend implementációkor rögzítendő.

## Technikai specifikáció és megjegyzések

Tervezett komponensek:
- `GalleryShareController`
- `GalleryShareService`
- `GalleryShareRepository`
- `GalleryShare`

## Nyomonkövethetőség

- BR:
  - `BR-FNC-0002`
- US:
  - `US-0006`
- későbbi TC:
  - `TC-SHR-0001`
  - `TC-SHR-0002`

## Acceptance Criteria

### AC-FR-SHR-0001-01 – Privát megosztás sikeres létrehozása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - létező galéria
  - hitelesített admin
- Amikor:
  - megosztási hozzáférést hoz létre
- Akkor:
  - a rendszer share rekordot hoz létre
  - egyedi, nem triviálisan kitalálható tokent rendel hozzá
  - az admin számára megjeleníthető a teljes ügyféloldali URL

### AC-FR-SHR-0001-02 – Megosztás visszavonása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - létezik aktív megosztási hozzáférés
- Amikor:
  - az admin visszavonja
- Akkor:
  - a share inaktívvá válik
  - a régi token a továbbiakban nem jogosít galéria megtekintésre
  - a galéria és a média nem törlődik

---

# 7. FR-SHR-0002 – Privát ügyfélgaléria lekérdezése

- FR azonosító: `FR-SHR-0002`
- FR neve: Privát ügyfélgaléria lekérdezése
- Kategória: `FR-SHR-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Leírás: A rendszer érvényes share token alapján tegye elérhetővé az ügyfél számára a hozzá tartozó galéria megjelenítéshez szükséges adatait.
- Részletes leírás: Az ügyfél az MVP-ben saját felhasználói fiók nélkül, privát linkkel éri el a galériát.

## IPO modell

- Input:
  - share token
- Process:
  - token keresése
  - aktív állapot ellenőrzése
  - kapcsolódó galéria lekérdezése
  - megjeleníthető média lekérdezése
  - publikus DTO összeállítása
- Output:
  - ügyféloldali galéria DTO
  - vagy érvénytelen/lejárt/visszavont hozzáférési hiba

## Érintettek

- ügyfél
- fotós/admin

## Funkcionális részletek

- publikus DTO nem adhat vissza szükségtelen belső technikai adatot
- belső storage path nem jelenhet meg
- más galéria adatai az URL manipulálásával nem válhatnak elérhetővé
- admin-only adatok nem kerülhetnek a publikus válaszba
- a mobil és desktop megjelenés részleteit a későbbi BTPhoto `08-ui-ux-terv.md` rögzíti

## Tervezett API

- `GET /api/public/galleries/{token}`

A média tartalom külön, tokenhez kötött végponton is kiszolgálható.

## Technikai specifikáció és megjegyzések

Tervezett komponensek:
- `PublicGalleryController`
- `GalleryShareService`
- `PublicGalleryService`
- publikus frontend gallery view

## Nyomonkövethetőség

- BR:
  - `BR-FNC-0002`
- US:
  - `US-0007`
- későbbi TC:
  - `TC-SHR-0003`
  - `TC-SHR-0004`
  - `TC-SEC-0001`

## Acceptance Criteria

### AC-FR-SHR-0002-01 – Érvényes privát galéria megnyitása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - létezik aktív share token
- Amikor:
  - az ügyfél megnyitja a privát galéria URL-t
- Akkor:
  - a rendszer a tokenhez tartozó galéria publikus adatait adja vissza
  - csak a megfelelő galéria médiaelemei jelenhetnek meg

### AC-FR-SHR-0002-02 – Érvénytelen vagy visszavont token tiltása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - a token nem létezik vagy visszavont
- Amikor:
  - galérialekérés történik
- Akkor:
  - a rendszer nem adja vissza a privát galéria tartalmát
  - kontrollált hozzáférési hibát ad

---

# 8. FR-WFL-0001 – Kép kiválasztása client proofing során

- FR azonosító: `FR-WFL-0001`
- FR neve: Kép kiválasztása client proofing során
- Kategória: `FR-WFL-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Leírás: A rendszer tegye lehetővé, hogy az érvényes privát galériát használó ügyfél médiaelemeket jelöljön ki a proofing folyamat során.
- Részletes leírás: A kiválasztások egy adott galéria proofing munkamenetéhez tartoznak. A kijelölt kép és annak állapota adatbázisban maradjon meg.

## IPO modell

- Input:
  - share token
  - media ID
  - kijelölési művelet
- Process:
  - share token ellenőrzése
  - média galéria-tagságának ellenőrzése
  - aktuális selection meghatározása vagy létrehozása
  - duplikáció ellenőrzése
  - selection item mentése vagy eltávolítása
- Output:
  - frissített kiválasztási állapot
  - aktuális kijelölt darabszám
  - vagy jogosultsági/validációs hiba

## Érintettek

- ügyfél
- fotós/admin

## Funkcionális részletek

- csak a tokenhez tartozó galéria médiaeleme jelölhető
- ugyanaz a média ugyanabban az aktív selectionben legfeljebb egyszer szerepel
- a kijelölés véglegesítés előtt visszavonható
- az ügyféloldali UI vizuálisan jelzi a kiválasztott állapotot
- selection állapot induláskor `IN_PROGRESS` jellegű lehet

## Tervezett API-k

Lehetséges irány:
- `POST /api/public/galleries/{token}/selection/items/{mediaId}`
- `DELETE /api/public/galleries/{token}/selection/items/{mediaId}`
- `GET /api/public/galleries/{token}/selection`

A pontos REST szerződés implementációkor véglegesítendő.

## Technikai specifikáció és megjegyzések

Tervezett komponensek:
- `SelectionController`
- `SelectionService`
- `ClientSelectionRepository`
- `SelectionItemRepository`

## Nyomonkövethetőség

- BR:
  - `BR-PRC-0002`
- US:
  - `US-0008`
- későbbi TC:
  - `TC-WFL-0001`
  - `TC-WFL-0002`
  - `TC-WFL-0003`

## Acceptance Criteria

### AC-FR-WFL-0001-01 – Kép sikeres kijelölése

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - érvényes privát galéria
  - a media ID ehhez a galériához tartozik
- Amikor:
  - az ügyfél kijelöli a képet
- Akkor:
  - a kijelölés adatbázisban rögzül
  - a válasz és a frontend jelzi a kiválasztott állapotot

### AC-FR-WFL-0001-02 – Duplikált kijelölés tiltása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - a média már szerepel az aktuális selectionben
- Amikor:
  - ugyanaz a kijelölési kérés újra megtörténik
- Akkor:
  - nem keletkezik második, duplikált selection item
  - a selection konzisztens marad

---

# 9. FR-WFL-0002 – Kiválasztás véglegesítése és admin lekérdezése

- FR azonosító: `FR-WFL-0002`
- FR neve: Kiválasztás véglegesítése és admin lekérdezése
- Kategória: `FR-WFL-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Leírás: A rendszer tegye lehetővé, hogy az ügyfél véglegesítse a képválogatást, az admin pedig ugyanazt a strukturált kiválasztást a megfelelő galéria alatt megtekinthesse.
- Részletes leírás: A véglegesítés egyértelmű workflow-állapotot hoz létre, amely jelzi a fotós számára, hogy az ügyfél befejezte a válogatást.

## IPO modell

### Ügyféloldali finalizálás

- Input:
  - share token
  - véglegesítési kérés
- Process:
  - share ellenőrzése
  - aktuális selection lekérése
  - selection validációja
  - státusz módosítása
  - véglegesítési idő mentése
- Output:
  - véglegesített selection DTO

### Admin lekérdezés

- Input:
  - gallery ID
  - hitelesített admin
- Process:
  - galéria ellenőrzése
  - kapcsolódó selection és itemek lekérése
- Output:
  - kiválasztási összesítő és média lista

## Érintettek

- ügyfél
- fotós/admin

## Funkcionális részletek

- véglegesítés előtt az ügyfélnek egyértelmű megerősítést kell kapnia
- a finalizált selection státusza az admin számára látható
- az admin csak a megfelelő galériához tartozó selection itemeket kapja vissza
- a véglegesítés utáni ügyféloldali módosíthatóságot a korábbi dokumentumok nem döntötték el

### Nyitott tervezési döntés

A v0.1-ben ezt **nem tekintjük lezárt üzleti szabálynak**:

> Véglegesítés után az ügyfél módosíthatja-e a válogatást?

Implementáció előtt ezt el kell dönteni. Egyszerű MVP irányként javasolható a finalizált selection zárolása, de ez jelenleg javaslat, nem jóváhagyott követelmény.

## Tervezett API-k

- `POST /api/public/galleries/{token}/selection/finalize`
- `GET /api/admin/galleries/{galleryId}/selections`

## Technikai specifikáció és megjegyzések

Tervezett komponensek:
- `SelectionController`
- `SelectionService`
- admin selection query
- frontend proofing state

## Nyomonkövethetőség

- BR:
  - `BR-PRC-0002`
- US:
  - `US-0009`
- későbbi TC:
  - `TC-WFL-0004`
  - `TC-WFL-0005`
  - `TC-WFL-0006`

## Acceptance Criteria

### AC-FR-WFL-0002-01 – Kiválasztás sikeres véglegesítése

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - az ügyfélnek van aktuális kiválasztása
  - legalább egy kép ki van jelölve
- Amikor:
  - az ügyfél megerősíti a véglegesítést
- Akkor:
  - a selection státusza végleges állapotra vált
  - a véglegesítés időpontja rögzíthető
  - a fotós számára a selection lezárt/véglegesített állapota visszaadható

### AC-FR-WFL-0002-02 – Véglegesített kiválasztás admin lekérdezése

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - a galériához véglegesített selection tartozik
- Amikor:
  - az admin megnyitja a kiválasztási nézetet
- Akkor:
  - a rendszer visszaadja a kiválasztott médiaelemeket
  - megjeleníti a selection állapotát

### AC-FR-WFL-0002-03 – Galériák közötti kiválasztás-keveredés tiltása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - több galériához több selection létezik
- Amikor:
  - az admin egy konkrét galéria kiválasztását kéri le
- Akkor:
  - csak az adott galériához tartozó selection és médiaelemek kerülnek visszaadásra

---

# 10. FR-DWN-0001 – Engedélyezett média letöltése

- FR azonosító: `FR-DWN-0001`
- FR neve: Engedélyezett média letöltése
- Kategória: `FR-DWN-xxxx`
- Státusz: elfogadott
- Prioritás: magas
- Leírás: A rendszer tegye lehetővé, hogy az ügyfél érvényes privát hozzáférés mellett letöltse a számára átadásra engedélyezett médiafájlt.
- Részletes leírás: A letöltési végpont nem engedheti meg, hogy egy tetszőlegesen megadott media ID-val más galéria fájlja elérhetővé váljon.

## IPO modell

- Input:
  - share token
  - media ID
- Process:
  - token ellenőrzése
  - média létezésének ellenőrzése
  - média és galéria kapcsolat ellenőrzése
  - letöltési engedély ellenőrzése
  - fizikai fájl megkeresése
  - streamelt fájlkiszolgálás
- Output:
  - letölthető médiafájl
  - vagy hozzáférési / hiányzó erőforrás hiba

## Érintettek

- ügyfél
- fotós/admin

## Funkcionális részletek

- csak az adott share galériájához tartozó fájl tölthető le
- a kliens nem adhat meg tetszőleges szerveroldali pathot
- a backend a saját médiaazonosító alapján oldja fel a fájlt
- fizikai fájl hiányakor kontrollált hiba szükséges
- opcionálisan `DownloadEvent` naplózható

## Letöltési jogosultság függősége

A letöltés előfeltétele a `FR-DWN-0002` szerint beállított média-szintű engedély.

MVP döntés:
- új `MediaAsset` alapértelmezett letöltési állapota: **tiltott**
- az admin médiaelemenként engedélyezheti vagy visszavonhatja a letöltést
- a publikus download végpont minden kérésnél újra ellenőrzi ezt az állapotot

## Tervezett API

- `GET /api/public/galleries/{token}/media/{mediaId}/download`

## Technikai specifikáció és megjegyzések

Tervezett komponensek:
- `DownloadController`
- `DownloadService`
- `MediaStorageService`
- opcionális `DownloadEventRepository`

## Nyomonkövethetőség

- BR:
  - `BR-PRC-0002`
- US:
  - `US-0010`
  - `US-0013`
- későbbi TC:
  - `TC-DWN-0001`
  - `TC-DWN-0002`
  - `TC-SEC-0002`

## Acceptance Criteria

### AC-FR-DWN-0001-01 – Engedélyezett média sikeres letöltése

- Prioritás: magas
- Státusz: elfogadott
- Adott:
  - érvényes share token
  - a média a share galériájához tartozik
  - a média letöltése engedélyezett
  - a fizikai fájl elérhető
- Amikor:
  - az ügyfél letöltést kezdeményez
- Akkor:
  - a rendszer a megfelelő fájlt adja vissza
  - más média vagy belső fájlrendszerútvonal nem válik elérhetővé

### AC-FR-DWN-0001-02 – Jogosulatlan letöltés tiltása

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - a média nem tartozik az adott share galériájához
  - vagy nincs engedélyezve letöltésre
- Amikor:
  - letöltési kérés érkezik
- Akkor:
  - a rendszer megtagadja a műveletet
  - a privát fájl nem kerül kiszolgálásra

---

# 11. FR-DWN-0002 – Média letöltési jogosultságának adminisztratív kezelése

- FR azonosító: `FR-DWN-0002`
- FR neve: Média letöltési jogosultságának adminisztratív kezelése
- Kategória: `FR-DWN-xxxx`
- Státusz: elfogadott
- Prioritás: magas
- Leírás: A rendszer tegye lehetővé, hogy hitelesített admin egy galérián belül médiaelemenként engedélyezze vagy visszavonja az ügyféloldali letöltést.
- Részletes leírás: Az MVP-ben a letöltési jogosultság a `MediaAsset` üzleti metaadatának része. Új média alapértelmezés szerint nem letölthető. Az engedélyezés nem változtatja meg a fizikai fájlt, kizárólag a hozzáférési állapotot.

## IPO modell

- Input:
  - gallery ID
  - media ID
  - engedélyezett/tiltott állapot
  - hitelesített admin
- Process:
  - admin jogosultság ellenőrzése
  - galéria létezésének ellenőrzése
  - média létezésének és gallery-tagságának ellenőrzése
  - letöltési állapot módosítása
  - mentés
- Output:
  - frissített média DTO / letöltési állapot
  - vagy kontrollált jogosultsági/erőforrás hiba

## Funkcionális részletek

- új média alapértelmezett `downloadEnabled = false`
- az engedély csak a saját galériához tartozó média esetén módosítható
- visszavonás azonnal hatályos a következő publikus download kérésre
- a fizikai fájl nem törlődik az engedély visszavonásakor
- bulk engedélyezés nem kötelező az első MVP-ben

## Tervezett API

- `PATCH /api/admin/galleries/{galleryId}/media/{mediaId}/download-permission`

Példa request:

```json
{
  "enabled": true
}
```

## Technikai specifikáció és megjegyzések

Tervezett komponensek:
- `DownloadService`
- admin media controller vagy külön `DownloadPermissionController`
- `MediaAssetRepository`

## Nyomonkövethetőség

- BR:
  - `BR-PRC-0002`
- US:
  - `US-0013`
- TC:
  - `TC-DWN-0003`
  - `TC-DWN-0004`
  - `TC-DWN-0005`

## Acceptance Criteria

### AC-FR-DWN-0002-01 – Letöltés engedélyezése

- Prioritás: magas
- Státusz: elfogadott
- Adott:
  - hitelesített admin
  - a média a megadott galériához tartozik
  - a média letöltése jelenleg tiltott
- Amikor:
  - az admin engedélyezi a letöltést
- Akkor:
  - a média letöltési állapota engedélyezetté válik
  - az állapot későbbi lekérdezéskor is megmarad

### AC-FR-DWN-0002-02 – Letöltési engedély visszavonása

- Prioritás: magas
- Státusz: elfogadott
- Adott:
  - a média letöltése engedélyezett
- Amikor:
  - az admin visszavonja az engedélyt
- Akkor:
  - a média letöltési állapota tiltottá válik
  - a következő ügyféloldali download kérés megtagadásra kerül

### AC-FR-DWN-0002-03 – Idegen galéria médiaengedélyének módosítása tiltott

- Prioritás: kritikus
- Státusz: elfogadott
- Adott:
  - a media ID nem a megadott gallery ID-hoz tartozik
- Amikor:
  - az admin az adott galéria kontextusában próbálja módosítani a letöltési engedélyt
- Akkor:
  - a rendszer elutasítja a műveletet
  - a média eredeti letöltési állapota változatlan marad

---

# 12. Keresztfunkcionális üzleti szabályok

Az alábbi szabályokat több FR is használja.

## RULE-SEC-0001 – Admin és publikus API szétválasztása

- admin végpont hitelesítést igényel
- publikus ügyfélvégpont share tokenhez kötött
- a frontend láthatóság önmagában nem helyettesíti a backend jogosultságellenőrzést

## RULE-DAT-0001 – Galéria tulajdonosi kapcsolat

- minden MVP galéria egy ügyfélhez tartozik
- média csak létező galériához tartozhat

## RULE-MED-0001 – Fizikai média és metaadat szétválasztása

- CockroachDB metaadatot tárol
- bináris média NFS storage-on marad
- az adatbázis relatív storage pathot kezel

## RULE-MED-0002 – Fájlrendszerútvonal biztonság

- kliensoldali kérés nem adhat meg tetszőleges abszolút fájlutat
- minden fizikai elérés szerveroldali azonosító-feloldással történik

## RULE-SHR-0001 – Privát alapállapot

- galéria létrehozása önmagában nem jelent publikus megosztást
- ügyfélhozzáférés csak aktív share objektummal lehetséges

## RULE-WFL-0001 – Selection izoláció

- selection egy konkrét galériához kötött
- selection item csak a saját galéria médiaelemére mutathat

---

# 13. Hibakategóriák funkcionális szinten

A részletes HTTP státuszkód-stratégia az NFR/TR dokumentumban kerül rögzítésre, de az alkalmazás funkcionálisan megkülönbözteti legalább:

- bemeneti validációs hiba
- hitelesítési hiba
- jogosultsági hiba
- hiányzó erőforrás
- üzleti szabálysértés
- duplikáció/ütközés
- média storage hiba
- adatbázis vagy belső rendszerhiba

A kliens felé küldött hiba ne tartalmazzon:
- jelszót
- secretet
- belső stack trace-t
- érzékeny abszolút fájlrendszerútvonalat

---

# 14. Első implementációs csomag

A teljes funkcionális specifikációból az első tényleges fejlesztési sprint/vertikális szelet:

1. `FR-AUT-0001`
2. `FR-DAT-0001`
3. `FR-DAT-0002`
4. `FR-MED-0001`
5. `FR-MED-0002`

Ez a szelet azt bizonyítja, hogy a teljes alaparchitektúra működik:

```text
React frontend
      ↓
Spring Boot backend
      ├──────────────→ CockroachDB / sql01
      │
      └──────────────→ NFS media / nas01
```

Sikeres végállapot:

> A fotós bejelentkezik, létrehoz egy ügyfelet, létrehoz hozzá egy galériát, feltölt egy JPEG képet, a kép fizikailag a MicroServeren tárolódik, metaadata CockroachDB-be kerül, majd a kép megjelenik az admin galérianézetben.

---

# 15. Következő dokumentációs lépések

A jelen FR készlet alapján a következő dokumentumok már konkrétan levezethetők.

## `04-nem-funkcionalis-kovetelmenyek.md`

Új BTPhoto NFR-ek szükségesek legalább:

- karbantartható, rétegzett backend
- biztonság
- storage/adat konzisztencia
- reszponzív használhatóság
- teljesítmény
- naplózás
- availability/recovery
- automatizált quality gate

## `05-technikai-kovetelmenyek.md`

Rögzítendő többek között:

- Java 21 / Spring Boot 3
- React / TypeScript / Vite
- CockroachDB
- PostgreSQL JDBC
- JPA
- Flyway
- Docker / Compose
- Caddy
- GitHub Actions / GHCR
- NFSv4
- Testcontainers vagy CockroachDB integration strategy
- Codex / VS Code fejlesztési konvenciók

## `06-teszteset-gyujtemeny.md`

A jelen dokumentum AC-i alapján közvetlenül létrehozhatók:

- `TC-AUT-*`
- `TC-DAT-*`
- `TC-MED-*`
- `TC-SHR-*`
- `TC-WFL-*`
- `TC-DWN-*`
- `TC-SEC-*`
- `TC-QLT-*`

## `07-nyomonkovethetosegi-matrix.md`

A mátrix új lánca:

```text
BR
→ US
→ FR
→ AC
→ NFR/TR
→ TC
```

---

# 16. Nyitott funkcionális kérdések

Ezeket az implementáció előtt, de nem feltétlenül most azonnal kell véglegesíteni:

1. Admin hitelesítés session vagy token alapon történjen-e?
2. Az ügyfél e-mail legyen-e egyedi?
3. A galéria pontos életciklus-státuszai mik legyenek?
4. A share tokenből egy vagy több lehet aktív ugyanazon galérián?
5. Kell-e már MVP-ben lejárati dátum?
6. Véglegesített selection módosítható-e?
7. Letöltési engedélyezés: **lezárva az MVP-re** – médiaelemenkénti jogosultság, alapértelmezetten tiltott.
8. Thumbnail generálás az első MVP vertikumban vagy a második iterációban készüljön?
9. A média kiszolgálását a Spring backend streamelje, vagy később optimalizált proxy/static mechanizmus kapja?
10. Videó és RAW mikor kerül a backlogba?

Ezeket a dokumentum tudatosan nem oldja fel olyan pontokon, ahol a korábbi üzleti/user story dokumentumok még nem tartalmaznak elfogadott döntést.
