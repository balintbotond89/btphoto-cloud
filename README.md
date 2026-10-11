# BTPhoto Private Cloud

Saját infrastruktúrán futó, fotós munkafolyamatokra specializált privát felhő és ügyfélgaléria.

**Fejlesztési baseline:** `BTPC-BL-2026-10-11-v0.3`

## Projektcél

A rendszer egy fotós számára egységes folyamatba szervezi:

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

1. A három production image és a CockroachDB 26.2.2 migrációs integrációs teszt PR-workflow ellenőrzése.
2. A kontrollált `docker01` deployment production `verify-full` TLS smoke tesztje.
3. A teljes frontend → backend → CockroachDB walking skeleton lezárása.
4. NFS media integráció.
5. Első vertikális feature.

## Dokumentációs státusz

A `docs/03`–`docs/09` aktuális technikai állapotát a
`BTPC-BL-2026-10-11-v0.3` baseline rögzíti. A v0.1 és v0.2 fájlok változatlan
történeti pillanatképek.
