# Rendszerterv és szolgáltatásarchitektúra

**Dokumentum státusza:** fejlesztési baseline v0.1  
**Projekt:** BTPhoto Private Cloud  
**Baseline azonosító:** `BTPC-BL-2026-09-13-v0.1`  
**Baseline dátuma:** `2026-09-13`

A dokumentum a BTPhoto Private Cloud magas szintű rendszer- és szolgáltatásarchitektúráját rögzíti. A cél az, hogy a már működő Proxmox + MicroServer infrastruktúra és a fejlesztendő alkalmazás között egyértelmű, implementálható kapcsolat legyen.

A dokumentum tudatosan nem tartalmaz minden alacsony szintű konfigurációs részletet. A konkrét API-k, entitásmezők, tesztesetek és UI komponensek a kapcsolódó tervezési dokumentumokban kerülnek részletezésre.

---

## 1. Kapcsolódó üzleti célok

A rendszerterv közvetlenül az alábbi üzleti követelményeket támogatja:

- `BR-FNC-0001` – Ügyfél- és galériakezelés biztosítása
- `BR-FNC-0002` – Privát ügyfélgaléria és megosztás biztosítása
- `BR-PRC-0001` – Médiafeltöltési és client proofing folyamat támogatása
- `BR-PRC-0002` – Ügyfélkiválasztás és digitális átadás támogatása
- `BR-DAT-0001` – Követhető média- és metaadatmodell kialakítása
- `BR-OPS-0001` – Saját infrastruktúrán üzemeltethető, menthető szolgáltatás kialakítása
- `BR-FNC-0003` – Fotós-specifikus automatizálhatóság megalapozása

---

## 2. Kiinduló infrastruktúra

A projekt alkalmazási rétege már validált saját infrastruktúrára épül.

### Proxmox host

- Név: `pve01.btphoto.hu`
- Platform: Proxmox VE 9.2
- Menedzsment IP: `192.168.50.74/24`
- Menedzsment bridge: `vmbr0`
- Storage bridge: `vmbr1`
- Storage IP: `192.168.60.1/24`
- Helyi VM storage: ZFS RAID10, 4 SSD
- iLO: `192.168.50.82`

A host feladata:
- VM-ek futtatása
- lokális VM rendszerlemezek biztosítása
- snapshot és VM backup
- hálózati bridge-ek biztosítása

### MicroServer / `nas01`

- Operációs rendszer: Debian 13
- Storage IP: `192.168.60.2/24`
- Protokoll: NFSv4

Már kialakított fő megosztások:
- `nas-iso`
- `nas-backup`
- `nas-vm`
- `nas-media`

Az alkalmazás szempontjából a `nas-media` a legfontosabb; itt tárolódnak a fotók és később a generált preview/export fájlok.

---

## 3. Célarchitektúra áttekintése

A végleges MVP négy fő infrastruktúra-szerepkörre épül:

```text
Proxmox VE host
│
├── docker01 VM
│   ├── Caddy
│   ├── frontend
│   └── backend
│
├── sql01 VM
│   └── CockroachDB
│
└── nas01 MicroServer
    ├── media
    └── backup
```

Szerepkörök:

| Komponens | Felelősség |
| --- | --- |
| `pve01` | virtualizáció és VM életciklus |
| `docker01` | alkalmazáskonténerek, reverse proxy, deployment |
| `sql01` | strukturált üzleti és metaadatok |
| `nas01` | médiafájlok és backup storage |
| GitHub / GHCR | forráskód, CI/CD és konténer image registry |

A rendszer tudatosan nem mikroszerviz-architektúraként indul. Az MVP backend egy modulárisan felépített Spring Boot alkalmazás, amely Docker konténerben fut. A külön VM-ek infrastruktúra-szintű szeparációt biztosítanak, miközben a fejlesztés nem kap felesleges elosztott rendszer-komplexitást.

---

## 4. VM szerepkörök

### `docker01`

Feladata:
- Docker Engine és Docker Compose futtatása
- backend konténer
- frontend konténer vagy statikus frontend image
- Caddy reverse proxy
- később self-hosted GitHub Actions runner
- NFS média mount biztosítása az alkalmazás számára

Kezdeti méretezési irány:
- 4–6 vCPU
- 8–12 GB RAM
- 50–80 GB rendszerlemez

A pontos erőforrásértékek nem véglegesek; a mérési eredmények alapján módosíthatók.

