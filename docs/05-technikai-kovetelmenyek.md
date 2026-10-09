# Technikai követelmények

**Dokumentum státusza:** fejlesztési baseline v0.1  
**Projekt:** BTPhoto Private Cloud  
**Baseline azonosító:** `BTPC-BL-2026-09-13-v0.1`  
**Baseline dátuma:** `2026-09-13`

**Kapcsolódó dokumentumok:**
- `01-uzleti-kovetelmenyek.md`
- `02-epicek-es-user-storyk.md`
- `03-funkcionalis-kovetelmenyek.md`
- `04-nem-funkcionalis-kovetelmenyek.md`
- `06-teszteset-gyujtemeny.md`
- `07-nyomonkovethetosegi-matrix.md`
- `08-ui-ux-terv.md`
- `09-rendszerterv-es-szolgaltatasarchitektura.md`

A dokumentum a BTPhoto Private Cloud megvalósításához szükséges technikai döntéseket rögzíti. A cél nem minden konfigurációs paraméter előzetes meghatározása, hanem az alkalmazás technológiai alapjainak, architekturális korlátainak, fejlesztési eszközeinek, futtatási környezetének és minőségkapuinak egyértelmű definiálása.

A dokumentum a korábbi sikeres projekt technikai követelményeinek szerkezetét követi: minden technikai döntéshez tartozik azonosító, státusz, prioritás, indoklás, alternatíva, kockázat, architektúrakapcsolat, verifikáció és nyomonkövethetőség.

---

# TR összefoglaló

| TR | Megnevezés | Státusz | Prioritás |
| --- | --- | --- | --- |
| `TR-INF-0001` | Két virtuális gépes alkalmazás-topológia | elfogadott | kritikus |
| `TR-NET-0001` | Elkülönített menedzsment-, storage- és belső DB-hálózat | tervezet | magas |
| `TR-TCH-0001` | Java 21 + Spring Boot 3 backend | elfogadott | kritikus |
| `TR-TCH-0002` | Astro 7 + TypeScript frontend | elfogadott | kritikus |
| `TR-ARC-0001` | Moduláris rétegzett monolit | elfogadott | kritikus |
| `TR-DAT-0001` | CockroachDB relációs perzisztencia | elfogadott | kritikus |
| `TR-DAT-0002` | Flyway verziózott adatbázis-migráció | elfogadott | kritikus |
| `TR-STO-0001` | NFSv4 média storage + storage abstraction | elfogadott | kritikus |
| `TR-SEC-0001` | Spring Security alapú backend védelem | elfogadott | kritikus |
| `TR-DEV-0001` | JUnit 5 + Mockito + MockMvc tesztstack | elfogadott | kritikus |
| `TR-DEV-0002` | JaCoCo + Checkstyle + SpotBugs quality gate | elfogadott | magas |
| `TR-DEV-0003` | CockroachDB integrációs tesztkörnyezet | tervezet | magas |
| `TR-DEP-0001` | Docker + Docker Compose production futtatás | elfogadott | kritikus |
| `TR-DEP-0002` | GitHub Actions + GHCR CI/CD | elfogadott | kritikus |
| `TR-OPS-0001` | Caddy reverse proxy és HTTPS belépési pont | elfogadott | magas |
| `TR-OPS-0002` | Spring Boot Actuator és container healthcheck | elfogadott | magas |
| `TR-BCK-0001` | Többrétegű backup és restore | elfogadott | kritikus |
| `TR-AI-0001` | Visual Studio Code + Codex fejlesztési workflow | elfogadott | magas |
| `TR-DOC-0001` | Verziózott követelmény- és architektúradokumentáció | elfogadott | magas |

---

# 1. TR-INF-0001 – Két virtuális gépes alkalmazás-topológia

- TR azonosító: `TR-INF-0001`
- TR neve: Két virtuális gépes alkalmazás-topológia
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

A BTPhoto alkalmazás szolgáltatásai két dedikált Proxmox virtuális gépre kerülnek:

- `docker01` – alkalmazás- és konténerfuttató VM
- `sql01` – CockroachDB adatbázis VM

A médiafájlok nem e két VM egyikének lokális rendszerlemezén tárolódnak, hanem a külön `nas01` MicroServer NFSv4 media storage-án.

## Indoklás és támogatott üzleti cél

A szétválasztás lehetővé teszi:

- az adatbázis és az alkalmazás külön erőforrás-kezelését
- eltérő backup/restore stratégiát
- tisztább hibakeresést
- későbbi skálázási lehetőséget
- a médiafájlok életciklusának leválasztását az alkalmazás VM-ről

Támogatott üzleti célok:
- `BR-OPS-0001`
- `BR-DAT-0001`
- `BR-PRC-0001`

## Kockázatok és limitációk

- több VM több üzemeltetési feladatot jelent
- `sql01` single-node CockroachDB esetén továbbra is egyetlen adatbázis-node
- régebbi fizikai hoston az erőforrásokat mérések alapján kell finomhangolni

## Alternatívák

- A1: minden szolgáltatás egy VM-en  
  Nem választottuk, mert az adatbázis, az alkalmazás és a deployment életciklusának szétválasztása fontos tervezési cél.

- A2: minden komponens külön VM-en  
  Nem választottuk, mert az MVP méretéhez túlzott infrastruktúra-komplexitást okozna.

## Architektúra kapcsolat

```text
pve01
├── docker01
├── sql01
└── nas01 (külön fizikai MicroServer)
```

## Technikai specifikáció és megjegyzések

Kezdeti méretezési irány:

`docker01`
- 4–6 vCPU
- 8–12 GB RAM
- 50–80 GB rendszerlemez

