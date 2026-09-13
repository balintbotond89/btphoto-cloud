# Nem funkcionális követelmények

**Dokumentum státusza:** fejlesztési baseline v0.1  
**Projekt:** BTPhoto Private Cloud  
**Baseline azonosító:** `BTPC-BL-2026-09-13-v0.1`  
**Baseline dátuma:** `2026-09-13`

**Kapcsolódó dokumentumok:**
- `01-uzleti-kovetelmenyek.md`
- `02-epicek-es-user-storyk.md`
- `03-funkcionalis-kovetelmenyek.md`
- `05-technikai-kovetelmenyek.md`
- `06-teszteset-gyujtemeny.md`
- `07-nyomonkovethetosegi-matrix.md`
- `08-ui-ux-terv.md`
- `09-rendszerterv-es-szolgaltatasarchitektura.md`

A dokumentum a BTPhoto Private Cloud azon minőségi elvárásait rögzíti, amelyek a rendszer megbízhatóságát, biztonságát, karbantarthatóságát, használhatóságát, teljesítményét és üzemeltethetőségét meghatározzák.

A követelmények szerkezete a korábbi projekt mintáját követi: minden NFR egyedi azonosítót, prioritást, részletes leírást, mérési módszert, sikerességi és sikertelenségi kritériumokat, technikai megjegyzést, tesztelési stratégiát és nyomonkövethetőséget kap.

> A nem funkcionális követelmények célja nem az, hogy minden lehetséges minőségi jellemzőt felsoroljanak, hanem hogy az MVP és a szakdolgozati demonstráció szempontjából lényeges, mérhető és ellenőrizhető minőségcélokat rögzítsék.

---

# NFR összefoglaló

| NFR | Megnevezés | Prioritás |
| --- | --- | --- |
| `NFR-MNT-0001` | Karbantartható, rétegzett és moduláris backend szerkezet | kritikus |
| `NFR-REL-0001` | Üzleti és storage-konzisztencia megbízható érvényesítése | kritikus |
| `NFR-DAT-0001` | Adatintegritás és relációs konzisztencia | kritikus |
| `NFR-SEC-0001` | Privát hozzáférés és backend oldali jogosultságvédelem | kritikus |
| `NFR-SEC-0002` | Secret- és hitelesítési adatok biztonságos kezelése | kritikus |
| `NFR-MNT-0002` | Automatizált minőségkapu | magas |
| `NFR-USB-0001` | Érthető és egységes hiba-visszajelzés | magas |
| `NFR-USB-0002` | Reszponzív és hozzáférhető ügyfélfelület | magas |
| `NFR-PER-0001` | Elfogadható válaszidő és média-kiszolgálási teljesítmény | magas |
| `NFR-OPS-0001` | Megfigyelhetőség és diagnosztizálhatóság | magas |
| `NFR-REC-0001` | Menthetőség és helyreállíthatóság | kritikus |
| `NFR-DEP-0001` | Reprodukálható build és deployment | magas |
| `NFR-PRV-0001` | Szükséges adatokra korlátozott adatkezelés | közepes |

---

# 1. NFR-MNT-0001 – Karbantartható, rétegzett és moduláris backend szerkezet

- NFR azonosító: `NFR-MNT-0001`
- NFR neve: Karbantartható, rétegzett és moduláris backend szerkezet
- Kategória: `NFR-MNT-xxxx`
- Prioritás: kritikus
- Státusz: elfogadott

## Részletes leírás

A backend kód felelősségi körök szerint legyen rétegezve. A HTTP-kezelés, az üzleti logika, az adatbázis-hozzáférés, a fájltárolás és a biztonsági logika ne keveredjen egyetlen komponensbe.

A rendszer első verziója moduláris monolitként készül. A cél nem a mikroszerviz-komplexitás bevezetése, hanem az, hogy a fő domainterületek és technikai rétegek világosan elkülönüljenek.

Tervezett fő rétegek és felelősségek:

```text
controller   → HTTP kérés/válasz
service      → üzleti szabályok
repository   → adatbázis hozzáférés
storage      → médiafájl elérés
security     → hitelesítés és hozzáférés
dto          → API adatátadás
exception    → konzisztens hibakezelés
```

## Jelenlegi állapot

- az alkalmazás backendje még nem implementált
- a korábbi projektben a rétegzett Spring Boot struktúra már bevált mintaként rendelkezésre áll
- a `09-rendszerterv-es-szolgaltatasarchitektura.md` már rögzíti a rétegzett/moduláris irányt

## Mérési módszer

- kódfelülvizsgálat
- package dependency ellenőrzés
- service unit tesztek
- controller tesztek
- szükség esetén ArchUnit vagy hasonló architektúrateszt később bevezethető

## Sikerességi kritériumok

