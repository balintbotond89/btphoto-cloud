# Backend

BTPhoto Private Cloud backend walking skeleton.

Technológiai alap:
- Java 21
- Spring Boot 3
- Maven Wrapper
- Spring Web
- Spring Boot Actuator
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

## Indítás

```powershell
.\mvnw.cmd spring-boot:run
```

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

Normatív szabályok:
- `../AGENTS.md`
- `../docs/03-funkcionalis-kovetelmenyek.md`
- `../docs/05-technikai-kovetelmenyek.md`