`sql01`
- 4 vCPU
- kb. 8 GB RAM
- 50–80 GB adatbázislemez

A végleges erőforrások nem követelmények; terhelési és üzemeltetési mérés alapján módosíthatók.

## Tesztelhetőség és verifikáció

- mindkét VM külön elérhető
- `docker01` hálózaton eléri `sql01` szolgáltatását
- `docker01` eléri a média NFS storage-t
- egyik VM újraindítása sem írja felül a másik VM lokális állapotát

## Nyomonkövethetőség

- BR: `BR-OPS-0001`, `BR-DAT-0001`
- NFR: `NFR-REC-0001`, `NFR-DEP-0001`
- kapcsolódó TR: `TR-NET-0001`, `TR-DAT-0001`, `TR-DEP-0001`

---

# 2. TR-NET-0001 – Elkülönített menedzsment-, storage- és belső DB-hálózat

- TR azonosító: `TR-NET-0001`
- TR neve: Elkülönített menedzsment-, storage- és belső DB-hálózat
- Státusz: tervezet
- Prioritás: magas

## Részletes leírás

A rendszer három logikai forgalmi területet különít el:

1. menedzsment / normál LAN
2. storage hálózat
3. alkalmazás–adatbázis belső hálózat

Már megvalósított:
- `192.168.50.0/24` – menedzsment/LAN
- `192.168.60.0/24` – storage

Tervezett:
- külön, fizikai uplink nélküli Proxmox bridge az alkalmazás és adatbázis közötti kommunikációhoz
- javasolt tartomány: `10.20.0.0/24`

## Indoklás és támogatott üzleti cél

- CockroachDB ne a publikus/felhasználói LAN-on legyen az alkalmazás elsődleges DB-végpontja
- NFS forgalom elkülönüljön a normál kliensforgalomtól
- egyszerűbb legyen a biztonsági határok értelmezése

## Kockázatok és limitációk

- további interfészek és route-ok növelik a hálózati konfiguráció komplexitását
- a pontos IP-címek még nem véglegesek

## Alternatívák

- A1: minden VM egyetlen `vmbr0` bridge-en  
  Egyszerűbb lenne, de kevésbé tiszta szeparációt biztosít.

## Architektúra kapcsolat

```text
vmbr0 → management / LAN
vmbr1 → NFS storage
vmbr2 → docker01 ↔ sql01 belső DB kommunikáció
```

## Technikai specifikáció és megjegyzések

A `vmbr2`:
- fizikai bridge-port nélkül készülhet
- gateway nélkül használható
- csak a szükséges VM-ek kapnak rajta interfészt

## Tesztelhetőség és verifikáció

- `docker01` eléri `sql01` DB portját
- normál LAN-ról a DB port nem szükséges az alkalmazás működéséhez
- `docker01` storage interfészéről `nas01` elérhető
- nincs felesleges default gateway a storage/DB hálózatokon

## Nyomonkövethetőség

- NFR: `NFR-SEC-0001`
- kapcsolódó TR: `TR-INF-0001`, `TR-DAT-0001`, `TR-STO-0001`

---

# 3. TR-TCH-0001 – Java 21 + Spring Boot 3 backend

- TR azonosító: `TR-TCH-0001`
- TR neve: Java 21 + Spring Boot 3 backend
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

A backend Java 21 és Spring Boot 3.x alapon készüljön Maven buildrendszerrel.

Tervezett fő Spring komponensek:
- Spring Web
- Spring Security
- Spring Data JPA
- Bean Validation
- Spring Boot Actuator

## Indoklás és támogatott üzleti cél

A technológia illeszkedik:
- a korábbi sikeresen megvalósított projekthez
- a rétegzett backend architektúrához
- a CockroachDB PostgreSQL-kompatibilis klienskapcsolatához
- a Maven alapú quality toolinghoz

## Kockázatok és limitációk

- JPA/CockroachDB kompatibilitást integrációs teszttel kell validálni
- a Spring Boot verziót nem szabad indokolatlanul frissíteni feature fejlesztés közben

## Alternatívák

- A1: más Java framework  
  Nem választottuk, mert a projektminta és a meglévő fejlesztési tapasztalat Spring Boot alapú.

- A2: Node.js backend  
  Nem választottuk, mert megszakítaná a korábbi Java/Spring projekt újrahasznosítható fejlesztési mintáit.

## Architektúra kapcsolat

Backend modul:
```text
backend/
└── src/main/java/...
```

## Technikai specifikáció és megjegyzések

Build:
- Maven

Java:
- 21 LTS

Konfiguráció:
- environment variable és Spring profile alapú
- production secret nem kerülhet repository-ba

## Tesztelhetőség és verifikáció

- `mvn test`
- `mvn clean verify`
- alkalmazás context teszt
- health endpoint

## Nyomonkövethetőség

- BR: `BR-FNC-0001`, `BR-PRC-0001`, `BR-PRC-0002`
- NFR: `NFR-MNT-0001`, `NFR-MNT-0002`
- US: `US-0001`–`US-0012`

---

# 4. TR-TCH-0002 – Astro 7 + TypeScript frontend

- TR azonosító: `TR-TCH-0002`
- TR neve: Astro 7 + TypeScript frontend
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

A webes frontend Astro 7 és TypeScript alapon készüljön. Az Astro statikus kimenete legyen az alapértelmezett; kliensoldali JavaScript csak az interaktív részekhez kerüljön a böngészőbe.

Elfogadott UI stack:
- Astro 7
- TypeScript
- Tailwind CSS
- Astro komponensek
- minimális natív kliensoldali TypeScript
- Vitest + jsdom
- ESLint + `eslint-plugin-astro`
- `@astrojs/check`