- a controller réteg nem tartalmaz fájlrendszerkezelést
- a controller réteg nem tartalmaz közvetlen repository-alapú üzleti döntéseket
- médiafájl-műveletek a `MediaStorageService` jellegű absztrakción keresztül történnek
- fő üzleti szabályok service szinten találhatók
- DTO és entity szerepkörök elkülönülnek
- a fő modulok unit teszttel izoláltan ellenőrizhetők

## Sikertelenségi kritériumok

- controller közvetlenül fájlt ír NFS-re
- controller közvetlenül adatbázis-entitásokon hajt végre összetett üzleti logikát
- abszolút storage pathok több, egymástól független service-ben szétszórtan jelennek meg
- egyetlen „god service” kezeli az összes domainterületet

## Technikai specifikáció és megjegyzések

Érintett területek:
- teljes Spring Boot backend
- `client`
- `gallery`
- `media`
- `storage`
- `share`
- `selection`
- `download`
- `security`

## Tesztelési stratégia

- JUnit 5
- Mockito
- MockMvc
- code review
- opcionálisan ArchUnit

## Nyomonkövethetőség

- BR:
  - `BR-DAT-0001`
  - `BR-FNC-0003`
- FR:
  - `FR-AUT-0001`
  - `FR-DAT-0001`
  - `FR-DAT-0002`
  - `FR-MED-0001`
  - `FR-MED-0002`
  - `FR-SHR-0001`
  - `FR-SHR-0002`
  - `FR-WFL-0001`
  - `FR-WFL-0002`
  - `FR-DWN-0001`
- tervezett TR:
  - `TR-ARC-0001`
- tervezett TC:
  - `TC-QLT-0001`

---

# 2. NFR-REL-0001 – Üzleti és storage-konzisztencia megbízható érvényesítése

- NFR azonosító: `NFR-REL-0001`
- NFR neve: Üzleti és storage-konzisztencia megbízható érvényesítése
- Kategória: `NFR-REL-xxxx`
- Prioritás: kritikus
- Státusz: elfogadott

## Részletes leírás

A rendszer az üzleti szabályok vagy tárolási műveletek hibája esetén ne hagyjon észrevétlenül inkonzisztens állapotot.

Különösen fontos a két eltérő tárolási réteg együttműködése:

- CockroachDB: strukturált metaadat és üzleti állapot
- NFS media storage: fizikai kép- és médiafájlok

A rendszernek kezelnie kell azt az esetet, amikor az egyik művelet sikerül, a másik pedig nem.

## Jelenlegi állapot

- infrastruktúra-szinten az NFS írás már validált
- alkalmazásszintű médiafeltöltési tranzakció még nem létezik

## Mérési módszer

Negatív tesztesetek:

- storage nem írható
- adatbázismentés sikertelen
- nem létező galéria
- visszavont share token
- más galériához tartozó média kijelölése
- duplikált selection item

## Sikerességi kritériumok

- storage írási hiba esetén nincs sikeres médiafeltöltési eredmény
- sikertelen adatbázismentés után nem marad normál üzleti állapotként kezelt média
- nem létező galériához média nem kapcsolható
- visszavont megosztási token nem használható
- ugyanaz a média ugyanabba a selectionbe nem kerül duplikáltan
- idegen galéria médiaeleme nem kerülhet selectionbe vagy letöltésre

## Sikertelenségi kritériumok

- adatbázisban aktív médiarekord létezik úgy, hogy a fájl soha nem került sikeresen storage-ra
- más galériából kijelölhető média
- visszavont share link továbbra is működik
- az alkalmazás hibás művelet után `200 OK` jellegű sikert jelez

## Technikai specifikáció és megjegyzések

A pontos kompenzációs vagy tranzakciós stratégia a technikai követelményekben kerül véglegesítésre.

## Tesztelési stratégia

- service unit tesztek
- storage mock
- integrációs tesztek
- CockroachDB tesztkörnyezet
- NFS/storage hibaszimuláció vagy teszt double

## Nyomonkövethetőség

- BR:
  - `BR-PRC-0001`
  - `BR-PRC-0002`
  - `BR-DAT-0001`
- FR:
  - `FR-MED-0001`
  - `FR-MED-0002`
  - `FR-SHR-0001`
  - `FR-SHR-0002`
  - `FR-WFL-0001`
  - `FR-WFL-0002`
  - `FR-DWN-0001`
- tervezett TC:
  - `TC-MED-0003`
  - `TC-WFL-0002`
  - `TC-SEC-0002`

---

# 3. NFR-DAT-0001 – Adatintegritás és relációs konzisztencia

- NFR azonosító: `NFR-DAT-0001`
- NFR neve: Adatintegritás és relációs konzisztencia
- Kategória: `NFR-DAT-xxxx`
- Prioritás: kritikus
- Státusz: elfogadott

## Részletes leírás

A fő domain objektumok közötti relációkat adatbázis- és alkalmazásszinten egyértelműen kell kikényszeríteni.

A minimum relációs szabályok:

