# Teszteset-gyűjtemény

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
- `07-nyomonkovethetosegi-matrix.md`
- `09-rendszerterv-es-szolgaltatasarchitektura.md`

A gyűjtemény a BTPhoto Private Cloud MVP és a szakdolgozati demonstráció szempontjából releváns, közvetlenül implementálható teszteseteket tartalmazza.

A tesztesetek célja nem egy teljes vállalati QA-katalógus létrehozása, hanem annak biztosítása, hogy:

- a kritikus üzleti szabályok automatizáltan ellenőrizhetők legyenek;
- a Spring Boot backend fő service és controller viselkedése tesztelt legyen;
- a CockroachDB és Flyway integráció valós környezethez közeli módon ellenőrizhető legyen;
- az NFS média storage hibái ne maradjanak észrevétlenek;
- a privát galériák hozzáférési szabályai negatív esetekkel is igazoltak legyenek;
- a CI/CD, deployment és restore folyamatok reprodukálhatóan ellenőrizhetők legyenek;
- a `07-nyomonkovethetosegi-matrix.md` minden fontos BR/US/FR/AC elemhez konkrét tesztet tudjon rendelni.

A korábbi projekt tesztelési mintáját megtartva a fő eszközök:

- JUnit 5
- Mockito
- MockMvc
- Spring Boot Test
- CockroachDB integrációs tesztkörnyezet
- GitHub Actions
- frontend tesztek
- Playwright vagy egyenértékű E2E eszköz a későbbi fázisban

---

# 1. Tesztstratégia röviden

## Service réteg

A service rétegben ellenőrizzük:

- üzleti döntéseket;
- jogosultsági szabályokat;
- galéria–média kapcsolatot;
- share token állapotot;
- selection logikát;
- storage és DB hibák kezelését.

Elsődleges eszköz:
- JUnit 5
- Mockito

## Controller/API réteg

A controller rétegben ellenőrizzük:

- HTTP viselkedést;
- request validációt;
- autentikációt;
- hibakódokat;
- egységes error response-t.

Elsődleges eszköz:
- MockMvc
- Spring Security Test

## Adatbázis-integráció

A CockroachDB kompatibilitást nem csak mock vagy H2 teszttel ellenőrizzük.

Ellenőrizendő:

- Flyway migráció;
- JPA mapping;
- foreign key / unique constraint;
- repository query-k;
- tranzakciós viselkedés.

## Storage-integráció

A média storage tesztek két csoportra oszlanak:

1. unit szintű storage adapter tesztek;
2. integrációs / manuális NFS ellenőrzések.

## Frontend

Ellenőrizendő:

- TypeScript;
- komponensek;
- hibaállapotok;
- responsive viselkedés;
- proofing interakciók.

## End-to-end

Az MVP fő üzleti útvonalai:

1. admin login;
2. ügyfél létrehozás;
3. galéria létrehozás;
4. JPEG feltöltés;
5. média megjelenítés;
6. privát link;
7. client proofing;
8. admin kiválasztás megtekintés;
9. később letöltés.

---

# 2. Tesztprioritások

- **kritikus:** az MVP vagy biztonság alapvető része; CI-ben kötelező.
- **magas:** erősen ajánlott az MVP release előtt.
- **közepes:** későbbi iterációban vagy manuálisan is elfogadható.
- **alacsony:** kiegészítő / demonstrációs érték.

---

# 3. TC-AUT – Admin hitelesítés

## TC-AUT-0001 – Sikeres admin bejelentkezés

- Teszt azonosító: `TC-AUT-0001`
- Teszt neve: Sikeres admin bejelentkezés
- Típus: controller/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-AUT-0001`
- Kapcsolódó AC: `AC-FR-AUT-0001-01`
- Kapcsolódó NFR: `NFR-SEC-0001`
- Teszteszköz: MockMvc + Spring Security Test
- Leírás: Érvényes admin hitelesítési adatokkal a rendszer hitelesített állapotot hoz létre.
- Pozitív/negatív: pozitív
- Érintett komponensek:
  - `AuthController`
  - `AuthService`
  - `SecurityConfig`
- Előfeltétel:
  - létezik aktív admin user
- Elvárt eredmény:
  - sikeres HTTP válasz
  - hitelesített állapot létrejön
  - védett admin végpont ezt követően elérhető

## TC-AUT-0002 – Hibás jelszó elutasítása

- Teszt azonosító: `TC-AUT-0002`
- Teszt neve: Hibás jelszó elutasítása
- Típus: controller teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-AUT-0001`
- Kapcsolódó AC: `AC-FR-AUT-0001-03`
- Teszteszköz: MockMvc
- Leírás: Hibás jelszó esetén a rendszer nem hoz létre hitelesített állapotot.
- Pozitív/negatív: negatív
- Elvárt eredmény:
  - hozzáférés elutasítva
  - nincs session/token
  - a válasz nem árulja el, hogy a jelszó vagy a felhasználónév volt hibás