## Indoklás és támogatott üzleti cél

A fotós galéria kép- és tartalomközpontú rendszer, amelyben a legtöbb oldal szerkezete statikusan is előállítható, miközben a proofing, lightbox, upload és admin műveletek célzott kliensoldali interakciót igényelnek. Az Astro/TypeScript stack támogatja:
- a statikus HTML-alapú, kis kliensoldali JavaScript-terhelésű oldalakat;
- a reszponzív Astro komponenseket;
- a gallery grid és lightbox fokozatos interaktivizálását;
- a proofing és admin állapotok célzott kliensoldali kezelését;
- a jól típusozott, központosított API klienst;
- a statikus kimenet Caddy mögötti egyszerű kiszolgálását.

A vizuális irány a `docs/08-ui-ux-terv.md` dokumentumban rögzített, a `szabolcskatona.hu` oldal által inspirált ipari-editoriális rendszerhez igazodik. A világos és sötét témának azonos funkciókészletet kell nyújtania.

## Kockázatok és limitációk

- a kliensoldali interakciókat nem szabad indokolatlanul teljes oldalra kiterjeszteni
- összetett admin állapotkezelésnél később célzott Astro island vagy UI-integráció válhat szükségessé
- a design systemet konzisztensen kell használni
- nagy fotók közvetlen renderelése teljesítményproblémát okozhat

## Alternatívák

- A1: React SPA
  Erős kliensoldali alkalmazásmodellt adna, de a teljes oldalra kiterjedő futtatókörnyezet a statikus és képcentrikus nézetekhez indokolatlan többlet lehet.
- A2: server-side rendered Thymeleaf
  Egyszerűbb backendintegrációt adna, de a külön telepíthető, önálló frontend és a tervezett galériaélmény szempontjából kevésbé illeszkedik.

## Architektúra kapcsolat

```text
frontend/
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── api/
│   ├── lib/
│   ├── scripts/
│   └── styles/
├── astro.config.mjs
└── package.json
```

## Technikai specifikáció és megjegyzések

A frontend:
- nem tartalmaz közvetlen adatbázis-logikát
- kizárólag backend API-n keresztül ér el üzleti adatot
- admin és public gallery route-okat különít el
- a világos/sötét témát design tokenekből állítja elő
- első látogatáskor a rendszer színsémáját követi, a felhasználói választást pedig lokálisan megőrzi
- minden lényegi animációnál támogatja a `prefers-reduced-motion` beállítást
- a koordinátakurzor csak `(pointer: fine)` és `(hover: hover)` környezetben aktiválódik, és kizárólag sikeres inicializálás után váltja le a natív kurzort
- a dekoratív hullám és scroll-kapcsolt mozgás natív canvas/CSS/TypeScript megoldás; nem vezet be animációs vagy WebGL-függőséget
- az animációs ciklus rejtett dokumentumnál szünetel, az eseményfigyelők és observerek pedig megszüntethetők
- az alap UI-készlet Astro `Button`, `Input`, `Card`, `Badge`, `Toast`, `Dialog`, `LoadingState`, `EmptyState` és `ErrorState` komponensekből áll
- a dialog natív `<dialog>` elemre, billentyűzetes fókuszkezelésre és fókusz-visszaadásra épül; a toast élő régiót használ

## Tesztelhetőség és verifikáció

- Astro + TypeScript typecheck
- ESLint
- production build
- API-, téma- és interakciós unit tesztek
- a dialog, toast és motion capability/koordináta/scroll számítások célzott unit tesztjei
- világos/sötét és mobil vizuális ellenőrzés
- később Playwright E2E

## Nyomonkövethetőség

- BR: `BR-FNC-0002`, `BR-PRC-0002`
- NFR: `NFR-USB-0002`, `NFR-PER-0001`
- FR: `FR-SHR-0002`, `FR-WFL-0001`, `FR-WFL-0002`

---

# 5. TR-ARC-0001 – Moduláris rétegzett monolit

- TR azonosító: `TR-ARC-0001`
- TR neve: Moduláris rétegzett monolit
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

A backend egyetlen deployolható Spring Boot alkalmazásként készül, de domain és technikai felelősségek szerint strukturált.

Alapelv:

```text
controller
   ↓
service
   ↓
repository
```

Kiegészítő rétegek:
- `dto`
- `exception`
- `security`
- `storage`
- `config`

Domainterületek:
- client
- gallery
- media
- share
- selection
- download
- audit

## Indoklás és támogatott üzleti cél

A projektméret nem indokol mikroszerviz-architektúrát. A moduláris monolit:
- egyszerűbb deploy
- egyszerűbb tranzakciókezelés
- könnyebb tesztelés
- kevesebb hálózati függőség
- mégis tiszta felelősségszétválasztás

## Kockázatok és limitációk

- fegyelmezetlen fejlesztés esetén a modulhatárok elmosódhatnak
- egyetlen backend release unit marad

## Alternatívák

- A1: mikroszervizek  
  Nem választottuk: túlzott komplexitás az MVP-hez.

- A2: teljesen rétegezetlen CRUD alkalmazás  
  Nem választottuk: rossz karbantarthatóság és tesztelhetőség.

## Architektúra kapcsolat

Kapcsolódik közvetlenül:
- `NFR-MNT-0001`
- `FR-MED-0001`
- `FR-WFL-0001`

## Technikai specifikáció és megjegyzések

Üzleti szabály:
- service réteg

HTTP:
- controller

Adatbázis:
- repository

Fizikai média:
- storage adapter/service

## Tesztelhetőség és verifikáció

- service unit teszt
- controller teszt
- repository integrációs teszt
- code review
- opcionális ArchUnit

## Nyomonkövethetőség

