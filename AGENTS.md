# AGENTS.md – BTPhoto Private Cloud

Ez a fájl normatív fejlesztési instrukció a repository-val dolgozó AI agentek, különösen a Codex számára.

**Baseline:** `BTPC-BL-2026-09-13-v0.1`

## 1. Munkavégzés előtt

Minden feladat előtt olvasd el:

1. a feladathoz tartozó GitHub issue-t / User Story-t;
2. `docs/02-epicek-es-user-storyk.md`;
3. a kapcsolódó `docs/03-funkcionalis-kovetelmenyek.md` FR-t és AC-kat;
4. releváns NFR/TR elemeket;
5. `docs/07-nyomonkovethetosegi-matrix.md`;
6. szükség esetén `docs/08-ui-ux-terv.md` és `docs/09-rendszerterv-es-szolgaltatasarchitektura.md`.

Ha a dokumentumok ellentmondanak egymásnak:
- NE találj ki saját üzleti szabályt;
- állj meg az érintett scope-nál;
- dokumentáld az ellentmondást.

## 2. Scope szabály

MUST:
- csak a kijelölt US/FR/AC scope-jában módosítani;
- minden módosítást visszavezethetővé tenni követelményre;
- a feladat végén felsorolni a teljesített és nem teljesített AC-kat.

DO NOT:
- új feature-t hozzáadni kérés nélkül;
- új infrastruktúra-komponenst hozzáadni;
- új frameworköt vagy jelentős dependency-t bevezetni jóváhagyás nélkül;
- üzleti követelményt hallgatólagosan megváltoztatni;
- security ellenőrzést csak frontend oldalon implementálni.

## 3. Backend architektúra

Technológia:
- Java 21
- Spring Boot 3.x
- Maven

Rétegek:

```text
controller
service
repository
model/entity
dto
exception
config
security
storage
```

Szabályok:

- Controller csak HTTP input/output, validációs belépési pont és delegálás.
- Üzleti szabály service rétegben.
- Repository csak perzisztencia.
- Fizikai médiafájlhoz kizárólag storage absztrakción keresztül nyúlj.
- Controllerből tilos közvetlen fájlrendszerírás.
- Controllerből tilos összetett repository logikát végrehajtani.
- Entity-t lehetőleg ne adj vissza közvetlenül publikus API DTO-ként.
- Exception kezelés legyen konzisztens és központi.

## 4. Domain szabályok

Kritikus baseline szabályok:

- `Gallery` pontosan egy `Client`-hez tartozik az MVP-ben.
- `MediaAsset` csak létező `Gallery`-hez tartozhat.
- média bináris tartalma NFS-en van, nem SQL BLOB-ban.
- DB relatív storage pathot tárol.
- kliens soha nem adhat meg tetszőleges szerveroldali abszolút pathot.
- új galéria nem publikus.
- ügyfélgaléria csak aktív share tokennel érhető el.
- selection item csak a saját gallery médiájára mutathat.
- új média `downloadEnabled = false`.
- letöltési jog médiaelemenkénti.
- admin engedélyezheti/visszavonhatja.
- publikus download minden kérésnél ellenőrzi:
  1. share aktív;
  2. media a share galleryhez tartozik;
  3. `downloadEnabled == true`.

## 5. Adatbázis

- CockroachDB.
- PostgreSQL JDBC.
- Spring Data JPA.
- Flyway kötelező minden sémaváltozáshoz.
- Productionben ne támaszkodj `ddl-auto=update` sémamenedzsmentre.
- Minden új entity/constraint változásnál készíts migrációt.
- CockroachDB-specifikus viselkedést valódi CockroachDB integrációs teszttel ellenőrizz.

## 6. Média storage

Tervezett logikai struktúra:

```text
galleries/<gallery-uuid>/
├── originals/
├── previews/
├── thumbnails/
└── exports/
```

Első MVP:
- JPEG/JPG.
- Fizikai fájlnév ne közvetlenül user inputból származzon.
- Javasolt UUID-alapú név.
- Storage hiba esetén a feltöltés nem lehet sikeres.
- Ne szivárogtass abszolút pathot API hibában.