## TC-AUT-0003 – Védett admin endpoint hitelesítés nélkül

- Teszt azonosító: `TC-AUT-0003`
- Teszt neve: Védett admin endpoint hitelesítés nélkül
- Típus: security/controller teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-AUT-0001`
- Kapcsolódó AC: `AC-FR-AUT-0001-02`
- Kapcsolódó NFR: `NFR-SEC-0001`
- Teszteszköz: MockMvc + Spring Security Test
- Leírás: Egy admin végpont közvetlen hívása hitelesítés nélkül nem adhat vissza admin adatot.
- Pozitív/negatív: negatív
- Elvárt eredmény:
  - 401 vagy 403 a végleges security modell szerint
  - válaszban nincs védett tartalom

---

# 4. TC-DAT – Ügyfél- és galéria-adatok

## TC-DAT-0001 – Ügyfél sikeres létrehozása

- Teszt azonosító: `TC-DAT-0001`
- Teszt neve: Ügyfél sikeres létrehozása
- Típus: service unit teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-DAT-0001`
- Kapcsolódó AC: `AC-FR-DAT-0001-01`
- Teszteszköz: JUnit 5 + Mockito
- Leírás: Érvényes ügyféladatok esetén a service elmenti az ügyfelet és egyedi azonosítót ad vissza.
- Pozitív/negatív: pozitív
- Érintett komponensek:
  - `ClientService`
  - `ClientRepository`

## TC-DAT-0002 – Ügyfél név validáció

- Teszt azonosító: `TC-DAT-0002`
- Teszt neve: Ügyfél név validáció
- Típus: service/controller teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-DAT-0001`
- Kapcsolódó AC: `AC-FR-DAT-0001-02`
- Leírás: Üres vagy hiányzó névvel ügyfél nem menthető.
- Pozitív/negatív: negatív
- Elvárt eredmény:
  - validációs hiba
  - repository mentés nem történik

## TC-DAT-0003 – Galéria sikeres létrehozása

- Teszt azonosító: `TC-DAT-0003`
- Teszt neve: Galéria sikeres létrehozása
- Típus: service unit teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-DAT-0002`
- Kapcsolódó AC: `AC-FR-DAT-0002-01`
- Teszteszköz: JUnit 5 + Mockito
- Leírás: Létező ügyfélhez érvényes adatokkal galéria létrehozható.
- Pozitív/negatív: pozitív
- Érintett komponensek:
  - `GalleryService`
  - `ClientRepository`
  - `GalleryRepository`
- Elvárt eredmény:
  - galéria elmentődik
  - ügyfélkapcsolat megfelelő
  - egyedi gallery ID létrejön

## TC-DAT-0004 – Nem létező ügyfélhez galéria tiltása

- Teszt azonosító: `TC-DAT-0004`
- Teszt neve: Nem létező ügyfélhez galéria tiltása
- Típus: service unit teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-DAT-0002`
- Kapcsolódó NFR: `NFR-DAT-0001`
- Teszteszköz: JUnit 5 + Mockito
- Leírás: A service nem engedhet árva galériát létrehozni.
- Pozitív/negatív: negatív
- Elvárt eredmény:
  - hiba
  - galéria repository mentés nem történik

## TC-DAT-0005 – Új galéria privát alapállapota

- Teszt azonosító: `TC-DAT-0005`
- Teszt neve: Új galéria privát alapállapota
- Típus: unit/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-DAT-0002`
- Kapcsolódó AC: `AC-FR-DAT-0002-02`
- Leírás: Új galériához nem jön létre automatikusan aktív share hozzáférés.
- Pozitív/negatív: pozitív
- Elvárt eredmény:
  - gallery státusz privát/draft
  - aktív share rekord nincs

## TC-DAT-0006 – Galériák listázása

- Teszt azonosító: `TC-DAT-0006`
- Teszt neve: Galériák listázása
- Típus: controller/integrációs teszt
- Prioritás: magas
- Kapcsolódó FR: `FR-DAT-0002`
- Kapcsolódó AC: `AC-FR-DAT-0002-03`
- Teszteszköz: MockMvc
- Leírás: Több galéria esetén az admin lista visszaadja az alapadatokat és az ügyfélkapcsolatot.

---

# 5. TC-MED – Médiafeltöltés és storage

## TC-MED-0001 – JPEG sikeres feltöltése