- BR: `BR-DAT-0001`, `BR-FNC-0003`
- NFR: `NFR-MNT-0001`, `NFR-USB-0001`

---

# 6. TR-DAT-0001 – CockroachDB relációs perzisztencia

- TR azonosító: `TR-DAT-0001`
- TR neve: CockroachDB relációs perzisztencia
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

A strukturált üzleti adatok CockroachDB-ben kerülnek tárolásra külön `sql01` VM-en.

Az alkalmazás PostgreSQL-kompatibilis JDBC kapcsolaton keresztül csatlakozik.

Tervezett tárolt adatok:
- admin felhasználó
- ügyfél
- galéria
- média metaadat
- megosztási állapot
- client selection
- selection item
- opcionális audit/download esemény

A nagy bináris médiafájlok nem CockroachDB-ben tárolódnak.

## Indoklás és támogatott üzleti cél

A felhasználó kifejezett technológiai választása CockroachDB.

Előny:
- relációs SQL modell
- PostgreSQL protokoll-kompatibilis kapcsolódás
- későbbi többnode-os bővítés lehetősége
- külön VM-en tiszta szolgáltatási szerepkör

## Kockázatok és limitációk

- az MVP single-node, ezért nincs CockroachDB node-redundancia
- nem minden PostgreSQL specifikus viselkedés tekinthető automatikusan CockroachDB-kompatibilisnek
- JPA és migrációk kompatibilitását valódi CockroachDB teszttel kell ellenőrizni

## Alternatívák

- A1: PostgreSQL  
  Stabil és kézenfekvő alternatíva lenne, de a felhasználó CockroachDB-t választotta.

- A2: beágyazott H2 production adatbázis  
  Nem alkalmas a tervezett külön SQL szolgáltatási réteghez.

## Architektúra kapcsolat

```text
backend
  ↓ JDBC
sql01:26257
  ↓
CockroachDB
```

## Technikai specifikáció és megjegyzések

- Spring Data JPA
- PostgreSQL JDBC driver
- külön alkalmazás adatbázis
- külön alkalmazás user
- production secret környezeti változóból
- TLS használata production állapotban cél

A pontos JDBC URL és TLS-konfiguráció a `sql01` telepítésekor dokumentálandó.

## Tesztelhetőség és verifikáció

- kapcsolat teszt
- repository integrációs teszt
- Flyway migráció
- constraint teszt
- backup/restore teszt

## Nyomonkövethetőség

- BR: `BR-DAT-0001`, `BR-OPS-0001`
- NFR: `NFR-DAT-0001`, `NFR-REC-0001`
- FR: minden adatbázist használó FR

---

# 7. TR-DAT-0002 – Flyway verziózott adatbázis-migráció

- TR azonosító: `TR-DAT-0002`
- TR neve: Flyway verziózott adatbázis-migráció
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

Az adatbázisséma minden tartós változása verziózott Flyway migrációban készüljön.

## Indoklás és támogatott üzleti cél

- reprodukálható környezet
- traceable séma
- CI-ben tesztelhető
- production deployhoz nem szükséges kézi DDL

## Kockázatok és limitációk

- hibás migráció blokkolhatja az alkalmazás indulását
- CockroachDB-specifikus SQL-kompatibilitást ellenőrizni kell

## Alternatívák

- A1: Hibernate automatikus `ddl-auto=update` productionben  
  Nem választottuk, mert a séma változásai kevésbé kontrolláltak és nehezebben auditálhatók.

## Architektúra kapcsolat

Tervezett könyvtár:
```text
backend/src/main/resources/db/migration/
```

## Technikai specifikáció és megjegyzések

Naming:
```text
V1__baseline.sql
V2__create_gallery.sql
...
```

Productionben a migráció viselkedését kontrolláltan kell kezelni.

## Tesztelhetőség és verifikáció

- tiszta CockroachDB példányon minden migráció végigfut
- új migráció CI-ben ellenőrződik
- migration checksum eltérés hibát okoz

## Nyomonkövethetőség

- BR: `BR-DAT-0001`
- NFR: `NFR-DAT-0001`, `NFR-DEP-0001`
- kapcsolódó TR: `TR-DAT-0001`, `TR-DEV-0003`

---

# 8. TR-STO-0001 – NFSv4 média storage + storage abstraction

- TR azonosító: `TR-STO-0001`
- TR neve: NFSv4 média storage + storage abstraction
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

A fotó- és médiafájlok a `nas01` MicroServer NFSv4 `media` megosztásán tárolódnak.

A Docker VM a megosztást host szinten csatolja, a backend konténer pedig bind mounton keresztül kap hozzáférést.

A backendben a fájlrendszerkezelés egy storage absztrakción keresztül történik.

## Indoklás és támogatott üzleti cél

- médiaadat leválasztása az alkalmazás VM-ről
- VM újratelepítése nem törli a médiaállományt
- jól dokumentált és már validált saját storage
- későbbi storage-technológia cseréje könnyebb

## Kockázatok és limitációk

- NFS storage kiesése médiafunkció-kiesést okoz
- a MicroServer külön hibapont
- a hálózati storage lassabb lehet helyi NVMe/SSD-nél

## Alternatívák

- A1: média a Docker VM lokális lemezén  
  Nem választottuk: VM életciklusához kötné a fotókat.

- A2: média CockroachDB BLOB mezőben  
  Nem választottuk: nagy bináris állományokhoz nem ez a célarchitektúra.

## Architektúra kapcsolat

```text
nas01:/media
   ↓ NFSv4
docker01:/srv/btphoto/media
   ↓ bind mount
backend:/app/media
```

## Technikai specifikáció és megjegyzések

