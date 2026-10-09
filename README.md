# BTPhoto Private Cloud

Saját infrastruktúrán futó, fotós munkafolyamatokra specializált privát felhő és ügyfélgaléria.

**Fejlesztési baseline:** `BTPC-BL-2026-09-13-v0.1`

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
```

Virtualizáció:
- `pve01.btphoto.hu` – Proxmox VE
- `docker01` – Docker/Caddy/frontend/backend
- `sql01` – CockroachDB
- `nas01` – Debian 13 MicroServer/NFSv4

## Technológiai stack

### Backend
- Java 21
- Spring Boot 3.x
- Spring Web
- Spring Security
- Spring Data JPA
- Flyway
- Actuator
- Maven

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
├── frontend/
│   └── src/
├── deploy/
├── docs/
│   ├── 01-uzleti-kovetelmenyek.md
│   ├── ...
│   ├── 09-rendszerterv-es-szolgaltatasarchitektura.md
│   └── BASELINE-v0.1.md
├── scripts/
└── .github/
    ├── workflows/
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```

A Spring Boot backend walking skeleton elkészült. A frontend technológiai baseline az Astro 7 alapú, világos/sötét témát támogató felületre frissült. A teljes walking skeleton még nem lezárt; a következő fázis a `sql01` CockroachDB és a valódi Flyway-integráció.

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

## Következő fázis

1. A `sql01` CockroachDB alkalmazásoldali integrációja.
2. A teljes Flyway migrációs lánc ellenőrzése valódi, eldobható CockroachDB tesztadatbázison.
3. A teljes frontend → backend → CockroachDB walking skeleton lezárása.
4. `docker01` Docker + NFS mount integráció.
5. CI quality gate.
6. Első vertikális feature.

## Dokumentációs státusz

A `docs/01`–`docs/09` fájlok a `BTPC-BL-2026-09-13-v0.1` fejlesztési baseline részét képezik. A nem blokkoló nyitott döntések a `docs/BASELINE-v0.1.md` fájlban találhatók.
