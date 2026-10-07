# Frontend

A BTPhoto Private Cloud React frontend walking skeletonje.

## Technológiai alap

- Node.js 24 LTS és npm;
- React 19 és TypeScript;
- Vite;
- Tailwind CSS a `@tailwindcss/vite` pluginnal;
- shadcn/ui-kompatibilis, lokálisan verziózott UI-komponensek;
- Vitest, jsdom és React Testing Library;
- ESLint és külön TypeScript typecheck.

A támogatott Node főverziót az `.nvmrc` és a `package.json` `engines`
mezője rögzíti. A telepítés reprodukálható forrása a verziókövetett
`package-lock.json`.

## Fejlesztés

Telepítés és indítás:

```powershell
npm ci
npm run dev
```

A fejlesztői szerver a relatív `/api` kéréseket a lokális Spring Boot
alkalmazás `http://localhost:8080` címére továbbítja. A backend adatbázis
nélküli, explicit lokális indítása:

```powershell
Set-Location ../backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=no-database
```

Production buildben az API-kliens szintén relatív `/api` útvonalat használ,
így nem tartalmaz környezetspecifikus backend URL-t.

## Minőségi parancsok

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
```

A `npm run test` figyelő módban indítja a Vitestet, a `npm run test:run`
egyszeri ellenőrzést végez.

## Walking skeleton

A kezdőképernyő a központosított, típusos API-klienssel lekéri a
`GET /api/health` végpontot, és loading, sikeres `UP`, illetve hibaállapotot
jelenít meg újrapróbálási lehetőséggel. Az API-válasz futásidőben is
ellenőrzött.

A design system skeleton a `docs/08-ui-ux-terv.md` UI Slice 0 irányát követi:
központi design tokeneket, editoriális tipográfiát, valamint button, input,
card, badge, dialog, toast, loading, empty és error komponenseket biztosít.

Normatív UI terv: `../docs/08-ui-ux-terv.md`.