Javasolt könyvtár:
```text
galleries/<gallery-uuid>/
├── originals/
├── previews/
├── thumbnails/
└── exports/
```

Backend:
- `MediaStorageService`
- `NfsMediaStorageService`

Adatbázis:
- relatív path

## Tesztelhetőség és verifikáció

- mount reboot után is elérhető
- backend képes fájlt létrehozni és visszaolvasni
- storage hiba esetén upload nem jelez sikert
- path traversal teszt

## Nyomonkövethetőség

- BR: `BR-PRC-0001`, `BR-DAT-0001`
- NFR: `NFR-REL-0001`, `NFR-SEC-0001`
- FR: `FR-MED-0001`, `FR-MED-0002`, `FR-DWN-0001`

---

# 9. TR-SEC-0001 – Spring Security alapú backend védelem

- TR azonosító: `TR-SEC-0001`
- TR neve: Spring Security alapú backend védelem
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

A backend hitelesítési és admin hozzáférési védelmét Spring Security biztosítsa.

Két külön biztonsági kontextus kezelendő:

- admin hitelesített hozzáférés
- ügyfél share-token alapú korlátozott hozzáférés

## Indoklás és támogatott üzleti cél

A Spring Security natívan illeszkedik a Spring Boot alkalmazáshoz, és megfelelő alapot biztosít:
- route védelemhez
- jelszóhashhez
- request authorizationhöz
- security tesztekhez

## Nyitott döntés

A pontos admin authentikáció:
- HTTP session/cookie
vagy
- token/JWT

A projekt jelenlegi állapotában **nincs véglegesítve**.

A választást a tényleges deployment topológia és frontend-backend kommunikáció alapján kell lezárni, nem pusztán trend alapján.

## Kockázatok és limitációk

- hibás CORS/cookie/token konfiguráció security hibát okozhat
- share token nem helyettesíti az admin authentikációt

## Alternatívák

- A1: saját kézi security middleware  
  Nem választottuk, mert a Spring Security kiforrottabb és tesztelhetőbb.

## Architektúra kapcsolat

- `SecurityConfig`
- auth service/controller
- protected admin endpoints
- public share endpoints

## Technikai specifikáció és megjegyzések

Kötelező:
- biztonságos password encoder
- backend authorization
- publikus és admin endpoint szétválasztás
- production HTTPS

## Tesztelhetőség és verifikáció

- security MockMvc teszt
- hitelesítés nélküli admin hívás tiltott
- share token más galériához nem ad hozzáférést
- logout/auth expiry teszt

## Nyomonkövethetőség

- BR: `BR-FNC-0002`
- NFR: `NFR-SEC-0001`, `NFR-SEC-0002`
- FR: `FR-AUT-0001`, `FR-SHR-0002`, `FR-DWN-0001`

---

# 10. TR-DEV-0001 – JUnit 5 + Mockito + MockMvc tesztstack

- TR azonosító: `TR-DEV-0001`
- TR neve: JUnit 5 + Mockito + MockMvc tesztstack
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

A backend elsődleges automatikus tesztelési eszközei:

- JUnit 5
- Mockito
- MockMvc
- Spring Boot Test

## Indoklás és támogatott üzleti cél

A stack jól illeszkedik a rétegzett Spring alkalmazáshoz:
- service logika unit teszt
- repository függőség mockolás
- controller/API teszt
- security teszt

## Kockázatok és limitációk

- túl sok mock elrejtheti az integrációs problémákat
- CockroachDB specifikus működést unit teszt önmagában nem igazol

## Alternatívák

- A1: csak manuális teszt  
  Nem elfogadható.

## Architektúra kapcsolat

Érinti:
- service
- controller
- security
- exception

## Technikai specifikáció és megjegyzések

A fő üzleti szabályokhoz unit teszt kötelező.

## Tesztelhetőség és verifikáció

- `mvn test`
- `mvn clean verify`

## Nyomonkövethetőség

- NFR: `NFR-MNT-0002`, `NFR-REL-0001`
- US: `US-0011`

---

# 11. TR-DEV-0002 – JaCoCo + Checkstyle + SpotBugs quality gate

- TR azonosító: `TR-DEV-0002`
- TR neve: JaCoCo + Checkstyle + SpotBugs quality gate
- Státusz: elfogadott
- Prioritás: magas

## Részletes leírás

A Maven verify folyamat részeként fusson:

- JaCoCo
- Checkstyle
- SpotBugs

## Indoklás és támogatott üzleti cél

A korábbi projektben már alkalmazott, jól dokumentálható minőségkapu.

## Kockázatok és limitációk

- coverage önmagában nem jelent jó tesztminőséget
- túl szigorú kezdeti szabályok lassíthatják az MVP-t

## Technikai specifikáció és megjegyzések

Kezdeti cél:
- line coverage: 80%
- branch coverage: 55%

A kritikus business service-k lefedettsége fontosabb, mint a mesterséges globális százaléknövelés.

## Tesztelhetőség és verifikáció

```text
mvn clean verify
```

## Nyomonkövethetőség

- NFR: `NFR-MNT-0002`
- US: `US-0011`

---

# 12. TR-DEV-0003 – CockroachDB integrációs tesztkörnyezet

- TR azonosító: `TR-DEV-0003`
- TR neve: CockroachDB integrációs tesztkörnyezet
- Státusz: tervezet
- Prioritás: magas

## Részletes leírás

A DB-integrációs tesztek ne csak H2 vagy mock adatbázisra támaszkodjanak. A CockroachDB-kompatibilis SQL, Flyway migrációk és repository viselkedés legalább CI-ben valódi CockroachDB példányon legyen ellenőrizhető.