- `Gallery` csak létező `Client` rekordhoz tartozhat
- `MediaAsset` csak létező `Gallery` rekordhoz tartozhat
- `GalleryShare` csak létező `Gallery` rekordhoz tartozhat
- `ClientSelection` csak létező `Gallery` rekordhoz tartozhat
- `SelectionItem` csak létező `ClientSelection` és `MediaAsset` kapcsolattal jöhet létre
- egy selection item nem hivatkozhat másik galéria médiájára

## Jelenlegi állapot

- CockroachDB még nincs telepítve a végleges `sql01` VM-re
- végleges JPA entity modell még nincs implementálva

## Mérési módszer

- adatbázis constraint-ek
- repository/integrációs tesztek
- service szintű negatív tesztek
- Flyway migrációk ellenőrzése

## Sikerességi kritériumok

- árva médiarekord nem hozható létre
- árva selection item nem hozható létre
- kötelező relációk megsértése mentési hibát okoz
- Flyway migráció tiszta tesztadatbázison végigfut
- a sémaváltozások reprodukálhatók

## Sikertelenségi kritériumok

- galéria nélküli médiarekord keletkezik
- selection más galéria médiájára mutat
- kézi, dokumentálatlan production sémamódosítás szükséges a normál deployhoz

## Technikai specifikáció és megjegyzések

Tervezett:
- CockroachDB
- Spring Data JPA
- Flyway
- foreign key és unique constraint-ek ott, ahol az üzleti szabály indokolja

## Tesztelési stratégia

- repository integrációs teszt
- CockroachDB kompatibilitási teszt
- Flyway migration test

## Nyomonkövethetőség

- BR:
  - `BR-DAT-0001`
- FR:
  - `FR-DAT-0001`
  - `FR-DAT-0002`
  - `FR-MED-0001`
  - `FR-SHR-0001`
  - `FR-WFL-0001`
  - `FR-WFL-0002`
- tervezett TR:
  - `TR-DAT-0001`
  - `TR-DAT-0002`
- tervezett TC:
  - `TC-DAT-*`
  - `TC-DB-*`

---

# 4. NFR-SEC-0001 – Privát hozzáférés és backend oldali jogosultságvédelem

- NFR azonosító: `NFR-SEC-0001`
- NFR neve: Privát hozzáférés és backend oldali jogosultságvédelem
- Kategória: `NFR-SEC-xxxx`
- Prioritás: kritikus
- Státusz: elfogadott

## Részletes leírás

A rendszer biztonsági modellje két fő hozzáférési formát különböztet meg:

1. belső admin hozzáférés
2. privát ügyfélgaléria-hozzáférés

A hozzáférés ellenőrzése minden esetben backend oldalon történik. A frontend gombok vagy menüpontok elrejtése önmagában nem tekinthető jogosultságvédelemnek.

## Jelenlegi állapot

- alkalmazásszintű security még nincs implementálva
- a rendszerterv már rögzíti, hogy csak a webes belépési pont publikálható

## Mérési módszer

Negatív security tesztek:

- admin endpoint hitelesítés nélkül
- másik gallery ID használata
- érvénytelen share token
- visszavont share token
- más galéria média letöltési kísérlete
- kliensoldali path manipuláció

## Sikerességi kritériumok

- `/api/admin/**` végpontok hitelesítés nélkül nem használhatók
- privát galéria csak érvényes share tokennel érhető el
- más galéria tartalma ID manipulációval nem kérhető le
- fizikai storage path kliensoldalról nem vezérelhető
- CockroachDB, NFS, Proxmox és iLO nincs közvetlen publikus alkalmazásszolgáltatásként kitéve

## Sikertelenségi kritériumok

- más ügyfél galériája az URL ID módosításával elérhető
- admin API frontend autentikáció nélkül közvetlenül használható
- kliens `../../` vagy abszolút path jellegű bemenettel szerverfájlt ér el
- visszavont share token továbbra is privát adatot ad vissza

## Technikai specifikáció és megjegyzések

A konkrét security stack a `05-technikai-kovetelmenyek.md` dokumentumban kerül rögzítésre.

## Tesztelési stratégia

- Spring Security tesztek
- MockMvc
- integrációs API tesztek
- manuális negatív security ellenőrzések

## Nyomonkövethetőség

- BR:
  - `BR-FNC-0002`
  - `BR-PRC-0002`
- FR:
  - `FR-AUT-0001`
  - `FR-SHR-0001`
  - `FR-SHR-0002`
  - `FR-WFL-0001`
  - `FR-DWN-0001`
- tervezett TC:
  - `TC-AUT-*`
  - `TC-SEC-*`
  - `TC-DWN-0002`

---

# 5. NFR-SEC-0002 – Secret- és hitelesítési adatok biztonságos kezelése

- NFR azonosító: `NFR-SEC-0002`
- NFR neve: Secret- és hitelesítési adatok biztonságos kezelése
- Kategória: `NFR-SEC-xxxx`
- Prioritás: kritikus
- Státusz: elfogadott

## Részletes leírás

Az alkalmazás és deployment során használt titkok nem kerülhetnek a forráskód repository-ba egyszerű szövegként.