- Teszt azonosító: `TC-MED-0001`
- Teszt neve: JPEG sikeres feltöltése
- Típus: service/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-MED-0001`
- Kapcsolódó AC: `AC-FR-MED-0001-01`
- Kapcsolódó NFR: `NFR-REL-0001`
- Teszteszköz: JUnit 5 + Mockito / integrációs storage teszt
- Leírás: Létező galériához támogatott JPEG sikeresen storage-ra kerül és médiarekord jön létre.
- Pozitív/negatív: pozitív
- Érintett komponensek:
  - `MediaService`
  - `MediaStorageService`
  - `MediaAssetRepository`
- Elvárt eredmény:
  - storage write meghívódik
  - médiarekord elmentődik
  - gallery ID megfelelő
  - relatív path létrejön

## TC-MED-0002 – Nem támogatott fájltípus elutasítása

- Teszt azonosító: `TC-MED-0002`
- Teszt neve: Nem támogatott fájltípus elutasítása
- Típus: service/controller teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-MED-0001`
- Kapcsolódó AC: `AC-FR-MED-0001-02`
- Leírás: Nem támogatott típusú fájl nem kerülhet normál médiaállományként a rendszerbe.
- Pozitív/negatív: negatív
- Elvárt eredmény:
  - validációs hiba
  - nincs repository save
  - nincs végleges storage file

## TC-MED-0003 – Storage írási hiba kezelése

- Teszt azonosító: `TC-MED-0003`
- Teszt neve: Storage írási hiba kezelése
- Típus: service unit teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-MED-0001`
- Kapcsolódó AC: `AC-FR-MED-0001-03`
- Kapcsolódó NFR: `NFR-REL-0001`
- Teszteszköz: JUnit 5 + Mockito
- Leírás: A storage adapter hibája esetén a feltöltés nem minősülhet sikeresnek.
- Pozitív/negatív: negatív
- Elvárt eredmény:
  - hiba propagálódik kontrollált domain/application hibaként
  - nem jön létre üzletileg sikeres médiarekord

## TC-MED-0004 – Sikertelen DB mentés utáni storage konzisztencia

- Teszt azonosító: `TC-MED-0004`
- Teszt neve: Sikertelen DB mentés utáni storage konzisztencia
- Típus: service unit/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-MED-0001`
- Kapcsolódó NFR: `NFR-REL-0001`
- Leírás: Ha a fizikai fájlírás után a médiarekord adatbázismentése sikertelen, az implementáció által választott kompenzációs stratégia szerint ne maradjon észrevétlen inkonzisztens normál állapot.
- Megjegyzés:
  - a pontos elvárt technikai lépés a későbbi implementációs döntéstől függ
  - a tesztesetet akkor kell véglegesíteni, amikor a kompenzációs minta eldől

## TC-MED-0005 – Galéria médiaelemeinek listázása

- Teszt azonosító: `TC-MED-0005`
- Teszt neve: Galéria médiaelemeinek listázása
- Típus: controller/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-MED-0002`
- Kapcsolódó AC: `AC-FR-MED-0002-01`
- Teszteszköz: MockMvc
- Leírás: A galéria média végpont csak az adott galéria médiarekordjait adja vissza.
- Elvárt eredmény:
  - megfelelő media ID-k
  - megjelenítési URL/hivatkozás
  - idegen gallery média nincs a listában

## TC-MED-0006 – Hiányzó fizikai médiafájl kezelése

- Teszt azonosító: `TC-MED-0006`
- Teszt neve: Hiányzó fizikai médiafájl kezelése
- Típus: service/controller teszt
- Prioritás: magas
- Kapcsolódó FR: `FR-MED-0002`
- Kapcsolódó AC: `AC-FR-MED-0002-02`
- Leírás: Létező médiarekord, de hiányzó fizikai fájl esetén a teljes galéria lekérés ne omoljon össze kezeletlen hibával.

## TC-MED-0007 – Path traversal kísérlet tiltása

- Teszt azonosító: `TC-MED-0007`
- Teszt neve: Path traversal kísérlet tiltása
- Típus: security/service teszt
- Prioritás: kritikus
- Kapcsolódó NFR: `NFR-SEC-0001`
- Kapcsolódó szabály: `RULE-MED-0002`
- Leírás: Kliens által manipulált fájlnév/path nem teheti elérhetővé a storage rooton kívüli fájlokat.
- Pozitív/negatív: negatív

---

# 6. TC-SHR – Privát megosztás

## TC-SHR-0001 – Privát share létrehozása

- Teszt azonosító: `TC-SHR-0001`
- Teszt neve: Privát share létrehozása
- Típus: service unit teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-SHR-0001`
- Kapcsolódó AC: `AC-FR-SHR-0001-01`
- Leírás: Galériához egyedi, nem triviálisan kitalálható share token jön létre.
- Elvárt eredmény:
  - share rekord létrejön
  - gallery kapcsolat helyes
  - token nem egyenlő egyszerű gallery ID-val

## TC-SHR-0002 – Share visszavonása

- Teszt azonosító: `TC-SHR-0002`
- Teszt neve: Share visszavonása
- Típus: service/controller teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-SHR-0001`
- Kapcsolódó AC: `AC-FR-SHR-0001-02`
- Leírás: Visszavonás után a share rekord inaktív, de a gallery és media megmarad.

## TC-SHR-0003 – Érvényes share token galéria lekérése

- Teszt azonosító: `TC-SHR-0003`
- Teszt neve: Érvényes share token galéria lekérése
- Típus: controller/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-SHR-0002`
- Kapcsolódó AC: `AC-FR-SHR-0002-01`
- Teszteszköz: MockMvc
- Leírás: Érvényes token a megfelelő publikus gallery DTO-t adja vissza.