## Indoklás és támogatott üzleti cél

Csökkenti annak kockázatát, hogy:
- a lokális/unit teszt zöld
- production CockroachDB-n viszont a séma vagy query hibás

## Kockázatok és limitációk

- CI futás lassabb
- konténeres tesztkörnyezet konfigurációt igényel

## Alternatívák

- A1: kizárólag H2  
  Nem elegendő CockroachDB kompatibilitás igazolására.

## Architektúra kapcsolat

Lehetséges megoldás:
- CI service container
- vagy Testcontainers-alapú CockroachDB

A pontos mechanizmus még nem végleges.

## Tesztelhetőség és verifikáció

- Flyway baseline fut
- JPA repository tesztek futnak
- constraint tesztek futnak

## Nyomonkövethetőség

- NFR: `NFR-DAT-0001`, `NFR-MNT-0002`
- TR: `TR-DAT-0001`, `TR-DAT-0002`

---

# 13. TR-DEP-0001 – Docker + Docker Compose production futtatás

- TR azonosító: `TR-DEP-0001`
- TR neve: Docker + Docker Compose production futtatás
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

Az alkalmazás szolgáltatásai a `docker01` VM-en Docker konténerekben fussanak.

Kezdeti Compose stack:

```text
caddy
frontend
backend
```

A CockroachDB nem ebben a Compose stackben fut productionben, hanem külön `sql01` VM-en.

## Indoklás és támogatott üzleti cél

- reprodukálható futtatási környezet
- kontrollált függőségek
- egyszerűbb rollback/deploy
- korábbi projektből meglévő minta

## Kockázatok és limitációk

- bind mount/NFS jogosultságot körültekintően kell kezelni
- konténer újraindítás nem old meg külső DB/storage hibát

## Alternatívák

- A1: közvetlen JAR + systemd  
  Működőképes, de a projekt CI/CD és korábbi Docker mintája miatt nem választottuk.

## Architektúra kapcsolat

```text
docker01
├── caddy
├── frontend
└── backend
```

## Technikai specifikáció és megjegyzések

- `compose.production.yml`
- `.env.production` nem kerül Gitbe
- image-ek registryből
- healthcheck
- restart policy kontrolláltan

## Tesztelhetőség és verifikáció

- `docker compose config`
- container health
- smoke test

## Nyomonkövethetőség

- BR: `BR-OPS-0001`
- NFR: `NFR-DEP-0001`
- US: `US-0012`

---

# 14. TR-DEP-0002 – GitHub Actions + GHCR CI/CD

- TR azonosító: `TR-DEP-0002`
- TR neve: GitHub Actions + GHCR CI/CD
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

A projekt CI/CD platformja GitHub Actions.

A buildelt production image-ek GitHub Container Registrybe (GHCR) kerülnek.

Tervezett workflow-k:

```text
quality-ci.yml
cockroach-integration-check.yml
production-image-build.yml
production-deploy.yml
```

## Indoklás és támogatott üzleti cél

- korábbi projektben bevált GitHub Actions minta
- verziózott workflow
- PR status check
- image és commit összekapcsolása
- automatizált deployment

## Kockázatok és limitációk

- self-hosted runner production környezethez hozzáférést kap, ezért jogosultságát korlátozni kell
- hibás workflow production kockázatot jelenthet
- secret kezelés kiemelten fontos

## Alternatívák

- A1: Jenkins  
  Nem szükséges külön CI infrastruktúrát fenntartani ehhez a projekthez.

- A2: kizárólag kézi deploy  
  Nem felel meg a reprodukálhatósági céloknak.

## Architektúra kapcsolat

```text
Git push / PR
  ↓
Quality CI
  ↓
main
  ↓
Image build
  ↓
GHCR
  ↓
Approval
  ↓
docker01 self-hosted runner
  ↓
Docker Compose deploy
```

## Technikai specifikáció és megjegyzések

- branch protection
- GitHub Environment használata javasolt productionhöz
- deploy secret GitHub Secretből
- image tag legalább commit SHA-val

## Tesztelhetőség és verifikáció

- teszthiba → workflow failure
- image build only after green gate
- deploy health check
- commit → image traceability

## Nyomonkövethetőség

- BR: `BR-OPS-0001`
- NFR: `NFR-MNT-0002`, `NFR-DEP-0001`, `NFR-SEC-0002`
- US: `US-0011`, `US-0012`

---

# 15. TR-OPS-0001 – Caddy reverse proxy és HTTPS belépési pont

- TR azonosító: `TR-OPS-0001`
- TR neve: Caddy reverse proxy és HTTPS belépési pont
- Státusz: elfogadott
- Prioritás: magas

## Részletes leírás

A Docker stack publikus HTTP/HTTPS belépési pontját Caddy biztosítsa.

Feladata:
- HTTPS termináció
- domain alapú routing
- frontend kiszolgálás/proxy
- `/api` backend proxy
- alap security headerek
- access/error log

## Indoklás és támogatott üzleti cél

A korábbi projektben már használt Caddy minta:
- egyszerű konfiguráció
- jól illeszkedik Dockerhez
- automatizálható TLS

## Kockázatok és limitációk

- publikus TLS automatizáláshoz DNS/internet/router konfiguráció szükséges
- belső fejlesztési környezet külön konfigurációt igényelhet

## Alternatívák

- A1: Nginx  
  Technológiailag megfelelő alternatíva, de a projektben Caddy a preferált, már ismert megoldás.

## Architektúra kapcsolat

Internet/LAN → Caddy → frontend/backend

## Technikai specifikáció és megjegyzések

Productionben közvetlenül ne legyen publikus:
- backend container port
- CockroachDB
- NFS
- Proxmox
- iLO