### `sql01`

Feladata:
- CockroachDB futtatása
- alkalmazási adatbázis kezelése
- séma migrációk fogadása
- adatbázis-szintű backup biztosítása

Kezdeti méretezési irány:
- 4 vCPU
- 8 GB RAM
- 50–80 GB virtuális lemez

MVP korlátozás:
- egyetlen CockroachDB node
- ezért az adatbázis nem tekinthető magas rendelkezésre állású CockroachDB clusternek

Későbbi irány:
- 3-node CockroachDB cluster vizsgálata, ha a projekt későbbi fázisa indokolja

---

## 5. Hálózati architektúra

### 5.1 Menedzsment / normál LAN

Hálózat:
`192.168.50.0/24`

Feladata:
- Proxmox elérés
- VM-ek adminisztrációja
- internetelérés
- publikus webforgalom továbbítása a reverse proxyhoz

### 5.2 Storage hálózat

Hálózat:
`192.168.60.0/24`

Jelenlegi címek:
- `pve01/vmbr1`: `192.168.60.1`
- `nas01`: `192.168.60.2`

Feladata:
- NFSv4 forgalom
- `docker01` médiaelérés
- szükség esetén backup forgalom

A storage hálózaton nem szükséges alapértelmezett gateway.

### 5.3 Alkalmazás–adatbázis belső hálózat

Tervezett, még nem implementált kialakítás:

- külön Proxmox bridge: például `vmbr2`
- fizikai uplink nélkül
- kizárólag `docker01` és `sql01` között

Javasolt belső tartomány:
`10.20.0.0/24`

Példa:
- `docker01`: `10.20.0.10`
- `sql01`: `10.20.0.20`

A címek véglegesítése az VM-ek létrehozásakor történik.

Cél:
- a CockroachDB ne a felhasználói LAN-on kommunikáljon az alkalmazással
- az adatbázis ne kapjon közvetlen publikus hozzáférést

---

## 6. Alkalmazásarchitektúra

### Backend

Tervezett technológia:
- Java 21
- Spring Boot 3.x
- Spring Web
- Spring Security
- Spring Data JPA
- PostgreSQL JDBC driver CockroachDB kapcsolathoz
- Flyway
- Spring Boot Actuator
- JUnit 5
- Mockito
- MockMvc
- integrációs tesztek

A korábbi sikeres projekt mintájához igazodó fő rétegek:

```text
controller
service
repository
model
dto
exception
config
```

A fotós rendszerhez hozzáadandó domainfelelősségek:

```text
client
gallery
media
storage
share
selection
download
security
audit
```

Alapelv:
- controller: HTTP kérés/válasz és delegálás
- service: üzleti szabályok
- repository: perzisztencia
- storage: fizikai médiaelérés absztrakciója
- security: hitelesítés és hozzáférés-ellenőrzés

### Frontend

Tervezett technológia:
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

A frontend két fő felületi területre oszlik:

1. admin/fotós felület
2. ügyféloldali privát galéria

A vizuális irány a megadott Lovable artisan storefront minta hangulatát követi:
- meleg bézs / krém alapok
- mély barna árnyalatok
- réz/narancs kiemelések
- elegáns, editoriális tipográfia
- képcentrikus kártyák és grid
- mobilbarát ügyfélgaléria

A jelenleg feltöltött `08-ui-ux-terv.md` még a korábbi kávés projektre vonatkozik; azt külön BTPhoto verzióra kell átírni. A rendszerterv ezért itt csak a vizuális irányt rögzíti.

---

## 7. Média storage modell

A nagy médiafájlok nem CockroachDB BLOB mezőben tárolódnak.

Javasolt fizikai struktúra:

```text
/srv/storage/media/
└── galleries/
    └── <gallery-uuid>/
        ├── originals/
        ├── previews/
        ├── thumbnails/
        └── exports/
```

`docker01` oldalon az NFS megosztás például:

```text
/srv/btphoto/media
```

A backend konténerbe bind mounttal kerül:

```text
docker01 host: /srv/btphoto/media
backend:       /app/media
```

Adatbázisban csak a relatív útvonal kerül eltárolásra, például:

```text
galleries/<gallery-uuid>/originals/IMG_0001.jpg
```

Előny:
- az alkalmazás és a storage útvonalak kevésbé kötődnek egymáshoz
- könnyebb későbbi költöztetés
- a bináris fájlok nem növelik az SQL adatbázist

