# BTPhoto Frontend

## Regisztrációs UI-01 javítás

A kötelező mező hibája tartós magyar szöveggel, aria-invalid/aria-describedby kapcsolattal és
elsőhibás-fókusszal jelenik meg. A regisztráció ugyanazt a motion canvas-t használja, mint a login.
A Google reCAPTCHA v2 widget nyilvános kulcsát runtime API adja, secret nem jut a frontendhez.
Kulcs/kapcsolat nélkül érthető üzenet látható, beküldési bypass nincs. A helyi no-database backend
használható a konfigurációhiány jelzésének próbájára, de valódi regisztrációra nem.

## Fotósregisztráció és szerepfelületek (CR-0001)

A statikus build öt oldalt tartalmaz: /, /login/, /register/, /admin/, /workspace/.
A /login/ közös; a backend ADMIN szerepe /admin/, PHOTOGRAPHER szerepe /workspace/ célra navigál.
A kliens ezt nem használja backend-authorization helyett.

A regisztráció személyes, cím-, vállalkozási és opcionális avatar-szekciókat tartalmaz.
A vállalkozási checkbox rejtett és disabled fieldsetet aktivál; kikapcsolva nincs business payload.
A megerősítés, UTF-8 bájthossz és megkezdett cím validációja a frontendben is fut,
a backend ugyanezeket önállóan ellenőrzi. Beküldési hibánál a jelszómezők törlődnek,
a nem titkos mezők megmaradnak; személyes adat nincs localStorage-ban vagy URL-ben.
Az űrlapok native fallbackje POST, nem GET.

Az admin első sessionjében kizárólag jelszócsere jelenik meg; regisztrációs API-hívás nem indul.
Normál adminsessionnel a függő kérelmek biztonságos DOM-szövegként jelennek meg.
A jelszócsere után új login kötelező. A fotósoldal kizárólag saját profilt és saját avatarvégpontot kér.
Hiányzó vagy hibás avatar helyett kör alakú monogram látható a közös accountfejlécben.

A kliens API-ja same-origin cookie-t és no-store kéréseket használ; minden író kérés friss CSRF-t kap.
Avatar-előnézethez object URL készül, váltáskor/elhagyáskor felszabadul.
A bfcache-visszatérés nem távolítja el a regisztrációs form működő event handlereit.
A szín-, font-, fókusz- és reduced-motion rendszer változatlan alapokra épül.

A böngészős helyi ellenőrzés nem éles elfogadás: a teljes admin-bootstrap → jóváhagyás → két fotós
login/profil/avatar/logout folyamat külön, valódi backenddel és tartós storage-dzsal bizonyítandó.

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