Ide tartozik különösen:

- admin jelszó
- adatbázis jelszó
- production secret
- registry hozzáférési adat
- deployment token
- session/JWT aláíró kulcs, ha ilyen technika kerül kiválasztásra

## Jelenlegi állapot

- production alkalmazáskonfiguráció még nincs
- CI/CD még nincs létrehozva az új projektben

## Mérési módszer

- repository review
- secret scanning, ha elérhető
- deployment konfiguráció ellenőrzése
- CI secret használat ellenőrzése

## Sikerességi kritériumok

- `.env.production` nincs commitolva
- repository csak `.env.example` vagy dokumentált változóneveket tartalmaz
- GitHub Actions secret értékek GitHub Secrets/Environment mechanizmusból származnak
- adatbázis-jelszó nem hardcode-olt Java/TypeScript fájlban
- admin jelszó biztonságos hash formában tárolódik

## Sikertelenségi kritériumok

- jelszó vagy token nyíltan szerepel Git commitban
- production adatbázis credential forráskódban található
- pipeline log kiír érzékeny secret értéket

## Technikai specifikáció és megjegyzések

Érintett:
- Spring konfiguráció
- Docker Compose
- GitHub Actions
- CockroachDB
- Caddy
- self-hosted runner

## Tesztelési stratégia

- code review
- CI configuration review
- optional secret scanner

## Nyomonkövethetőség

- BR:
  - `BR-OPS-0001`
  - `BR-FNC-0002`
- FR:
  - `FR-AUT-0001`
- tervezett TR:
  - `TR-SEC-0001`
  - `TR-DEP-0001`
- tervezett TC:
  - `TC-SEC-0003`

---

# 6. NFR-MNT-0002 – Automatizált minőségkapu

- NFR azonosító: `NFR-MNT-0002`
- NFR neve: Automatizált minőségkapu
- Kategória: `NFR-MNT-xxxx`
- Prioritás: magas
- Státusz: elfogadott

## Részletes leírás

A backend és frontend projekt állapota automatizáltan ellenőrizhető legyen. A fő branchre kerülő változtatás ne függjön kizárólag manuális ellenőrzéstől.

## Jelenlegi állapot

- a korábbi projektben Maven quality tooling és GitHub Actions már sikeresen használt minta
- az új BTPhoto repository még nem jött létre

## Mérési módszer

Backend:
- `mvn clean verify`

Frontend:
- typecheck
- lint
- test
- production build

CI:
- GitHub Actions workflow státusz

## Sikerességi kritériumok

- backend build sikeres
- JUnit tesztek sikeresek
- JaCoCo lefut
- Checkstyle lefut
- SpotBugs lefut
- frontend TypeScript ellenőrzés sikeres
- frontend lint/build sikeres
- kritikus teszt sikertelensége esetén a workflow piros
- production image csak sikeres quality gate után készül

## Sikertelenségi kritériumok

- teszthiba ellenére sikeres CI
- `main` változás ellenőrzés nélkül deployolható normál folyamatban
- lokális és CI build lényegesen eltérő lépéseket használ

## Kezdeti coverage cél

A korábbi projekt mintájából kiinduló **kezdeti célérték**, nem abszolút minőségi garancia:

- line coverage: legalább 80% a fő üzleti/service logikára
- branch coverage: legalább 55%

A coverage cél a megvalósítás során felülvizsgálható. A cél nem mesterséges százaléknövelés, hanem a kritikus üzleti szabályok tényleges tesztelése.

## Tesztelési stratégia

- GitHub Actions
- Maven verify
- frontend CI
- PR quality gate

## Nyomonkövethetőség

- BR:
  - `BR-OPS-0001`
  - `BR-DAT-0001`
- US:
  - `US-0011`
- tervezett TR:
  - `TR-DEV-0001`
  - `TR-DEV-0002`
- tervezett TC:
  - `TC-QLT-0002`

---

# 7. NFR-USB-0001 – Érthető és egységes hiba-visszajelzés

- NFR azonosító: `NFR-USB-0001`
- NFR neve: Érthető és egységes hiba-visszajelzés
- Kategória: `NFR-USB-xxxx`
- Prioritás: magas
- Státusz: elfogadott

## Részletes leírás

A rendszer a hibákat konzisztens, a kliens által értelmezhető formában adja vissza. A végfelhasználói felületen technikai stack trace vagy nyers belső hiba ne jelenjen meg.

Megkülönböztetendő legalább:

- input validáció
- hitelesítési hiba
- jogosultsági hiba
- hiányzó erőforrás
- üzleti szabálysértés
- konfliktus/duplikáció
- storage hiba
- általános belső hiba

## Jelenlegi állapot

- egységes BTPhoto hibaformátum még nincs
- a korábbi projektben `GlobalExceptionHandler` minta már rendelkezésre állt

## Mérési módszer

- negatív MockMvc/API tesztek
- frontend hibaállapot tesztek
- manuális UI ellenőrzés

