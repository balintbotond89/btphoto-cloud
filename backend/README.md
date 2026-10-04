# Backend

BTPhoto Private Cloud backend walking skeleton.

Technológiai alap:
- Java 21
- Spring Boot 3
- Maven Wrapper
- Spring Web
- Spring Boot Actuator
- Spring Data JPA
- Flyway
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

Normatív szabályok:
- `../AGENTS.md`
- `../docs/03-funkcionalis-kovetelmenyek.md`
- `../docs/05-technikai-kovetelmenyek.md`