## TC-SHR-0004 – Érvénytelen token tiltása

- Teszt azonosító: `TC-SHR-0004`
- Teszt neve: Érvénytelen token tiltása
- Típus: controller teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-SHR-0002`
- Kapcsolódó AC: `AC-FR-SHR-0002-02`
- Leírás: Nem létező vagy visszavont token esetén privát tartalom nem kerül visszaadásra.

## TC-SHR-0005 – Más galéria ID manipulációjának tiltása

- Teszt azonosító: `TC-SHR-0005`
- Teszt neve: Más galéria ID manipulációjának tiltása
- Típus: security/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó NFR: `NFR-SEC-0001`
- Leírás: Egy érvényes share tokennel semmilyen kliensoldali ID-manipuláció nem adhat hozzáférést más galériához.

---

# 7. TC-WFL – Client proofing

## TC-WFL-0001 – Kép sikeres kijelölése

- Teszt azonosító: `TC-WFL-0001`
- Teszt neve: Kép sikeres kijelölése
- Típus: service unit teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-WFL-0001`
- Kapcsolódó AC: `AC-FR-WFL-0001-01`
- Leírás: Érvényes share és az adott galériához tartozó média esetén selection item létrejön.

## TC-WFL-0002 – Duplikált selection item tiltása

- Teszt azonosító: `TC-WFL-0002`
- Teszt neve: Duplikált selection item tiltása
- Típus: service unit/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-WFL-0001`
- Kapcsolódó AC: `AC-FR-WFL-0001-02`
- Kapcsolódó NFR: `NFR-DAT-0001`
- Leírás: Ugyanaz a média ugyanabban a selectionben másodszor nem jöhet létre.

## TC-WFL-0003 – Más galéria médiájának kijelölése tiltott

- Teszt azonosító: `TC-WFL-0003`
- Teszt neve: Más galéria médiájának kijelölése tiltott
- Típus: service/security teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-WFL-0001`
- Kapcsolódó NFR: `NFR-SEC-0001`, `NFR-DAT-0001`
- Leírás: Érvényes share token mellett sem jelölhető ki olyan media ID, amely más galériához tartozik.

## TC-WFL-0004 – Selection sikeres véglegesítése

- Teszt azonosító: `TC-WFL-0004`
- Teszt neve: Selection sikeres véglegesítése
- Típus: service unit teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-WFL-0002`
- Kapcsolódó AC: `AC-FR-WFL-0002-01`
- Leírás: Legalább egy kiválasztott képet tartalmazó selection végleges állapotba váltható.

## TC-WFL-0005 – Véglegesített selection admin lekérése

- Teszt azonosító: `TC-WFL-0005`
- Teszt neve: Véglegesített selection admin lekérése
- Típus: controller/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-WFL-0002`
- Kapcsolódó AC: `AC-FR-WFL-0002-02`
- Leírás: Admin a galériához tartozó végleges selection médiaelemeit megkapja.

## TC-WFL-0006 – Selection izoláció galériák között

- Teszt azonosító: `TC-WFL-0006`
- Teszt neve: Selection izoláció galériák között
- Típus: integrációs teszt
- Prioritás: kritikus
- Kapcsolódó FR: `FR-WFL-0002`
- Kapcsolódó AC: `AC-FR-WFL-0002-03`
- Leírás: Egy gallery selection lekérdezése során más gallery selection itemje nem jelenhet meg.

---

# 8. TC-DWN – Letöltés

## TC-DWN-0001 – Engedélyezett média sikeres letöltése

- Teszt azonosító: `TC-DWN-0001`
- Teszt neve: Engedélyezett média sikeres letöltése
- Típus: controller/integrációs teszt
- Prioritás: magas
- Státusz: elfogadott
- Kapcsolódó FR: `FR-DWN-0001`
- Kapcsolódó AC: `AC-FR-DWN-0001-01`
- Leírás: Érvényes share és engedélyezett média esetén a megfelelő fizikai fájl streamelhető.

## TC-DWN-0002 – Más galéria fájljának letöltése tiltott

- Teszt azonosító: `TC-DWN-0002`
- Teszt neve: Más galéria fájljának letöltése tiltott
- Típus: security/integrációs teszt
- Prioritás: kritikus
- Státusz: elfogadott
- Kapcsolódó FR: `FR-DWN-0001`
- Kapcsolódó AC: `AC-FR-DWN-0001-02`
- Kapcsolódó NFR: `NFR-SEC-0001`
- Leírás: Érvényes share tokennel sem tölthető le más galériához tartozó media ID.

## TC-DWN-0003 – Média letöltésének admin engedélyezése

