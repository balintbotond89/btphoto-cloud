# Backend

## Google reCAPTCHA v2 – UI-01 kiegészítés

A regisztráció backendoldali Google-ellenőrzést követel. Beállítások:
`BTPHOTO_RECAPTCHA_SITE_KEY`, `BTPHOTO_RECAPTCHA_SECRET`, `BTPHOTO_RECAPTCHA_HOSTNAMES`.
Kulcs vagy engedélyezett hostname hiányában nincs bypass; az API 503 CAPTCHA_UNAVAILABLE hibával zár.
A GET /api/auth/registration-config csak a nyilvános site key-t adja ki, secretet nem.
A multipart regisztráció captcha partot kap; a verifier az üzleti DB-/storage-művelet előtt fut.
A kulcsokat nem kell és nem szabad frontend image-be égetni. Valódi kulcs még nincs beállítva.

## CR-0001 account- és regisztrációs szerződés

A backend közös AppUser modellt használ a kompatibilitásból megőrzött admin_user táblán.
V3 hozza létre a singleton system_admin bindingot és a photographer_workspace/profile/business táblákat.
Nincs SQL-be égetett adminjelszó vagy automatikus fiókinicializálás.

A PHOTOGRAPHER szerep csak aktív, APPROVED, saját workspace/profil rekordú fiókhoz tartozik.
ADMIN kizárólag a system_admin id=1 bindinghoz jár. A korlátozott első session csak
/api/auth/me, /api/auth/logout és /api/auth/change-password műveletet enged; a me válaszban
az account szerepe ADMIN marad, a requiresPasswordChange flag igaz.
Minden védett kérés újra ellenőrzi az aktív állapotot, a bindingot és az admin session_version értéket.

Publikus regisztráció alapértelmezett állapota kikapcsolt.
BTPHOTO_REGISTRATION_ENABLED=true csak V3, kész adminjelszó-csere és ellenőrzött tartós NFS mellett működik.
Multipart POST /api/auth/register: data JSON part + opcionális avatar; CSRF kötelező.
A profil lekérdezése /api/photographer/profile, avatarkiadása /api/photographer/profile/avatar.
Az operátor /api/admin/registrations alatt legfeljebb 100 függő kérelmet kap egyszerre;
elbírálás után a következő batch listafrissítéssel jelenik meg.

### Egyszeri adminprovisionálás – kizárólag külön jóváhagyott operatív lépés

A jóváhagyott release JAR-ja az operator-setup profillal és HTTP-kiszolgálás nélkül indítható:

```shell
java -jar /app/btphoto-backend.jar   --spring.profiles.active=cockroachdb,operator-setup   --spring.main.web-application-type=none
```

A parancs önmagában nem biztosít DB-konfigurációt; a kiadási eljárás adja át a CA-t és a
repositoryn kívüli kapcsolati változókat. Normál backendindításban nincs operator-setup profil.
A secret maszkolt interaktív terminálból érkezik; alternatívája a külön provisionáló folyamat
számára olvasható, owner-only secretfájl és BTPHOTO_BOOTSTRAP_PASSWORD_FILE.
A konkrét ideiglenes jelszó nem lehet argumentum, image-env default vagy repositorytartalom.

Három egymástól elkülönülő művelet létezik:

- Default create: kizárólag hiányzó adminfiók/binding esetén; meglévő rekord nem írható felül.
- Auditált átvétel: BTPHOTO_OPERATOR_ADOPT_USER_ID az ellenőrzött, aktív admin UUID-ja;
  csak bindingot hoz létre, a meglévő hash-t nem változtatja. Fotósmunkaterületű fiók nem vehető át.
- Explicit helyreállítás: BTPHOTO_OPERATOR_RECOVERY_USER_ID a már létező operator UUID-ja;
  külön secretbekéréssel új egyszer használható hitelesítőt állít be és minden régi sessiont visszavon.
  Ez nem automatikus restart/deploy művelet, és nem új admin létrehozása.

Az ideiglenes hitelesítő normál belépéskor egyszer fogyasztható el. A tartós új jelszó
legalább 12 Unicode kódpont, legfeljebb 72 érvényes UTF-8 bájt. A csere után új login szükséges.
A Bootstrap String hasheléshez átmenetileg memóriában létezik; a char buffer törlése
nem jelent JVM-szintű garantált secret-memory zeroizationt.