## Sikerességi kritériumok

- 404 és üzleti konfliktus megkülönböztethető
- jogosultsági hiba nem jelenik meg általános `500` hibaként
- storage hiba kontrollált alkalmazáshibává alakul
- frontend emberi nyelvű visszajelzést tud megjeleníteni
- válasz nem tartalmaz abszolút NFS pathot vagy stack trace-t

## Sikertelenségi kritériumok

- minden negatív eset `500 Internal Server Error`
- frontend nyers Java exception szöveget jelenít meg
- belső `/srv/...` path publikus hibaüzenetben szerepel

## Technikai specifikáció és megjegyzések

Tervezett:
- `GlobalExceptionHandler`
- egységes error response DTO
- frontend error mapping

## Tesztelési stratégia

- MockMvc
- integrációs API teszt
- frontend component/E2E teszt

## Nyomonkövethetőség

- FR:
  - minden publikus és admin FR
- tervezett TR:
  - `TR-ARC-0001`
- tervezett TC:
  - `TC-API-*`

---

# 8. NFR-USB-0002 – Reszponzív és hozzáférhető ügyfélfelület

- NFR azonosító: `NFR-USB-0002`
- NFR neve: Reszponzív és hozzáférhető ügyfélfelület
- Kategória: `NFR-USB-xxxx`
- Prioritás: magas
- Státusz: elfogadott

## Részletes leírás

Az ügyféloldali galéria elsődlegesen vizuális szolgáltatás, ezért asztali és mobil eszközön egyaránt kényelmesen használhatónak kell lennie.

A pontos vizuális rendszer a frissítendő `08-ui-ux-terv.md` dokumentumban kerül kidolgozásra.

## Jelenlegi állapot

- a jelenlegi `08-ui-ux-terv.md` még a korábbi kávés projekthez tartozik
- a BTPhoto vizuális irány a megadott artisan/Lovable inspiráció alapján már magas szinten definiált

## Mérési módszer

Legalább az alábbi viewportok manuális vagy automatizált ellenőrzése:

- kb. 390 px mobil szélesség
- kb. 768 px tablet szélesség
- legalább 1280 px desktop szélesség

Hozzáférhetőségi ellenőrzés:
- billentyűzetes fókusz
- alt szöveg
- form label
- kontraszt
- állapotok ne csak színnel kommunikáljanak

## Sikerességi kritériumok

- nincs szükség horizontális oldal-scrollra normál mobilnézetben
- galériakártyák és lightbox mobilon kezelhetők
- kiválasztási állapot nem csak színnel jelzett
- interaktív elemek billentyűzettel elérhetők
- képek értelmes alt vagy megfelelő dekoratív kezelés mellett jelennek meg
- űrlaphibák szövegesen is közöltek

## Sikertelenségi kritériumok

- ügyfél mobilon nem tud kiválasztani vagy véglegesíteni
- fontos gomb csak hoverrel használható
- fókuszjelzés nem látható
- a vizuális állapot csak színkülönbséggel kommunikál

## Technikai specifikáció és megjegyzések

Tervezett:
- React
- Tailwind CSS
- shadcn/ui
- responsive grid
- accessible dialog/lightbox komponensek

## Tesztelési stratégia

- böngésző manuális responsive teszt
- Playwright E2E
- opcionálisan axe accessibility ellenőrzés

## Nyomonkövethetőség

- BR:
  - `BR-FNC-0002`
  - `BR-PRC-0002`
- FR:
  - `FR-SHR-0002`
  - `FR-WFL-0001`
  - `FR-WFL-0002`
  - `FR-DWN-0001`
- tervezett TC:
  - `TC-UI-*`
  - `TC-E2E-*`

---

# 9. NFR-PER-0001 – Elfogadható válaszidő és média-kiszolgálási teljesítmény

- NFR azonosító: `NFR-PER-0001`
- NFR neve: Elfogadható válaszidő és média-kiszolgálási teljesítmény
- Kategória: `NFR-PER-xxxx`
- Prioritás: magas
- Státusz: tervezet

## Részletes leírás

A rendszer célja kisvállalkozási/szakdolgozati léptékű fotós szolgáltatás, nem tömeges SaaS platform. A teljesítménycélokat ezért a tényleges hardver és a privát infrastruktúra képességeihez kell igazítani.

A nagy felbontású eredeti képek közvetlen kiszolgálása minden galériakártyán kerülendő; a későbbi preview/thumbnail réteg teljesítmény-optimalizálási eszköz.

## Jelenlegi állapot

- alkalmazásszintű teljesítménymérés még nincs
- Proxmox host CPU stresszteszt és ZFS scrub sikeresen megtörtént
- NFS storage funkcionálisan validált

## Mérési módszer

Külön kell mérni:

1. metaadat/API válaszidőt
2. média/preview kiszolgálást
3. upload sebességet
4. külső internetkapcsolat hatását