## 7. Frontend

Technológia:
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

Szerkezet irány:

```text
src/
├── app/
├── components/
├── features/
├── pages/
├── api/
├── hooks/
├── lib/
└── styles/
```

Szabályok:
- TypeScript `any` kerülendő.
- API-hívások központosított kliensrétegen menjenek.
- Securityt ne frontend route guarddal próbáld megoldani backend ellenőrzés nélkül.
- Design tokeneket használj, ne szétszórt hardcoded színeket.
- Loading, empty és error állapot minden hálózati nézetnél legyen kezelve.
- Ügyfélgaléria mobilon teljes értékűen használható legyen.

## 8. UI baseline

Lásd: `docs/08-ui-ux-terv.md`.

Fő irány:
- meleg cream/bézs;
- mély barna;
- terracotta/copper accent;
- editoriális, képcentrikus megjelenés.

Ne alakítsd generic admin template-té vagy webshop UI-vá.

## 9. Tesztelés

Backend:
- JUnit 5
- Mockito
- MockMvc
- Spring Boot Test

Quality:
- JaCoCo
- Checkstyle
- SpotBugs

Minden üzleti service változáshoz:
- pozitív teszt;
- releváns negatív teszt.

Minden security változáshoz:
- negatív hozzáférési teszt.

DB változáshoz:
- Flyway;
- integrációs teszt.

A feladat nem kész, ha a kapcsolódó kritikus AC nincs tesztelve.

## 10. Build / ellenőrző parancsok

A repository skeleton fázisban ezek a fájlok még létrejöhetnek később.

Ha `backend/pom.xml` létezik:

```bash
cd backend
mvn clean verify
```

Ha `frontend/package.json` létezik:

```bash
cd frontend
npm ci
npm run lint
npm run build
```

Ha a projekt definiál `npm run typecheck` vagy `npm test` parancsot, azokat is futtasd.

Docker konfiguráció esetén:

```bash
docker compose -f deploy/compose.production.yml config
```

Soha ne állítsd, hogy a tesztek sikeresek, ha nem futtattad őket.

## 11. Security

DO NOT:
- secretet commitolni;
- jelszót logolni;
- full share tokent normál logba írni;
- production DB credentialt forrásba tenni;
- Proxmox/iLO/NFS/CockroachDB szolgáltatást publikus webbel azonos módon kitenni.

MUST:
- secret környezeti változóból / CI secretből;
- password hashing;
- backend authorization;
- path traversal védelem;
- fájltípus és méret validáció.

## 12. CI/CD

Tervezett workflow-k:

```text
quality-ci.yml
cockroach-integration-check.yml
production-image-build.yml
production-deploy.yml
```

Self-hosted runnerre untrusted PR kódot ne futtass.

Production image csak sikeres quality gate után épülhet.

## 13. Dokumentáció

Ha a megvalósítás követelményt változtatna:
- NE változtasd meg csendben a kód kedvéért;
- előbb jelöld a szükséges docs módosítást.

Ha új feature jóváhagyott:
1. BR/US szükség szerint;
2. FR + AC;
3. NFR/TR;
4. TC;
5. traceability.

## 14. Codex feladatlezárás

A válaszod végén mindig add meg:

1. módosított fájlok;
2. megvalósított US/FR;
3. teljesített AC-k;
4. futtatott tesztek/parancsok és eredmény;
5. nem teljesített AC vagy nyitott kérdés;
6. új dependency, migráció vagy security-hatás.

Ha valamelyik kritikus AC nem teljesül, a feladat nem tekinthető késznek.

## Kommentelési nyelv

- Az újonnan írt forráskód-kommentek, SQL-migrációs megjegyzések és
  konfigurációs magyarázatok magyar nyelvűek legyenek.
- A technikai azonosítókat, API-neveket, konfigurációkulcsokat, SQL-kulcsszavakat
  és külső eszközök által előírt elnevezéseket nem kell lefordítani.
- Meglévő angol kommenteket csak az érintett feladat scope-jában kell magyarítani;
  külön kérés nélkül ne történjen teljes repository-szintű átírás.
  