## Tesztelhetőség és verifikáció

- HTTPS
- `/api` routing
- frontend routing
- header ellenőrzés
- smoke test

## Nyomonkövethetőség

- BR: `BR-FNC-0002`, `BR-OPS-0001`
- NFR: `NFR-SEC-0001`, `NFR-DEP-0001`

---

# 16. TR-OPS-0002 – Spring Boot Actuator és container healthcheck

- TR azonosító: `TR-OPS-0002`
- TR neve: Spring Boot Actuator és container healthcheck
- Státusz: elfogadott
- Prioritás: magas

## Részletes leírás

A backend szolgáltatás rendelkezzen Spring Boot Actuator health végponttal, amely a Docker healthcheck és a deployment smoke check alapja lehet.

## Indoklás és támogatott üzleti cél

Segíti:
- deploy utáni automatikus ellenőrzést
- DB/storage hibák diagnosztizálását
- container állapot és alkalmazásállapot elkülönítését

## Kockázatok és limitációk

- túl részletes health output belső információt szivárogtathat
- health endpoint maga is védendő lehet

## Technikai specifikáció és megjegyzések

Minimum:
- application health

Tervezett:
- DB dependency health
- media storage dependency health

Publikus válaszban csak szükséges információ jelenjen meg.

## Tesztelhetőség és verifikáció

- egészséges állapot
- DB down teszt
- storage down teszt
- deploy health check

## Nyomonkövethetőség

- BR: `BR-OPS-0001`
- NFR: `NFR-OPS-0001`
- US: `US-0012`

---

# 17. TR-BCK-0001 – Többrétegű backup és restore

- TR azonosító: `TR-BCK-0001`
- TR neve: Többrétegű backup és restore
- Státusz: elfogadott
- Prioritás: kritikus

## Részletes leírás

A rendszer mentése három szinten történjen:

1. VM backup
2. CockroachDB adatbázis backup
3. médiafájl backup

## Indoklás és támogatott üzleti cél

Egyetlen VM backup nem fedi le automatikusan megfelelően az összes recovery igényt.

## Kockázatok és limitációk

A jelenlegi `nas-media` és `nas-backup` ugyanahhoz a fizikai MicroServer környezethez kapcsolódik, ezért ez nem tekinthető teljes offsite DR megoldásnak.

## Alternatívák

- A1: csak snapshot  
  Nem elegendő backup stratégia.

## Architektúra kapcsolat

VM:
- Proxmox → `nas-backup`

DB:
- `sql01` → DB backup → backup cél

Media:
- `nas-media` → külön másodpéldány későbbi cél

## Technikai specifikáció és megjegyzések

MVP követelmény:
- legalább egy dokumentált VM restore
- legalább egy CockroachDB restore
- média restore teszt

## Tesztelhetőség és verifikáció

- backup file létrejön
- restore működik
- alkalmazás smoke test restore után

## Nyomonkövethetőség

- BR: `BR-OPS-0001`
- NFR: `NFR-REC-0001`
- US: `US-0012`

---

# 18. TR-AI-0001 – Visual Studio Code + Codex fejlesztési workflow

- TR azonosító: `TR-AI-0001`
- TR neve: Visual Studio Code + Codex fejlesztési workflow
- Státusz: elfogadott
- Prioritás: magas

## Részletes leírás

A fejlesztés elsődleges IDE-je Visual Studio Code, Codex támogatással.

A Codex követelményvezérelt fejlesztési asszisztensként használható:
- implementáció
- tesztírás
- refaktorálás
- dokumentációfrissítés
- kisebb migrációk
- hibajavítás

A Codex nem kap korlátlan, „írja meg az egész alkalmazást” jellegű utasítást.

## Indoklás és támogatott üzleti cél

A projekt kifejezett fejlesztési célja az AI-támogatott, de kontrollált fejlesztési folyamat.

A strukturált dokumentumok segítségével a Codex:
- konkrét BR/US/FR/AC alapján dolgozik
- kisebb scope-ú feladatot kap
- tesztkötelezettséget kap
- könnyebben review-zható módosítást készít

## Kockázatok és limitációk

- AI hibás vagy túl széles scope-ú kódot generálhat
- dependency-t vagy architektúrát indokolatlanul módosíthat
- teszt nélküli „működőnek látszó” megoldás készülhet

## Alternatívák

- A1: kizárólag manuális fejlesztés  
  Lehetséges, de nem ez a projekt választott workflow-ja.

## Architektúra kapcsolat

Repository gyökér:
```text
AGENTS.md
```

Az `AGENTS.md` tartalmazza:
- build parancsok
- réteghatárok
- naming
- tiltott módosítások
- security szabályok
- tesztelési követelmények
- docs frissítési szabály

## Technikai specifikáció és megjegyzések

Ajánlott Codex task:

```text
Implement US-xxxx / FR-xxxx.

Read:
- docs/...
- AGENTS.md

Scope:
- ...

Do not:
- ...

Before completion:
- run tests
- run quality checks
- summarize modified files
- report unsatisfied acceptance criteria
```

## Tesztelhetőség és verifikáció

Minden AI által készített lényeges módosítás:
- diff review
- automatizált teszt
- CI
- emberi merge döntés

## Nyomonkövethetőség

- BR: `BR-OPS-0001`
- NFR: `NFR-MNT-0001`, `NFR-MNT-0002`
- US: minden fejlesztési story

---

# 19. TR-DOC-0001 – Verziózott követelmény- és architektúradokumentáció

- TR azonosító: `TR-DOC-0001`
- TR neve: Verziózott követelmény- és architektúradokumentáció
- Státusz: elfogadott
- Prioritás: magas

## Részletes leírás