Kezdeti laborcél kontrollált LAN környezetben:

- egyszerű, nem média-streamelő API-k p95 válaszideje: célérték legfeljebb 500 ms
- tipikus admin lista API p95: célérték legfeljebb 800 ms
- első ügyfélgaléria metaadat-válasz: célérték legfeljebb 1 s
- legalább 5 párhuzamos tipikus felhasználói kérés hibamentesen kiszolgálható

Ezek **kezdeti tervezési célok**, nem már teljesített mérési eredmények.

## Sikerességi kritériumok

- az MVP alapfolyamatai interaktív használat mellett érzékelhető indokolatlan késleltetés nélkül működnek
- média thumbnail/preview bevezetése után a galériagrid nem eredeti RAW/nagy JPEG fájlokat tölt alapból
- terhelés alatt nem keletkezik adatkonzisztencia-hiba
- teljesítménymérés reprodukálható tesztforgatókönyvvel dokumentált

## Sikertelenségi kritériumok

- egyszerű admin műveletek másodperceken át válasz nélkül maradnak normál LAN környezetben
- minden galériakártya teljes eredeti fájlt tölt
- néhány párhuzamos kérés alkalmazáshibát okoz

## Technikai specifikáció és megjegyzések

A külső ügyfélélményt az otthoni internet feltöltési sávszélessége is befolyásolja. Ezt külön kell kezelni az alkalmazás belső teljesítményétől.

## Tesztelési stratégia

- k6/JMeter vagy más könnyű HTTP terhelési teszt
- böngésző Network mérés
- Actuator metrikák
- storage átvitelmérés

## Nyomonkövethetőség

- BR:
  - `BR-PRC-0001`
  - `BR-FNC-0002`
- FR:
  - `FR-MED-0001`
  - `FR-MED-0002`
  - `FR-SHR-0002`
- tervezett TC:
  - `TC-PER-*`

---

# 10. NFR-OPS-0001 – Megfigyelhetőség és diagnosztizálhatóság

- NFR azonosító: `NFR-OPS-0001`
- NFR neve: Megfigyelhetőség és diagnosztizálhatóság
- Kategória: `NFR-OPS-xxxx`
- Prioritás: magas
- Státusz: elfogadott

## Részletes leírás

A rendszerüzemeltető képes legyen elkülöníteni legalább az alábbi hibaforrásokat:

- backend alkalmazás
- CockroachDB kapcsolat
- média storage elérés
- reverse proxy
- konténerállapot

Az MVP-nek nem kell teljes enterprise monitoring stack, de a fő szolgáltatásállapotok diagnosztizálhatók legyenek.

## Jelenlegi állapot

- Proxmox infrastruktúra monitorozható
- alkalmazásszintű health és logolás még nincs

## Mérési módszer

- Actuator health
- Docker healthcheck
- strukturált alkalmazáslog
- `docker compose ps`
- `docker compose logs`
- manuális CockroachDB ellenőrzés
- NFS mount és írás ellenőrzés

## Sikerességi kritériumok

- backend health állapot lekérdezhető
- storage elérhetetlenség felismerhető
- DB kapcsolat problémája diagnosztizálható
- container unhealthy állapot elkülöníthető
- logok timestampet és megfelelő logszintet tartalmaznak
- secret vagy jelszó nem kerül normál logba

## Sikertelenségi kritériumok

- minden hiba azonos, kontextus nélküli üzenet
- nem állapítható meg, hogy DB vagy storage hiba történt
- alkalmazáslog jelszót vagy access tokent tartalmaz

## Technikai specifikáció és megjegyzések

MVP:
- Spring Boot Actuator
- Docker healthcheck
- Caddy access/error log
- strukturált backend log

POST-MVP:
- Prometheus
- Grafana
- központi loggyűjtés

## Tesztelési stratégia

- health endpoint teszt
- függőség-leállításos manuális teszt
- deploy smoke test

## Nyomonkövethetőség

- BR:
  - `BR-OPS-0001`
- US:
  - `US-0012`
- tervezett TR:
  - `TR-OPS-0001`
- tervezett TC:
  - `TC-OPS-*`

---

# 11. NFR-REC-0001 – Menthetőség és helyreállíthatóság

- NFR azonosító: `NFR-REC-0001`
- NFR neve: Menthetőség és helyreállíthatóság
- Kategória: `NFR-REC-xxxx`
- Prioritás: kritikus
- Státusz: elfogadott

## Részletes leírás

A rendszer kritikus komponenseiről mentés készíthető legyen, és legalább a szakdolgozati demonstráció során bizonyított helyreállítási eljárással rendelkezzen.

A rendszer több külön mentési rétegből áll:

1. Proxmox VM backup
2. CockroachDB adatbázis-szintű backup
3. médiafájl backup

## Jelenlegi állapot

Már validált:
- Proxmox VM backup
- VM restore
- snapshot
- `nas-backup` NFS storage