- Teszt azonosító: `TC-DWN-0003`
- Teszt neve: Média letöltésének admin engedélyezése
- Típus: service/controller teszt
- Prioritás: magas
- Státusz: elfogadott
- Kapcsolódó FR: `FR-DWN-0002`
- Kapcsolódó AC: `AC-FR-DWN-0002-01`
- Leírás: Saját galériához tartozó, alapértelmezetten nem letölthető média letöltési állapota admin művelettel engedélyezhető.
- Elvárt eredmény:
  - `downloadEnabled = true`
  - az állapot adatbázisban megmarad

## TC-DWN-0004 – Letöltési engedély admin visszavonása

- Teszt azonosító: `TC-DWN-0004`
- Teszt neve: Letöltési engedély admin visszavonása
- Típus: service/controller + integrációs teszt
- Prioritás: magas
- Státusz: elfogadott
- Kapcsolódó FR: `FR-DWN-0002`
- Kapcsolódó AC: `AC-FR-DWN-0002-02`
- Leírás: Engedélyezett média letöltési joga visszavonható; a következő publikus letöltés megtagadásra kerül.

## TC-DWN-0005 – Idegen galéria médiaengedélyének módosítása tiltott

- Teszt azonosító: `TC-DWN-0005`
- Teszt neve: Idegen galéria médiaengedélyének módosítása tiltott
- Típus: service/security teszt
- Prioritás: kritikus
- Státusz: elfogadott
- Kapcsolódó FR: `FR-DWN-0002`
- Kapcsolódó AC: `AC-FR-DWN-0002-03`
- Kapcsolódó NFR: `NFR-SEC-0001`, `NFR-DAT-0001`
- Leírás: Egy gallery route-on keresztül másik galériához tartozó média letöltési állapota nem módosítható.

---

# 9. TC-API – Hibaformátum

## TC-API-0001 – Validációs hiba API formátuma

- Teszt azonosító: `TC-API-0001`
- Teszt neve: Validációs hiba API formátuma
- Típus: controller teszt
- Prioritás: magas
- Kapcsolódó NFR: `NFR-USB-0001`
- Teszteszköz: MockMvc
- Leírás: Hibás request esetén az API egységes, kliens által értelmezhető választ ad.

## TC-API-0002 – Hiányzó erőforrás API formátuma

- Teszt azonosító: `TC-API-0002`
- Teszt neve: Hiányzó erőforrás API formátuma
- Típus: controller teszt
- Prioritás: magas
- Kapcsolódó NFR: `NFR-USB-0001`
- Leírás: Nem létező ügyfél/galéria/media esetén ne általános 500 hiba érkezzen.

## TC-API-0003 – Storage hiba nem fed fel belső pathot

- Teszt azonosító: `TC-API-0003`
- Teszt neve: Storage hiba nem fed fel belső pathot
- Típus: controller/service teszt
- Prioritás: kritikus
- Kapcsolódó NFR: `NFR-USB-0001`, `NFR-SEC-0001`
- Leírás: `/srv/storage/...` jellegű belső elérési út ne kerüljön a publikus hibaüzenetbe.

---

# 10. TC-SEC – Biztonsági tesztek

## TC-SEC-0001 – Share token nem ad admin hozzáférést

- Teszt azonosító: `TC-SEC-0001`
- Teszt neve: Share token nem ad admin hozzáférést
- Típus: security/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó NFR: `NFR-SEC-0001`
- Leírás: Ügyfél share token nem használható `/api/admin/**` végpontokra.

## TC-SEC-0002 – Admin auth nem helyettesíti a gallery ownership ellenőrzést

- Teszt azonosító: `TC-SEC-0002`
- Teszt neve: Admin auth nem helyettesíti a gallery ownership ellenőrzést
- Típus: service/security teszt
- Prioritás: magas
- Leírás: A backend minden domain műveletnél a megfelelő erőforrást ellenőrzi, nem csak azt, hogy admin be van-e jelentkezve.

## TC-SEC-0003 – Secret nem jelenik meg alkalmazáslogban

- Teszt azonosító: `TC-SEC-0003`
- Teszt neve: Secret nem jelenik meg alkalmazáslogban
- Típus: review/integrációs ellenőrzés
- Prioritás: kritikus
- Kapcsolódó NFR: `NFR-SEC-0002`
- Leírás: Jelszó, DB credential, full share token vagy deployment secret nem kerül normál application logba.

## TC-SEC-0004 – Repository secret scan

- Teszt azonosító: `TC-SEC-0004`
- Teszt neve: Repository secret scan
- Típus: CI/review
- Prioritás: magas
- Kapcsolódó NFR: `NFR-SEC-0002`
- Leírás: A repository nem tartalmaz production `.env`, jelszó vagy token értékeket.

---

# 11. TC-DB – CockroachDB és Flyway

## TC-DB-0001 – Flyway baseline futása tiszta CockroachDB-n