A fejlesztéshez használt tervezési dokumentumok a Git repository `docs` mappájában legyenek verziózva.

Tervezett csomag:

```text
docs/
├── 01-uzleti-kovetelmenyek.md
├── 02-epicek-es-user-storyk.md
├── 03-funkcionalis-kovetelmenyek.md
├── 04-nem-funkcionalis-kovetelmenyek.md
├── 05-technikai-kovetelmenyek.md
├── 06-teszteset-gyujtemeny.md
├── 07-nyomonkovethetosegi-matrix.md
├── 08-ui-ux-terv.md
└── 09-rendszerterv-es-szolgaltatasarchitektura.md
```

## Indoklás és támogatott üzleti cél

- közvetlen input Codex számára
- visszakövethető projektfejlődés
- szakdolgozati dokumentáció alapja
- BR → US → FR → TC kapcsolat fenntartható

## Kockázatok és limitációk

- elavult dokumentáció rosszabb lehet, mint a hiányzó dokumentáció
- ezért minden lényeges scope változáskor frissítendő

## Alternatívák

- A1: csak issue-k  
  Nem elég a teljes rendszerterv és szakdolgozati nyomonkövethetőség miatt.

## Tesztelhetőség és verifikáció

- PR review
- traceability ellenőrzés
- dokumentumazonosítók konzisztenciája

## Nyomonkövethetőség

- BR: minden fő BR
- NFR: `NFR-MNT-0001`
- kapcsolódó TR: minden TR

---

# 20. Elfogadott és még nyitott technikai döntések

## Elfogadott

- Proxmox VE infrastruktúra
- külön `docker01` VM
- külön `sql01` VM
- CockroachDB
- Java 21
- Spring Boot
- Astro 7 + TypeScript
- Docker
- GitHub Actions
- CI/CD pipeline
- NFSv4 média storage
- Spring Data JPA
- Flyway
- Caddy
- VS Code + Codex
- verziózott Markdown követelménycsomag
- frontend unit- és interakciós tesztek: Vitest + jsdom

## Még nyitott

- admin auth: session vagy JWT
- végleges `vmbr2` IP-címzés
- CockroachDB pontos TLS/certificate modell
- CockroachDB integrációs teszt: Testcontainers vagy CI service container
- Playwright bevezetési pontja
- média preview generáló könyvtár/technológia
- média kiszolgálás végső optimalizálása
- pontos production alkalmazás-domain
- offsite backup cél
- végleges Docker image base image-ek
- letöltésengedélyezés: lezárva az MVP-re (`US-0013`, média-szintű, default tiltott)

---

# 21. Technikai megvalósítás sorrendje

A technikai követelmények alapján javasolt sorrend:

```text
1. Git repository + docs + AGENTS.md
2. sql01 VM
3. CockroachDB telepítés
4. docker01 VM
5. Docker + NFS mount
6. Spring Boot skeleton
7. Astro skeleton és világos/sötét témarendszer
8. Flyway baseline
9. CockroachDB kapcsolat
10. Actuator health
11. quality-ci.yml
12. első end-to-end feature
13. Caddy
14. privát share/proofing
15. GHCR image build
16. self-hosted deploy
17. backup/restore teszt
```

Az első end-to-end feature:

> admin login → ügyfél létrehozás → galéria létrehozás → JPEG feltöltés NFS-re → metaadat CockroachDB-be → kép megjelenítése.

---

# 22. Szakirodalmi háttér

[1] Bass, L. – Clements, P. – Kazman, R.: *Software Architecture in Practice*. 4th Edition. Addison-Wesley Professional, 2021.

[2] Fowler, M.: *Patterns of Enterprise Application Architecture*. Addison-Wesley Professional, 2002.

[3] Kleppmann, M.: *Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*. O’Reilly Media, 2017.

[4] Humble, J. – Farley, D.: *Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation*. Addison-Wesley Professional, 2010.

[5] Nygard, M. T.: *Release It!: Design and Deploy Production-Ready Software*. 2nd Edition. The Pragmatic Bookshelf, 2018.

[6] Nemeth, E. – Snyder, G. – Hein, T. R. – Whaley, B. – Mackin, D.: *UNIX and Linux System Administration Handbook*. 5th Edition. Addison-Wesley Professional, 2017.

[7] Stern, H. – Eisler, M. – Labiaga, R.: *Managing NFS and NIS*. 2nd Edition. O’Reilly Media, 2001.

[8] Crispin, L. – Gregory, J.: *Agile Testing: A Practical Guide for Testers and Agile Teams*. Addison-Wesley Professional, 2009.

---

# 23. Következő lépés

A következő dokumentum a `06-teszteset-gyujtemeny.md`.

A `03` funkcionális követelményei, a jelenlegi NFR-ek és a most rögzített TR-ek alapján már konkrét tesztkatalógus készíthető.

Elsőként létrehozandó tesztcsoportok:

```text
TC-AUT-*   admin hitelesítés
TC-DAT-*   ügyfél és galéria
TC-MED-*   médiafeltöltés és storage
TC-SHR-*   privát megosztás
TC-WFL-*   client proofing
TC-DWN-*   letöltés
TC-SEC-*   jogosultság és path védelem
TC-DB-*    CockroachDB/Flyway
TC-QLT-*   build és quality gate
TC-OPS-*   health és diagnosztika
TC-DEP-*   image/deployment
TC-REC-*   backup/restore
TC-UI-*    reszponzív UI
TC-E2E-*   teljes üzleti flow
```

A teszteseteket közvetlenül a már létező AC azonosítókhoz kell kötni, hogy a `07-nyomonkovethetosegi-matrix.md` később mechanikusan is felépíthető legyen.