---

## 8. Fő domain entitások

Az első adatmodell fő elemei:

| Entitás | Szerep |
| --- | --- |
| `AdminUser` | belső fotós/admin felhasználó |
| `Client` | fotós ügyfele |
| `Gallery` | fotózás vagy projekt |
| `MediaAsset` | média metaadata és MVP-ben a média-szintű letöltési engedély állapota |
| `GalleryShare` | privát megosztási token és állapot |
| `ClientSelection` | ügyfél válogatási munkamenete |
| `SelectionItem` | kiválasztott média |
| `DownloadEvent` | opcionális letöltési audit |
| `AuditEvent` | fontos admin esemény |

Fő relációk:

```text
Client 1 ─── * Gallery
Gallery 1 ─── * MediaAsset
Gallery 1 ─── * GalleryShare
Gallery 1 ─── * ClientSelection
ClientSelection 1 ─── * SelectionItem
MediaAsset 1 ─── * SelectionItem
```

MVP letöltési döntés:
- a letöltési jogosultság médiaelemenként tárolódik;
- új `MediaAsset` alapértelmezetten nem letölthető;
- az admin a `US-0013` / `FR-DWN-0002` szerint módosíthatja az állapotot;
- a publikus download végpont a share jogosultság mellett ezt az állapotot is ellenőrzi.

A részletes mezők és kulcsok a `03-funkcionalis-kovetelmenyek.md` és az adatmodell kidolgozásakor véglegesednek.

---

## 9. CockroachDB stratégia

Az alkalmazás CockroachDB-t használ strukturált adatokhoz.

MVP:
- külön `sql01` VM
- single-node CockroachDB
- külön alkalmazás-adatbázis
- külön alkalmazás-user
- PostgreSQL-kompatibilis JDBC kapcsolat
- Flyway migráció

Tervezett kapcsolati logika:

```text
backend container
   ↓
docker01 belső DB NIC
   ↓
sql01:26257
   ↓
CockroachDB
```

A hitelesítési adatok nem kerülhetnek a Git repository-ba.

A single-node CockroachDB választás fejlesztési/MVP egyszerűsítés. Nem tekintjük magas rendelkezésre állású kialakításnak; ezt a korlátozást a szakdolgozatban is egyértelműen dokumentálni kell.

---

## 10. Docker szolgáltatásarchitektúra

Kezdeti production Compose:

```text
docker01
├── caddy
├── frontend
└── backend
```

Későbbi bővítés:

```text
docker01
├── caddy
├── frontend
├── backend
└── media-worker
```

### Caddy

Feladata:
- HTTPS belépési pont
- domain kezelés
- frontend kiszolgálás vagy proxy
- `/api` továbbítása a backend felé
- alap security headerek

### Backend

Feladata:
- üzleti logika
- CockroachDB kapcsolat
- NFS média storage elérés
- hitelesítés
- megosztási tokenek
- proofing és letöltési szabályok

### Frontend

Feladata:
- admin felület
- publikus/privát ügyfélgaléria
- proofing interakciók

---

## 11. Fő request flow-k

### Médiafeltöltés

```text
Admin böngésző
  ↓
Caddy
  ↓
Backend
  ├── CockroachDB: galéria/metaadat ellenőrzés
  └── NFS media storage: fájl írás
```

Sikeres feltöltés csak akkor jelezhető, ha a rendszer a fájl és a kapcsolódó adatbázisállapot konzisztenciáját kezelni tudja.

### Ügyfélgaléria

```text
Ügyfél böngésző
  ↓
Caddy
  ↓
Frontend / Backend
  ↓
share token ellenőrzés
  ↓
Gallery + Media metadata
  ↓
preview/media kiszolgálás
```

### Client proofing

```text
Ügyfél kijelölés
  ↓
Backend
  ↓
ClientSelection / SelectionItem
  ↓
CockroachDB
  ↓
Admin kiválasztási nézet
```

### Digitális átadás / letöltés

```text
Admin letöltési engedély
  ↓
MediaAsset.downloadEnabled = true
  ↓
Ügyfél share token + media ID
  ↓
Backend ellenőrzés:
  - share aktív
  - média a share galériájához tartozik
  - downloadEnabled = true
  ↓
NFS media storage
  ↓
fájl stream az ügyfélnek
```

---

## 12. CI/CD architektúra