Még kialakítandó:
- `docker01` végleges backup/restore
- `sql01` végleges backup/restore
- CockroachDB logikai backup/restore
- média offsite/fizikailag független másodpéldány

## Mérési módszer

Minimum demonstráció:

- `docker01` vagy teszt megfelelőjének VM restore-ja
- `sql01` VM restore
- CockroachDB adatbázis visszaállítása tesztkörnyezetbe
- médiafájl visszaállításának tesztje

## Sikerességi kritériumok

- VM mentés dokumentáltan létrehozható
- VM restore dokumentáltan működik
- adatbázis backup külön artifactként rendelkezésre áll
- adatbázis restore teszt legalább egyszer sikeresen végrehajtható
- médiafájl mentési helye és eljárása dokumentált
- helyreállítás után az alkalmazás konzisztens adatokat lát

## Sikertelenségi kritériumok

- backup létezik, de restore soha nincs tesztelve
- adatbázis csak a VM snapshotra támaszkodik minden helyreállítási forgatókönyvben
- média backup ugyanazon fizikai lemezkészlet egyetlen példánya, és ezt teljes értékű disaster recoveryként kezeljük

## Korlátozás

A jelenlegi MicroServeren található `media` és `backup` storage nem jelent földrajzilag vagy fizikailag teljesen független katasztrófavédelmi mentést.

## Tesztelési stratégia

- dokumentált restore próba
- checksum/fájlellenőrzés
- alkalmazásszintű smoke test restore után

## Nyomonkövethetőség

- BR:
  - `BR-OPS-0001`
- US:
  - `US-0012`
- tervezett TR:
  - `TR-BCK-0001`
- tervezett TC:
  - `TC-REC-*`

---

# 12. NFR-DEP-0001 – Reprodukálható build és deployment

- NFR azonosító: `NFR-DEP-0001`
- NFR neve: Reprodukálható build és deployment
- Kategória: `NFR-DEP-xxxx`
- Prioritás: magas
- Státusz: elfogadott

## Részletes leírás

Az alkalmazás buildje és production telepítése verziózott forrásból és dokumentált pipeline-ból ismételhető legyen.

A production szerveren végrehajtott ad-hoc kézi módosítás ne legyen a normál fejlesztési és telepítési folyamat része.

## Jelenlegi állapot

- korábbi projektben GitHub Actions és Docker pipeline minta már rendelkezésre áll
- BTPhoto repository és pipeline még nincs implementálva

## Mérési módszer

- clean checkout build
- GitHub Actions
- Docker image digest/tag
- production deploy workflow
- post-deploy health check

## Sikerességi kritériumok

- ugyanabból a commitból azonos verzióazonosítójú artifact építhető
- production image commit SHA-val visszakövethető
- deploy registry image-ből történik
- secret nem része az image-nek
- deploy után health/smoke check fut
- sikertelen quality gate után nincs automatikus production release

## Sikertelenségi kritériumok

- production csak egy fejlesztő lokális gépéről kézzel összerakott állapotból működik
- image nem vezethető vissza commitra
- szerveren kézzel módosított kódfájl szükséges a normál működéshez

## Technikai specifikáció és megjegyzések

Tervezett:
- GitHub Actions
- GHCR
- Docker Compose
- self-hosted runner `docker01`-en
- GitHub Environment approval

## Tesztelési stratégia

- clean build
- staging/smoke deploy
- workflow log review

## Nyomonkövethetőség

- BR:
  - `BR-OPS-0001`
- US:
  - `US-0011`
  - `US-0012`
- tervezett TR:
  - `TR-DEP-0001`
  - `TR-DEV-0002`
- tervezett TC:
  - `TC-QLT-*`
  - `TC-DEP-*`

---

# 13. NFR-PRV-0001 – Szükséges adatokra korlátozott adatkezelés

- NFR azonosító: `NFR-PRV-0001`
- NFR neve: Szükséges adatokra korlátozott adatkezelés
- Kategória: `NFR-PRV-xxxx`
- Prioritás: közepes
- Státusz: tervezet

## Részletes leírás

Az alkalmazás az MVP funkcióihoz szükséges ügyféladatokat kezelje, és ne gyűjtsön indokolatlan profil- vagy technikai adatot.

Ez a követelmény műszaki tervezési elv, nem teljes jogi megfelelőségi specifikáció.

## Jelenlegi állapot

- az ügyfélmodell még nincs implementálva
- a `03` dokumentum szerint az első ügyfélmodell minimális

## Mérési módszer

- entity/DTO review
- logging review
- UI form review

## Sikerességi kritériumok

- ügyfél létrehozáskor csak az üzleti folyamathoz szükséges minimumadatok kötelezők
- publikus DTO-k nem tartalmaznak belső technikai adatokat
- secret/token nem logolódik
- a share URL használata nem igényel indokolatlan ügyfélprofil létrehozást az MVP-ben

## Sikertelenségi kritériumok

