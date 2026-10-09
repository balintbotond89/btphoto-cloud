# BTPhoto Frontend

Az első frontend walking skeleton Astro 7 és TypeScript alapú, statikusan építhető felület. A kezdőoldal a Spring Boot backend publikus `GET /api/health` végpontját ellenőrzi, és kezeli a betöltési, sikeres, hibás és újrapróbálási állapotot.

## Technológiai alap

- Astro 7
- TypeScript 6 szigorú típusrendszerrel
- Tailwind CSS 4 buildintegráció
- Astro komponensek és minimális natív kliensoldali TypeScript
- Vitest + jsdom
- ESLint Astro- és TypeScript-szabályokkal
- helyben csomagolt Archivo, IBM Plex Sans és IBM Plex Mono betűkészlet

A statikus Astro-komponensek alapértelmezetten nem küldenek komponens-futtatókörnyezetet a böngészőbe. Kliensoldali JavaScript csak az interaktív témaváltáshoz és a health végpont lekéréséhez töltődik be.

## Megjelenés és témakezelés

A felület a `docs/08-ui-ux-terv.md` designrendszerét követi:

- ipari-editoriális, fotóközpontú vizuális nyelv;
- világos és sötét tokenkészlet;
- első látogatáskor rendszerbeállítás szerinti téma;
- a kézi témaválasztás megőrzése a böngészőben;
- erős fókuszjelzés és billentyűzetes használhatóság;
- mozgáscsökkentési rendszerbeállítás tiszteletben tartása.

## Helyi futtatás

A backend indítása a repository gyökeréből:

```powershell
Set-Location .\backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=no-database"
```

A frontend indítása egy második terminálban:

```powershell
Set-Location .\frontend
npm.cmd ci
npm.cmd run dev
```

A fejlesztői szerver címe: `http://localhost:5173`. A fejlesztői proxy az `/api` kéréseket a `http://localhost:8080` címen futó backendhez továbbítja.

## Ellenőrző parancsok

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
npm.cmd audit --audit-level=high
```

## Környezeti követelmények

- Node.js 24.x
- npm 11.x

A verzióelvárást a `package.json` és a `.nvmrc` is rögzíti.

## Hatókör

Ez a checkpoint nem tartalmaz üzleti admin- vagy galériafunkciót. A cél az Astro buildlánc, a témarendszer, a reszponzív vizuális alap, valamint a frontend–backend kapcsolat igazolása.