- Teszt azonosító: `TC-DB-0001`
- Teszt neve: Flyway baseline futása tiszta CockroachDB-n
- Típus: integrációs teszt
- Prioritás: kritikus
- Kapcsolódó TR: `TR-DAT-0002`
- Kapcsolódó NFR: `NFR-DAT-0001`
- Leírás: Üres CockroachDB példányon a teljes migrációs lánc sikeresen lefut.

## TC-DB-0002 – Gallery–Client foreign key integritás

- Teszt azonosító: `TC-DB-0002`
- Teszt neve: Gallery–Client foreign key integritás
- Típus: repository/integrációs teszt
- Prioritás: kritikus
- Kapcsolódó NFR: `NFR-DAT-0001`
- Leírás: Nem létező client ID-val gallery nem menthető.

## TC-DB-0003 – MediaAsset–Gallery integritás

- Teszt azonosító: `TC-DB-0003`
- Teszt neve: MediaAsset–Gallery integritás
- Típus: repository/integrációs teszt
- Prioritás: kritikus
- Leírás: Nem létező gallery ID-val media record nem menthető.

## TC-DB-0004 – SelectionItem duplikációs integritás

- Teszt azonosító: `TC-DB-0004`
- Teszt neve: SelectionItem duplikációs integritás
- Típus: repository/integrációs teszt
- Prioritás: magas
- Leírás: A választott adatmodell szerint ugyanaz a media egy selectionben ne legyen kétszer menthető.

---

# 12. TC-QLT – Minőségkapu

## TC-QLT-0001 – Rétegzett szerkezet code review

- Teszt azonosító: `TC-QLT-0001`
- Teszt neve: Rétegzett szerkezet code review
- Típus: review/checklist
- Prioritás: magas
- Kapcsolódó NFR: `NFR-MNT-0001`
- Kapcsolódó TR: `TR-ARC-0001`
- Leírás: Ellenőrizni kell, hogy üzleti logika nem kerül controllerbe, storage művelet nem kerül szétszórtan a rendszerbe.

## TC-QLT-0002 – Maven verify lánc

- Teszt azonosító: `TC-QLT-0002`
- Teszt neve: Maven verify lánc sikeres lefutása
- Típus: build ellenőrzés
- Prioritás: kritikus
- Kapcsolódó NFR: `NFR-MNT-0002`
- Kapcsolódó TR: `TR-DEV-0001`, `TR-DEV-0002`
- Leírás: A `mvn clean verify` sikeresen fut, beleértve a teszteket, JaCoCo, Checkstyle és SpotBugs ellenőrzést.

## TC-QLT-0003 – Frontend quality check

- Teszt azonosító: `TC-QLT-0003`
- Teszt neve: Frontend quality check
- Típus: build ellenőrzés
- Prioritás: magas
- Kapcsolódó NFR: `NFR-MNT-0002`
- Kapcsolódó TR: `TR-TCH-0002`
- Leírás: TypeScript check, lint és production build sikeresen lefut.

---

# 13. TC-OPS – Health és diagnosztika

## TC-OPS-0001 – Backend health endpoint

- Teszt azonosító: `TC-OPS-0001`
- Teszt neve: Backend health endpoint
- Típus: integrációs/smoke teszt
- Prioritás: magas
- Kapcsolódó NFR: `NFR-OPS-0001`
- Kapcsolódó TR: `TR-OPS-0002`
- Leírás: Normál állapotban a health endpoint sikeres állapotot ad.

## TC-OPS-0002 – CockroachDB kapcsolat hibájának felismerése

- Teszt azonosító: `TC-OPS-0002`
- Teszt neve: CockroachDB kapcsolat hibájának felismerése
- Típus: integrációs/manuális teszt
- Prioritás: magas
- Leírás: DB leálláskor a rendszer diagnosztizálható health/log állapotot ad.

## TC-OPS-0003 – Media storage hiba felismerése

- Teszt azonosító: `TC-OPS-0003`
- Teszt neve: Media storage hiba felismerése
- Típus: integrációs/manuális teszt
- Prioritás: magas
- Leírás: NFS mount kiesése esetén a media-dependent health vagy diagnosztikai állapot hibát jelez.

---

# 14. TC-DEP – CI/CD és deployment

## TC-DEP-0001 – Sikertelen quality gate blokkolja az image buildet

- Teszt azonosító: `TC-DEP-0001`
- Teszt neve: Sikertelen quality gate blokkolja az image buildet
- Típus: CI workflow teszt
- Prioritás: kritikus
- Kapcsolódó NFR: `NFR-DEP-0001`
- Kapcsolódó TR: `TR-DEP-0002`
- Leírás: Hibás teszt/build esetén production image nem készülhet.

## TC-DEP-0002 – Production image commit SHA-val azonosítható

- Teszt azonosító: `TC-DEP-0002`
- Teszt neve: Production image commit SHA-val azonosítható
- Típus: CI ellenőrzés
- Prioritás: magas
- Leírás: Registry image visszavezethető a forrás commitra.

## TC-DEP-0003 – Deploy utáni health check