A korábbi sikeres projekt struktúráját megtartva GitHub Actions alapú pipeline készül.

Tervezett workflow-k:

```text
.github/workflows/
├── quality-ci.yml
├── cockroach-integration-check.yml
├── production-image-build.yml
└── production-deploy.yml
```

### Quality CI

Backend:
- Maven build
- JUnit 5
- Mockito / MockMvc
- JaCoCo
- Checkstyle
- SpotBugs

Frontend:
- dependency install
- TypeScript check
- lint
- test
- production build

### CockroachDB integration check

- ideiglenes CockroachDB tesztkörnyezet
- Flyway migráció
- repository/integrációs teszt
- nem használhatja a production `sql01` adatbázist

### Image build

Sikeres `main` build után:
- backend image
- frontend image
- commit SHA alapú verzióazonosítás
- push GHCR-be

### Production deploy

Tervezett irány:
- self-hosted runner a `docker01` VM-en
- production environment jóváhagyás
- registry login
- `docker compose pull`
- `docker compose up -d`
- health check
- smoke test

---

## 13. Git és fejlesztési folyamat

Javasolt ágak:

```text
main
develop
feature/*
bugfix/*
hotfix/*
```

A fejlesztés user story alapú:

```text
BR
↓
Epic
↓
User Story
↓
FR + AC
↓
GitHub issue
↓
feature branch
↓
Codex / VS Code implementáció
↓
tesztek
↓
Pull Request
↓
CI
↓
review
↓
merge
```

A repository gyökerében `AGENTS.md` készül, amely Codex számára rögzíti:
- architekturális szabályok
- build/test parancsok
- réteghatárok
- tiltott függőségek
- tesztelési elvárások
- dokumentációs kötelezettségek

A Codex feladata a definiált issue megvalósításának támogatása; új üzleti scope-ot nem vezethet be önállóan.

---

## 14. Biztonsági alapelvek

Publikusan kizárólag a webes belépési pont kerülhet elérhetővé.

Közvetlenül nem publikálható:
- Proxmox GUI
- iLO
- NFS
- CockroachDB
- belső health/admin végpontok

MVP biztonsági elvárások:
- HTTPS
- admin hitelesítés
- jelszóhash
- secret-ek repository-n kívül
- kiszámíthatatlan share token
- path traversal elleni védelem
- fájltípus és fájlméret validáció
- input validáció
- jogosultságellenőrzés backend oldalon
- érzékeny adat nélküli logolás

---

## 15. Mentési és helyreállítási modell

A rendszer több adatréteget tartalmaz, ezért a mentést is rétegenként kell kezelni.

### VM backup

Proxmox:
- `docker01`
- `sql01`

Cél:
- `nas-backup`

### Adatbázis backup

A CockroachDB-ről külön adatbázis-szintű mentés készül.

Követelmény:
- legalább egy restore próba dokumentálása

### Média backup

A `nas-media` tartalma külön mentési stratégiát igényel.

Fontos korlátozás:
- ha a média és a backup ugyanazon fizikai MicroServer lemezkörnyezetben található, ez nem teljes értékű offsite vagy katasztrófavédelmi mentés
- későbbi cél egy fizikailag független másodpéldány

---

## 16. Fő architekturális döntések

| Döntés | Választás | Indoklás |
| --- | --- | --- |
| Virtualizáció | Proxmox VE | már kialakított és validált |
| Alkalmazás VM | külön `docker01` | reprodukálható konténeres futtatás |
| Adatbázis VM | külön `sql01` | felelősség és erőforrás elkülönítése |
| Adatbázis | CockroachDB | SQL modell, PostgreSQL klienskapcsolat, későbbi bővíthetőség |
| Backend | Java 21 + Spring Boot | korábbi sikeres projekt és rétegzett architektúra |
| Frontend | React + TypeScript | modern, képcentrikus webes UI |
| Reverse proxy | Caddy | egyszerű HTTPS és proxy kezelés |
| Média storage | NFSv4 MicroServer | fájlok leválasztása az alkalmazás VM-ről |
| DB migráció | Flyway | verziózott séma |
| CI/CD | GitHub Actions | automatizált quality gate és deploy |
| Registry | GHCR | GitHub integráció |
| Fejlesztés | VS Code + Codex | issue- és követelményvezérelt fejlesztési támogatás |

---

## 17. Korlátozások és ismert kockázatok

