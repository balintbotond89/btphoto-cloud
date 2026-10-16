# BTPhoto Private Cloud

Saját infrastruktúrán futó, fotós munkafolyamatokra specializált privát felhő és ügyfélgaléria.

**Fejlesztési baseline:** `BTPC-BL-2026-10-14-v0.4`

## Projektcél

A rendszer több fotós egymástól elkülönített munkaterületén szervezi egységes folyamatba:

- ügyfelek kezelését;
- galériák létrehozását;
- médiafeltöltést saját NFS storage-ra;
- strukturált metaadat-kezelést CockroachDB-ben;
- privát galériamegosztást;
- client proofingot;
- médiaelemenként szabályozott digitális átadást;
- későbbi fotós-specifikus automatizálást.

A projekt nem általános fájlmegosztó és nem teljes CRM.

## Célarchitektúra

```text
                         Internet / LAN
                               |
                             Caddy
                               |
                    +----------+----------+
                    |                     |
                 Frontend              Backend
                 Astro/TS            Spring Boot
                                          |
                              +-----------+-----------+
                              |                       |
                            sql01                   nas01
                         CockroachDB              NFSv4 media
                              ^
                              |
                    egyszer lefutó migrations
```

Virtualizáció:
- `pve01.btphoto.hu` – Proxmox VE
- `docker01` – Docker/Caddy/frontend/backend/migrations
- `sql01` – CockroachDB
- `nas01` – Debian 13 MicroServer/NFSv4

## Technológiai stack

### Backend
- Java 21
- Spring Boot 3.x
- Spring Web
- Spring Security
- Spring Data JPA
- Actuator
- Maven

### Adatbázis-migráció
- külön Flyway 12.6.2 migrations image
- egyetlen hiteles SQL-forrás a `database/migrations/` könyvtárban
- idempotens Compose futás a backend indulása előtt
- production TLS `verify-full`; a backend csak Hibernate schema validationt végez

### Frontend
- Astro 7
- TypeScript
- Tailwind CSS
- Astro komponensek + minimális natív kliensoldali TypeScript
- világos/sötét design token rendszer

### Adat és storage
- CockroachDB
- PostgreSQL JDBC
- NFSv4

### Futtatás és delivery
- Docker
- Docker Compose
- Caddy
- GitHub Actions
- GHCR

### Tesztelés
- JUnit 5
- Mockito
- MockMvc
- CockroachDB integrációs teszt
- később Playwright E2E

## Repository szerkezet

```text
btphoto-cloud/
├── AGENTS.md
├── README.md
├── backend/
│   └── src/
├── database/
│   └── migrations/
├── frontend/
│   └── src/
├── deploy/
├── docs/
│   ├── 01-uzleti-kovetelmenyek.md
│   ├── ...
│   ├── 09-rendszerterv-es-szolgaltatasarchitektura.md
│   └── BASELINE-v0.3.md
├── scripts/
└── .github/
    ├── workflows/
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```

A Spring Boot backend és az Astro 7 frontend walking skeleton elkészült. A
CockroachDB 26-kompatibilis Flyway migráció külön, egyszer lefutó image-be került;
a backend már nem módosít sémát. A repository-oldali production Compose,
image-build és kontrollált rollback szerződés elkészült, de a teljes walking
skeleton csak a PR-workflow és a kontrollált `docker01` deployment sikeres élő
ellenőrzése után tekinthető lezártnak.

## Követelményvezérelt fejlesztés

A projekt normatív lánca:

```text
BR → Epic/US → FR → AC → NFR/TR → TC → implementáció
```

Implementáció indításakor mindig az adott User Story és FR legyen a scope forrása.

A teljes tervezési csomag: [`docs/README.md`](docs/README.md)

## Első vertikális feature

```text
Admin login
→ ügyfél létrehozása
→ galéria létrehozása
→ JPEG feltöltése
→ fájl NFS-re
→ metaadat CockroachDB-be
→ kép megjelenítése az Astro admin felületen
```

Kapcsolódó story-k:
- `US-0001`
- `US-0002`
- `US-0003`
- `US-0004`
- `US-0005`

## GAP-001 lezárása

A letöltési folyamat baseline döntése:

- `US-0013` elfogadva;
- `FR-DWN-0002` elfogadva;
- a letöltési engedély médiaelemenként kezelendő;
- új média alapértelmezetten **nem letölthető**;
- az admin engedélyezheti vagy visszavonhatja;
- a publikus letöltés minden kérésnél ellenőrzi a share-t, gallery kapcsolatot és a letöltési állapotot.

## Fejlesztési folyamat

Javasolt branch modell:

```text
main
develop
feature/*
bugfix/*
hotfix/*
release/*
```

Egy feature tipikus folyamata:

```text
User Story / GitHub Issue
→ feature branch
→ Codex / manuális implementáció
→ lokális tesztek
→ Pull Request
→ CI
→ review
→ merge
```

## Codex

A repository gyökerében lévő [`AGENTS.md`](AGENTS.md) normatív instrukciókat ad a Codex számára.

A Codex:
- csak a kijelölt story scope-jában dolgozhat;
- nem vezethet be új infrastruktúrát vagy dependency-t önállóan;
- nem módosíthat üzleti követelményt hallgatólagosan;
- köteles tesztelni;
- köteles jelezni a nem teljesített Acceptance Criteria-t.

## Következő fázis

Az aktuális ciklus a CR-0001: fotósregisztráció, egyetlen üzemeltetői admin,
jóváhagyás, saját workspace/profil és avatar. A helyi implementációs kapuk zöldek;
a kiadási és production elfogadás még nyitott.

1. PR-review, image build és valódi CockroachDB 26.2.2 tesztek az eldobható CI-fixture-ben.
2. Külön jóváhagyott operatív feladat: avatar NFS/UID-jogosultságok, deployment mount-engedélylista és tenant-kompatibilis rollback-gate.
3. Régi accountok auditja, egyszeri operator-provisionálás és kötelező jelszócsere, majd kontrollált deployment.
4. Egy ADMIN és két PHOTOGRAPHER fiókos böngészős elfogadás, NFS-persistencia és negatív tenanttesztek.

Az ügyfél-, galéria-, média- és proofingmodulok teljes megvalósítása későbbi ciklus.
Az automatikus production deployment nem része ennek a fejlesztésnek.

## Dokumentációs státusz

A `docs/01`–`docs/09` és a jóváhagyott CR-0001 követelményállapotát a
[v0.4 baseline](docs/BASELINE-v0.4.md) rögzíti. A v0.1–v0.3 fájlok változatlan
történeti pillanatképek. A részletes implementációs bizonyítékok és a nyitott AC-k
a [CR-0001 jelentésben](docs/CR-0001-implementacios-jelentes.md) szerepelnek.