- Teszt azonosító: `TC-DEP-0003`
- Teszt neve: Deploy utáni health check
- Típus: deployment smoke teszt
- Prioritás: kritikus
- Leírás: `docker compose up -d` után a backend health és publikus web route ellenőrződik.

## TC-DEP-0004 – Secret repository-n kívül marad

- Teszt azonosító: `TC-DEP-0004`
- Teszt neve: Secret repository-n kívül marad
- Típus: CI/review
- Prioritás: kritikus
- Kapcsolódó NFR: `NFR-SEC-0002`
- Leírás: Production deploy csak GitHub Secret/Environment vagy szerveroldali biztonságos konfigurációból kap titkot.

---

# 15. TC-REC – Backup és restore

## TC-REC-0001 – docker01 VM backup és restore

- Teszt azonosító: `TC-REC-0001`
- Teszt neve: docker01 VM backup és restore
- Típus: infrastruktúra/manual
- Prioritás: kritikus
- Kapcsolódó NFR: `NFR-REC-0001`
- Kapcsolódó TR: `TR-BCK-0001`
- Leírás: `docker01` mentésből visszaállítható és az alkalmazás szolgáltatásai újraindíthatók.
- Elvárt eredmény:
  - VM bootol
  - Docker indul
  - alkalmazás health sikeres
  - média mount újra elérhető

## TC-REC-0002 – sql01 VM backup és restore

- Teszt azonosító: `TC-REC-0002`
- Teszt neve: sql01 VM backup és restore
- Típus: infrastruktúra/manual
- Prioritás: kritikus
- Leírás: `sql01` VM mentésből visszaállítható.

## TC-REC-0003 – CockroachDB logikai backup restore

- Teszt azonosító: `TC-REC-0003`
- Teszt neve: CockroachDB logikai backup restore
- Típus: adatbázis/manual/integrációs
- Prioritás: kritikus
- Leírás: Külön DB backupból tesztkörnyezetben visszaállíthatók az üzleti adatok.

## TC-REC-0004 – Médiafájl restore

- Teszt azonosító: `TC-REC-0004`
- Teszt neve: Médiafájl restore
- Típus: storage/manual
- Prioritás: magas
- Leírás: Törölt teszt médiafájl a backupból visszaállítható, majd az alkalmazás újra eléri.

---

# 16. TC-UI – Reszponzív és hozzáférhető UI

## TC-UI-0001 – Mobil galérianézet

- Teszt azonosító: `TC-UI-0001`
- Teszt neve: Mobil galérianézet
- Típus: UI/manual/E2E
- Prioritás: magas
- Kapcsolódó NFR: `NFR-USB-0002`
- Leírás: kb. 390 px széles viewporton a galéria horizontális oldal-scroll nélkül használható.

## TC-UI-0002 – Billentyűzetes proofing

- Teszt azonosító: `TC-UI-0002`
- Teszt neve: Billentyűzetes proofing
- Típus: accessibility/manual
- Prioritás: közepes
- Leírás: A kép kijelöléshez és véglegesítéshez szükséges interaktív elemek billentyűzettel elérhetők.

## TC-UI-0003 – Kiválasztási állapot nem csak színnel jelzett

- Teszt azonosító: `TC-UI-0003`
- Teszt neve: Kiválasztási állapot nem csak színnel jelzett
- Típus: UI review
- Prioritás: magas
- Leírás: A selected állapot ikon/szöveg/shape segítségével is megkülönböztethető.

---

# 17. TC-PER – Teljesítmény

## TC-PER-0001 – Alap API válaszidő baseline

- Teszt azonosító: `TC-PER-0001`
- Teszt neve: Alap API válaszidő baseline
- Típus: performance
- Prioritás: közepes
- Kapcsolódó NFR: `NFR-PER-0001`
- Leírás: Kontrollált LAN környezetben az egyszerű, nem média-streamelő API-k p95 válaszideje mérésre kerül.
- Kezdeti tervezési cél:
  - p95 ≤ 500 ms

## TC-PER-0002 – Galéria lista API baseline

- Teszt azonosító: `TC-PER-0002`
- Teszt neve: Galéria lista API baseline
- Típus: performance
- Prioritás: közepes
- Kezdeti cél:
  - p95 ≤ 800 ms

## TC-PER-0003 – Öt párhuzamos tipikus kérés

- Teszt azonosító: `TC-PER-0003`
- Teszt neve: Öt párhuzamos tipikus kérés
- Típus: performance
- Prioritás: közepes
- Leírás: Legalább öt párhuzamos tipikus felhasználói kérés hibamentesen kiszolgálható.
- Megjegyzés:
  - a teszt célja baseline készítése, nem nagyterhelésű SaaS benchmark

---

# 18. TC-E2E – Végponttól végpontig üzleti tesztek

## TC-E2E-0001 – Első vertikális szelet