- a fizikai infrastruktúra régebbi szerverhardveren fut
- a CockroachDB MVP single-node
- az internetkapcsolat feltöltési sávszélessége befolyásolhatja az ügyfélgaléria külső teljesítményét
- az NFS média storage külön hibapont
- a média és a jelenlegi backup cél részben azonos fizikai környezetre támaszkodik
- a videó és RAW workflow még nincs részletesen definiálva
- a `08-ui-ux-terv.md` jelenleg a korábbi kávés projekt tartalmát hordozza, ezért frissítendő
- a `03`–`07` dokumentumok még a korábbi projekt azonosítóit tartalmazzák, ezért a most aktualizált BR/US struktúrához újra kell őket vezetni

---

## 18. Megvalósítási sorrend

### 1. Tervezési dokumentumok konzisztenssé tétele

- `01` üzleti követelmények
- `02` epicek és user story-k
- `03` funkcionális követelmények
- `04` nem funkcionális követelmények
- `05` technikai követelmények
- `06` tesztesetek
- `07` traceability
- `08` BTPhoto UI/UX

### 2. Repository skeleton

- backend
- frontend
- deploy
- docs
- workflows
- `AGENTS.md`

### 3. `sql01`

- Debian VM
- CockroachDB
- alkalmazás DB/user
- belső hálózat
- Flyway baseline

### 4. `docker01`

- Debian VM
- Docker Engine
- NFS media mount
- Compose
- Caddy

### 5. Walking skeleton

- frontend → backend → CockroachDB
- Actuator health
- CI zöld

### 6. Első üzleti vertikális szelet

- admin login
- ügyfél létrehozás
- galéria létrehozás
- JPEG feltöltés
- metaadat CockroachDB
- fájl NFS storage
- admin galérianézet

### 7. Privát megosztás és proofing

- share token
- ügyfélgaléria
- kiválasztás
- véglegesítés
- admin visszanézet

### 8. Production kiadás

- GHCR
- self-hosted runner
- deploy
- health/smoke check
- backup/restore

---

## 19. Traceability az üzleti követelményekhez

| BR | Architektúraelem |
| --- | --- |
| `BR-FNC-0001` | frontend + backend + CockroachDB |
| `BR-FNC-0002` | Caddy + security + share service + public gallery |
| `BR-PRC-0001` | backend + NFS media + CockroachDB |
| `BR-PRC-0002` | selection workflow + frontend + CockroachDB |
| `BR-DAT-0001` | CockroachDB + JPA + Flyway + storage absztrakció |
| `BR-OPS-0001` | Proxmox + Docker + GitHub Actions + backup |
| `BR-FNC-0003` | későbbi `media-worker` és feldolgozási pipeline |

---

## 20. Szakirodalmi alap

A tervezéshez használt fő szakirodalmi háttér:

1. Bass, L. – Clements, P. – Kazman, R.: *Software Architecture in Practice*. 4th Edition. Addison-Wesley Professional, 2021.
2. Fowler, M.: *Patterns of Enterprise Application Architecture*. Addison-Wesley Professional, 2002.
3. Kleppmann, M.: *Designing Data-Intensive Applications*. O’Reilly Media, 2017.
4. Humble, J. – Farley, D.: *Continuous Delivery*. Addison-Wesley Professional, 2010.
5. Nemeth, E. et al.: *UNIX and Linux System Administration Handbook*. 5th Edition. Addison-Wesley Professional, 2017.
6. Stern, H. – Eisler, M. – Labiaga, R.: *Managing NFS and NIS*. 2nd Edition. O’Reilly Media, 2001.

---

## 21. Fejlesztési baseline és következő fázis

A `01`–`09` dokumentumcsomag a `BTPC-BL-2026-09-13-v0.1` baseline része.

A baseline-ban lezárt fontos döntések:
- CockroachDB külön `sql01` VM-en;
- Docker alkalmazási környezet külön `docker01` VM-en;
- NFSv4 média storage;
- Spring Boot + React;
- média-szintű letöltési jogosultság, alapértelmezetten tiltott;
- követelményvezérelt VS Code + Codex workflow.

A következő fázis:

```text
1. repository skeleton
2. README.md
3. AGENTS.md
4. sql01
5. docker01
6. walking skeleton
7. első vertikális feature
```

Az első vertikális feature:
> admin login → ügyfél létrehozás → galéria létrehozás → JPEG NFS-re → metaadat CockroachDB-be → admin megjelenítés.