### Avatar és tranzakció

Az AvatarStorageService adaptere NFS-t követel a BTPHOTO_AVATAR_ROOT alatt.
JPEG/PNG dekódolás előtt 2 MiB, 4096 oldalhossz és 4 MP limit; APNG és más formátum tiltott.
A kimenet 256×256 PNG, középre vágva, eredeti metaadatok nélkül.
A relatív tenant/account/UUID útvonalat a backend képzi; minden olvasás tulajdonosi szűréssel történik.
DB rollback után csak a kérés új fájlja kompenzálható. Ismeretlen commit-állapotnál a fájl megmarad,
azonosító-alapú figyelmeztetés és kézi egyeztetés szükséges; nincs találgató törlés.
A .staging- fájlok és összeomlásból visszamaradt saját célfájlok operatív egyeztetése külön feladat.

A production SQL- és paraméterlogger kikapcsolt, az API-hibák nem idéznek vissza jelszót,
SQL-t vagy elutasított mezőértéket. A SpotBugs öt konkrét Spring DI-konstruktor
EI_EXPOSE_REP2 téves pozitívját külön szűrő dokumentálja; más bugkategória vagy quality gate nem tiltott.

### DB-tesztek korlátja

A CockroachDB repository-tesztek kizárólag loopbackcímes, sslmode=disable eldobható fixture-URL-lel
és BTPHOTO_TEST_FIXTURE=ephemeral-cockroach26 markerrel futnak. Éles sql01-en nem futtathatók.
A helyi no-database / repository-mock tesztek nem igazolják a valódi DB-viselkedést.

BTPhoto Private Cloud backend walking skeleton.

Technológiai alap:
- Java 21
- Spring Boot 3
- Maven Wrapper
- Spring Web
- Spring Boot Actuator
- Spring Data JPA
- PostgreSQL JDBC driver
- Jakarta Bean Validation
- JUnit 5 és MockMvc

## Build és teszt

Windows:

```powershell
.\mvnw.cmd clean verify
```

Linux/macOS:

```bash
./mvnw clean verify
```

## Lokális indítás adatbázis nélkül

A `no-database` profil kizárólag explicit lokális vagy tesztcélú használatra
szolgál. Windows alatt:

```powershell
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=no-database
```

Linux/macOS alatt:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=no-database
```

Aktív profil nélkül az alkalmazás szándékosan nem kap DB nélküli fallbacket.
Deployment során a `cockroachdb` profilt és a kapcsolati változókat explicit
meg kell adni.

Az alkalmazás health végpontja:

```text
GET http://localhost:8080/api/health
```

Elvárt válasz:

```json
{
  "status": "UP"
}
```

## CockroachDB profil

A CockroachDB-integrációhoz aktiváld a `cockroachdb` profilt, és add át az
alábbi környezeti változókat:

- `DB_HOST`
- `DB_PORT` – opcionális, alapértelmezett értéke `26257`
- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_SSL_ROOT_CERT`

Az alkalmazás ezekből állítja össze a JDBC URL-t; teljes `DB_URL` átadása nem
támogatott. A JDBC URL rögzített `sslmode=verify-full` TLS ellenőrzést használ,
ez külső változóval nem gyengíthető. A `DB_HOST` értékének egyeznie kell a
szervertanúsítvány SAN-bejegyzésével. A jelszó, a CA-útvonal és maga a CA
tanúsítvány nem része a repositorynak. Példa profilaktiválás a változók
beállítása után:

```powershell
$env:SPRING_PROFILES_ACTIVE = "cockroachdb"
.\mvnw.cmd spring-boot:run
```

A production sémamigráció nem a backend indulásakor fut. A verziózott SQL
egyetlen hiteles forrása a `../database/migrations/` könyvtár, amelyből külön,
egyszer lefutó Flyway image készül. A backend csak a migráció sikeres
befejezése után indul, és a `cockroachdb` profilban a Hibernate
`ddl-auto: validate` beállítással kizárólag ellenőrzi a meglévő sémát.

Normatív szabályok:
- `../AGENTS.md`
- `../docs/03-funkcionalis-kovetelmenyek.md`
- `../docs/05-technikai-kovetelmenyek.md`