- Teszt azonosító: `TC-E2E-0001`
- Teszt neve: Admin → ügyfél → galéria → JPEG → megjelenítés
- Típus: E2E
- Prioritás: kritikus
- Kapcsolódó FR:
  - `FR-AUT-0001`
  - `FR-DAT-0001`
  - `FR-DAT-0002`
  - `FR-MED-0001`
  - `FR-MED-0002`
- Leírás:
  1. admin bejelentkezik;
  2. ügyfelet létrehoz;
  3. galériát hoz létre;
  4. JPEG képet feltölt;
  5. a kép fizikailag NFS media storage-ra kerül;
  6. CockroachDB-ben metaadat jön létre;
  7. a kép megjelenik az admin galériában.
- Elvárt eredmény:
  - minden lépés sikeres
  - a fájl és metaadat konzisztens
  - CI-ből automatizálható vagy legalább reprodukálható

## TC-E2E-0002 – Privát ügyfélgaléria

- Teszt azonosító: `TC-E2E-0002`
- Teszt neve: Admin share → ügyfél galéria
- Típus: E2E
- Prioritás: kritikus
- Kapcsolódó FR:
  - `FR-SHR-0001`
  - `FR-SHR-0002`
- Leírás:
  1. admin létrehoz share linket;
  2. ügyfél megnyitja;
  3. megfelelő galériát lát;
  4. admin visszavonja;
  5. ugyanaz a link többé nem működik.

## TC-E2E-0003 – Client proofing

- Teszt azonosító: `TC-E2E-0003`
- Teszt neve: Ügyfél kiválasztás → véglegesítés → admin megtekintés
- Típus: E2E
- Prioritás: kritikus
- Kapcsolódó FR:
  - `FR-WFL-0001`
  - `FR-WFL-0002`
- Leírás:
  1. ügyfél megnyitja a galériát;
  2. képet jelöl ki;
  3. véglegesíti a kiválasztást;
  4. admin megnyitja a gallery selection nézetet;
  5. ugyanaz a kijelölt kép megjelenik.

---

# 19. Első CI-be kötelező tesztkészlet

Az első vertikális szelet fejlesztésekor a minimum automatikus quality gate:

```text
TC-AUT-0001
TC-AUT-0002
TC-AUT-0003

TC-DAT-0001
TC-DAT-0002
TC-DAT-0003
TC-DAT-0004
TC-DAT-0005

TC-MED-0001
TC-MED-0002
TC-MED-0003
TC-MED-0005
TC-MED-0007

TC-API-0001
TC-API-0002
TC-API-0003

TC-DB-0001
TC-DB-0002
TC-DB-0003

TC-QLT-0002
TC-QLT-0003

TC-OPS-0001
```

A `TC-E2E-0001` az első release-jelölt állapot előtt legyen zöld.

---

# 20. Manuális infrastruktúra tesztek

A következő tesztek nem feltétlenül automatizáltak az első iterációban:

- `TC-REC-0001`
- `TC-REC-0002`
- `TC-REC-0003`
- `TC-REC-0004`
- `TC-OPS-0002`
- `TC-OPS-0003`
- responsive UI ellenőrzések
- külső HTTPS/domain smoke test

Ezek eredményét a szakdolgozatban képernyőképpel, paranccsal vagy mérési eredménnyel érdemes dokumentálni.

---

# 21. Teszteredmények státuszkezelése

Javasolt státuszértékek:

- `tervezet`
- `implementálva`
- `sikeres`
- `sikertelen`
- `blokkolt`
- `nem alkalmazható`

A dokumentum v0.1 verziójában a tesztek többsége `tervezet`. Implementáció közben a státusz és a tényleges tesztosztály/fájl referencia is felvehető.

Példa:

```text
Státusz: sikeres
Automatizált teszt:
backend/src/test/java/.../MediaServiceTest.java
CI run:
<GitHub Actions run reference>
```

---

# 22. Szakirodalmi háttér

[1] Crispin, L. – Gregory, J.: *Agile Testing: A Practical Guide for Testers and Agile Teams*. Addison-Wesley Professional, 2009.

[2] Meszaros, G.: *xUnit Test Patterns: Refactoring Test Code*. Addison-Wesley Professional, 2007.

[3] Humble, J. – Farley, D.: *Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation*. Addison-Wesley Professional, 2010.

[4] Freeman, S. – Pryce, N.: *Growing Object-Oriented Software, Guided by Tests*. Addison-Wesley Professional, 2009.

[5] Sommerville, I.: *Software Engineering*. 10th Edition. Pearson, 2015.

---

# 23. Következő lépés

A következő dokumentum a `07-nyomonkovethetosegi-matrix.md`.

Az új mátrixnak már a teljes BTPhoto láncot kell egy helyen összekötnie:

```text
BR
→ Epic / US
→ FR
→ AC
→ NFR
→ TR
→ TC
```

A cél, hogy egyetlen kritikus üzleti követelmény se maradjon:
- implementálható FR nélkül;
- ellenőrizhető AC nélkül;
- releváns teszteset nélkül.

A mátrix elkészítése közben ki fognak derülni az esetleges további követelményrések is.
