# BTPhoto Private Cloud – Fejlesztési baseline v0.3

**Baseline azonosító:** `BTPC-BL-2026-10-11-v0.3`
**Dátum:** `2026-10-11`
**Előző baseline:** `BTPC-BL-2026-10-09-v0.2`
**Cél:** a CockroachDB 26-kompatibilis külön migrációs komponens, a production indítási kapu és az egyszer végrehajtható rollback dokumentációs állapotának rögzítése.

## Baseline hatókör

Ez a baseline a `03-funkcionalis-kovetelmenyek.md`–`09-rendszerterv-es-szolgaltatasarchitektura.md` dokumentumok aktuális állapotát rögzíti. A `BASELINE-v0.1.md` és `BASELINE-v0.2.md` változatlan történeti baseline marad.

## Baseline döntések

- A production adatbázis-migráció a Spring Boot backend indulásától leválasztott, egyszer lefutó Flyway 12.6.2 image feladata.
- A verziózott SQL egyetlen hiteles forrása a `database/migrations/` könyvtár.
- A backend nem tartalmaz Flyway runtime dependency-t, nem hoz létre sémát, és Hibernate `ddl-auto: validate` módban ellenőrzi a migrált állapotot.
- A migrations service minden alkalmazásindítás előtt idempotensen lefuthat; a backend kizárólag `service_completed_successfully` után indulhat.
- Productionben a backend és a migrációs komponens CockroachDB-kapcsolata `sslmode=verify-full` módot használ, a CA runtime read-only mountból érkezik.
- Az alkalmazásfelhasználó nem kap `system`, `crdb_internal` vagy más szélesebb belső CockroachDB-hozzáférést.
- A backend, frontend és migrations production image azonos, teljes, 40 karakteres Git SHA taget és ellenőrzött OCI revision címkét használ.
- A GitHub-hosted CockroachDB 26.2.2 integrációs fixture az első és második migrációs futást, a history állapotot, a hibás kapcsolatot és a backend indítási kapuját ellenőrzi. Az insecure CI-fixture nem helyettesíti a production TLS smoke tesztet.
- A kontrollált deployment rollbackje reentrancy-védett állapotgép: a diagnosztika és stackleállítás pontosan egyszer, a checkout- és env-visszaállítás legfeljebb egyszer hajtható végre.
- Rollback során volume, adatbázis, failed checkout vagy megőrzendő env-backup nem törlődik automatikusan.

## Baseline dokumentumok SHA-256

- `03-funkcionalis-kovetelmenyek.md`
  `5d3b05693909fea67306274030d5d7a34cb6d49cae23c8082100927848f7b439`
- `04-nem-funkcionalis-kovetelmenyek.md`
  `1170cdf78dab9e35a15cd2878b68981211433a9ec1e3c0079829e7c783934736`
- `05-technikai-kovetelmenyek.md`
  `39a02a6af8cab5cf047d7d8e717973d26bc26bde3b9393feffc4c3b912cc0e16`
- `06-teszteset-gyujtemeny.md`
  `0ab5b04daed29743f1087aa619fc0b340e0875d4279ea9f0f6d85765bf8dd3c7`
- `07-nyomonkovethetosegi-matrix.md`
  `4d2be7998da91d73ae1742afffed3a985786e4d8a71432c4fa56859175767878`
- `08-ui-ux-terv.md`
  `3f4f44c12691bc6a50ea479c700ebf730aa7792076ded4f7dc3fb39513698e5f`
- `09-rendszerterv-es-szolgaltatasarchitektura.md`
  `0c4053142b5bbcdd9629d5fa4196ebfd1b83ca2477057cbb74e4dc7e9d3c5043`

## Következő implementációs scope

A repository-oldali változtatások PR- és containeres ellenőrzése után a következő kontrollált lépés a három közös release SHA-jú image production TLS-kapcsolattal végzett `docker01` telepítése és smoke tesztje. E baseline létrehozása önmagában nem jelent image-publikálást, adatbázis-migrációt vagy deploymentet.