- ügyfélgaléria megtekintéséhez szükségtelen személyes mezők kötelezők
- belső adatbázis- vagy storage-információ kerül publikus API válaszba
- logok teljes hozzáférési tokeneket vagy hitelesítési adatokat tartalmaznak

## Tesztelési stratégia

- code review
- API response review
- log review

## Nyomonkövethetőség

- BR:
  - `BR-FNC-0002`
  - `BR-PRC-0002`
- FR:
  - `FR-DAT-0001`
  - `FR-SHR-0002`
- tervezett TC:
  - `TC-PRV-*`

---

# 14. Nem célzott minőségi követelmények az MVP-ben

Az alábbi tulajdonságok jelenleg **nem** tartoznak az MVP kötelező követelményei közé:

- 99,99% rendelkezésre állás
- földrajzilag redundáns infrastruktúra
- automatikus Proxmox HA failover
- többnode-os CockroachDB HA
- több ezer párhuzamos felhasználó
- globális CDN
- teljes SIEM rendszer
- teljes körű APM platform
- automatikus horizontális skálázás
- teljes jogi/compliance audit automatizálása

Ezek hiánya nem hiba, hanem a projektmérethez igazított tudatos scope-döntés.

---

# 15. Keresztkapcsolatok az első implementációs szelethez

Az első vertikális implementációs szelet:

```text
FR-AUT-0001
FR-DAT-0001
FR-DAT-0002
FR-MED-0001
FR-MED-0002
```

Ehhez kötelezően releváns NFR-ek:

```text
NFR-MNT-0001   rétegzett szerkezet
NFR-REL-0001   konzisztencia
NFR-DAT-0001   adatintegritás
NFR-SEC-0001   admin védelem
NFR-SEC-0002   secret kezelés
NFR-MNT-0002   quality gate
NFR-USB-0001   hibakezelés
NFR-PER-0001   kezdeti teljesítmény baseline
NFR-OPS-0001   health/diagnosztika
NFR-DEP-0001   reprodukálható build
```

Ez azért fontos, mert az első működő feature már ne csak funkcionálisan működjön, hanem a végleges rendszer minőségi alapelveit is kövesse.

---

# 16. Nyitott nem funkcionális döntések

A következő pontokat a `05-technikai-kovetelmenyek.md` kidolgozásakor kell véglegesíteni:

1. admin auth session vagy JWT/token alapú legyen-e
2. pontos jelszóhash-algoritmus és security policy
3. CockroachDB TLS mikortól kötelező
4. self-hosted runner jogosultsági modellje
5. production secret tárolás pontos módja
6. preview generálás technológiája
7. média streamelést a backend vagy reverse proxy optimalizálja-e
8. pontos teljesítményteszt-eszköz
9. pontos logformátum
10. external/offsite backup cél

---

# 17. Szakirodalmi háttér

[1] Bass, L. – Clements, P. – Kazman, R.: *Software Architecture in Practice*. 4th Edition. Addison-Wesley Professional, 2021.

[2] Sommerville, I.: *Software Engineering*. 10th Edition. Pearson, 2015.

[3] Wiegers, K. E. – Beatty, J.: *Software Requirements*. 3rd Edition. Microsoft Press, 2013.

[4] Humble, J. – Farley, D.: *Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation*. Addison-Wesley Professional, 2010.

[5] Nygard, M. T.: *Release It!: Design and Deploy Production-Ready Software*. 2nd Edition. The Pragmatic Bookshelf, 2018.

[6] Kleppmann, M.: *Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*. O’Reilly Media, 2017.

[7] Nemeth, E. – Snyder, G. – Hein, T. R. – Whaley, B. – Mackin, D.: *UNIX and Linux System Administration Handbook*. 5th Edition. Addison-Wesley Professional, 2017.

[8] Crispin, L. – Gregory, J.: *Agile Testing: A Practical Guide for Testers and Agile Teams*. Addison-Wesley Professional, 2009.

---

# 18. Következő lépés

A következő dokumentum a `05-technikai-kovetelmenyek.md`.

Abban már konkrét technológiai döntéseket kell rögzíteni, többek között:

```text
TR-TCH-0001  Java 21 + Spring Boot 3
TR-TCH-0002  React + TypeScript + Vite
TR-ARC-0001  moduláris rétegzett monolit
TR-DAT-0001  CockroachDB + PostgreSQL JDBC + JPA
TR-DAT-0002  Flyway séma migráció
TR-STO-0001  NFSv4 media storage + storage abstraction
TR-SEC-0001  Spring Security
TR-DEV-0001  JUnit 5 + Mockito + MockMvc
TR-DEV-0002  JaCoCo + Checkstyle + SpotBugs
TR-DEP-0001  Docker + GitHub Actions + GHCR
TR-OPS-0001  Caddy + Actuator + healthcheck
TR-AI-0001   VS Code + Codex fejlesztési workflow
TR-DOC-0001  verziózott docs + traceability
```

A technikai követelmények kidolgozásakor külön kell választani a már elfogadott döntéseket azoktól, amelyek még nyitottak.
