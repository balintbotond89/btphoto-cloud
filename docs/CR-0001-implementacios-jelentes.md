# CR-0001 – Fotósregisztráció és üzemeltetői jóváhagyás: implementációs jelentés

**Követelménydöntés és első ellenőrzések:** 2026-10-14\
**Végső helyi quality gate és jelentés:** 2026-10-15; megismételt zárókapu: 2026-10-16\
**Ág:** `feature/photographer-registration`\
**Kiinduló HEAD:** `d2d7216f76feac3419ea3b4aa390bf1bded6e4d3`\
**Státusz:** repository-implementáció helyileg ellenőrzött; PR-, kiadási és production elfogadás nyitott.

**2026-10-15-i UI-01 után frissítve:** tartós mezőhiba, kért szövegcserék, regisztrációs motion canvas és Google reCAPTCHA v2 frontend/backend bekötés. A [kiegészítés](CR-0001-UI-01-regisztracios-javitasok.md) új AC-FR-AUT-0002-07 eleme miatt 26 kritérium érvényes. Valódi Google-kulcs még nincs; hiányában nincs regisztrációs bypass.

A HEAD a kiinduló commitot azonosítja, nem az új implementáció commitja. A korábbi fejezetek commit/push előtti checkpointokat rögzítenek. A 2026-10-16-i felhasználói jóváhagyás külön regisztrációs és staging/CD commitot, valamint normál push-t engedélyezett; az új commitazonosítókat a Git-előzmény és az átadási válasz rögzíti. PR-létrehozás, merge vagy deployment nem része ennek a jóváhagyásnak. A munkafában korábban megkezdett login-vizuális javítások megmaradtak.

## 1. Követelmény és megvalósítás

Az elfogadott [CR-0001 terv](CR-0001-fotos-regisztracio-terv.md) és a [v0.4 baseline](BASELINE-v0.4.md) alapján US-0015, US-0016 és az aktuális account/profile/avatar határig US-0017 valósult meg. Kapcsolódó FR-ek: FR-AUT-0002/0003, FR-PRF-0001/0002, FR-TEN-0001. A követelménylánc és a tesztkapcsolatok a 07-es nyomonkövethetőségi dokumentumban szerepelnek. Az ügyfél-, galéria-, média-, megosztási és proofingmodulok teljes megvalósítása nem része ennek a ciklusnak.

A nyilvános regisztráció vezetéknév, utónév, megszólítás, e-mail, jelszó és megerősítése, telefon/mobil, strukturált lakhely/telephely, feltételes vállalkozási adatok és opcionális avatar kezelését biztosítja. A backend validálja az adatokat; a jogosultság, workspace és aktív állapot nem a kliens bemenetéből származik. A beküldés PENDING, inaktív fiókot és saját munkaterületet/profilt hoz létre, hitelesített session nélkül. A vállalkozási mezőket a checkbox engedélyezi, de a feltételes szabály backendoldalon is kötelező.

A közös login után ADMIN az üzemeltetői `/admin/`, PHOTOGRAPHER a saját `/workspace/` felületre kerül. Az operátor legfeljebb 100 függő kérelmet kap egyszerre, jóváhagyhat vagy elutasíthat, és jelszót változtathat. Elbírálás után frissül a lista. Fotós nem kap üzemeltetői jogot; az üzemeltető nem kap általános fotóstartalom-hozzáférést.

A fizikai `admin_user` tábla megmaradt, az alkalmazási modellt az AppUser váltotta fel. A V3 migráció jóváhagyási mezőket, `system_admin`, `photographer_workspace`, `photographer_profile` és `photographer_business` táblákat ad hozzá. A workspace/profil tulajdonosi egyezését kompozit idegen kulcs is védi. V1 és V2 nem változott. Az új SQL nem hoz létre felhasználót, jelszót vagy hash-fixture-t.

A `system_admin` fix `id=1` elsődleges kulcsa és CHECK feltétele legfeljebb egy bindingot enged; ez önmagában nem hoz létre működő adminfiókot. A külön, HTTP nélkül futó `operator-setup` profil létrehozást, auditált legacy átvételt vagy explicit helyreállítást végezhet. Az átvétel nem írja át a meglévő hash-t. A kezdeti hitelesítő maszkolt terminálból vagy owner-only secretfájlból érkezhet; konkrét értéke nincs a repositoryban. Első sikeres hitelesítésének fogyasztása feltételes DB-művelet. A korlátozott session jóváhagyás helyett kizárólag saját sessionlekérdezést, logoutot és kötelező jelszócserét enged. A normál jelszócsere aktuális jelszót és CSRF-t igényel, és a session_version módosításával a korábbi admin-sessionök visszavonhatók. Reboot/deploy nem inicializál automatikusan új hitelesítőt.

Az avatar JDK ImageIO feldolgozással készül. A 2 MiB-os bemeneti limit, a 4096 pixeles oldalhossz- és 4 MP-es képméretkorlát dekódolás előtt ellenőrzött. Csak valódi JPEG/PNG fogadható el, APNG/animáció, SVG és egyéb formátum nem. A kimenet középre vágott 256×256 PNG, az eredeti metaadatok átvitele nélkül. A relatív útvonalat a backend képezi: `tenants/<workspace>/avatars/<account>/<uuid>.png`. Az NFS-adapter tulajdonost ellenőriz olvasáskor és kompenzációkor is. A frontend kör alakú avatart vagy monogramot jelenít meg.

## 2. Programozási és biztonsági elvek

A controller–service–repository rétegzés elválasztja a HTTP-szerződést, az üzleti döntést és a perzisztenciát. DTO-k korlátozzák a visszaadott adatokat; entity vagy hash nem válik publikus API-válasszá. A konstruktoros dependency injection és az AvatarStorageService interfész elválasztja az üzleti folyamatot az NFS-adaptertől. A system_admin adatbázis-invariánsa nem JVM-szintű GoF Singleton: több backendpéldány mellett is a DB-korlát védi az egyetlen bindingot.

A regisztráció DB-tranzakciót és célzott fájlkompenzációt használ, nem állít elosztott ACID-tranzakciót a DB és az NFS között. Bizonyított rollback után csak az adott kérés új képe távolítható el. Ismeretlen commitállapotban a fájl megmarad és azonosítóalapú figyelmeztetés készül; az egyeztetés operatív feladat. Folyamatösszeomlás után visszamaradó staging-/célfájlok teljes automatikus reconciliációja nem része a ciklusnak.

A szerep és tenantkontekstus szerveroldali, és minden védett kérésnél friss account-/binding-/sessionverzió-ellenőrzés történik. A legacy, binding nélküli aktív rekord nem válik automatikusan adminná. Hiányzó adatbázis vagy tároló esetén nincs in-memory production fallback. A regisztráció alapértelmezetten kikapcsolt; a bekapcsolás nem helyettesíti az operator- és NFS-készültség ellenőrzését.

A böngésző same-origin session cookie-t használ, minden állapotváltoztató API-hívás előtt friss CSRF-t kér. Jelszó és token nem kerül localStorage-ba, URL-be vagy naplóba; a secretet tartalmazó HTML-formok JavaScript nélkül sem GET-kéréssel működnek. Az oldal elhagyásakor a jelszó és személyes nézet törlődik/elrejtődik; bfcache-visszatéréskor a védett nézet friss sessiont követel. Az avatar object URL-jei felszabadulnak. Személyes szöveg DOM-szövegként, nem HTML-ként jelenik meg.

A regisztrációs limiter egy backend memóriájában 5 kísérletet enged 10 percenként, ellenőrzött klienscím szerint. A gateway saját peer-címével felülírja az X-BTPhoto-Client-IP fejlécet; a backend csak a konfigurált caddy peerből bízik benne. Az SSH-alagút mögötti tesztelőket közös címlimit érintheti. A végső ellenőrzés URL-normalizálási javítást is hozott: a kódolt regisztrációs útvonal sem kerülheti meg a limitert. A limiter nem elosztott DDoS-védelem, és újraindításkor nullázódik.

A production SQL-/bind-/SQL-exception logger kikapcsolt. Az API-hibák nem idéznek vissza elutasított jelszót vagy SQL-t. A SpotBugs szűrő öt konkrét Spring DI-konstruktor EI_EXPOSE_REP2 találatát kezeli célzottan; nem globális kategóriakikapcsolás. Új framework vagy dependency nem került be. A CA továbbra is read-only, a root fájlrendszer read-only, a capabilityk korlátozottak és no-new-privileges érvényes. Kizárólag az avatar alkönyvtára tervezett írható bind; a teljes médiatár nincs átadva.

## 3. Helyi mérés és bizonyítékhatár

A 2026-10-15-i végső futások eredménye:

| Ellenőrzés | Eredmény | Bizonyíték / korlát |
| --- | --- | --- |
| Java / Maven JVM | Java 21.0.8; Maven Wrapper 3.9.11 | A build is Java 21-et használ |
| `mvnw.cmd -B -ntp clean verify` | BUILD SUCCESS; 59 tesztből 52 sikeres, 7 kihagyott; 0 failure/error | `backend/target/surefire-reports/TEST-*.xml`; nem verziózott buildartifact |
| Checkstyle / SpotBugs | 0 violation; 0 bug/error | Célzott DI-szűrő aktív; JaCoCo jelentés elkészült, külön új coverageküszöb nincs állítva |
| Node / npm | v24.21.0 / 11.19.0 | Meglévő toolchain |
| `npm.cmd run check` | 62 fájl, 0 error/warning/hint | Astro/TypeScript |
| `npm.cmd run lint` | sikeres, 0 warning | ESLint |
| `npm.cmd run test:run` | 15 fájl, 90/90 teszt | Vitest/jsdom; nem valódi végponti E2E |
| `npm.cmd run build` | sikeres, 5 statikus oldal | `/`, `/login/`, `/register/`, `/admin/`, `/workspace/` |
| `npm.cmd audit --audit-level=high` | 0 ismert sérülékenység | A mérés idejére érvényes dependency-audit |
| Workflow/Compose YAML | érvényes; 3 job, 4 szolgáltatás | Meglévő YAML-parserrel |
| Workflow shellblokkok / POSIX validator | 8/8 `bash -n`; `sh -n` sikeres | Szintaktikai ellenőrzés, nem konténerfuttatás |

A korábbi 44 sikeres backendteszthez a kódolt URL limiter-regressziója egy, az UI-01 CAPTCHA- és API-tesztek további hét sikeres tesztet adtak. A meglévő Mockito/Byte Buddy dinamikus agent figyelmeztetés megmaradt, a quality gate-et nem buktatta.

Az AccountFlowIntegrationTest 12 tesztje valós service/security kóddal, MockMvc-val és repository-mockokkal ellenőriz; a Google-verifier ebben a tesztosztályban mockolt. A külön RecaptchaVerifierTest hat HTTP-fixture tesztje nem hív valódi Google-végpontot. Az AuthSecurityIntegrationTest további 11 biztonsági tesztet tartalmaz. A mockolt repository nem CockroachDB-bizonyíték. A hat új AccountRepositoryCockroachTest és az egy meglévő AdminUserRepositoryCockroachTest helyben feltételesen kihagyott: nincs helyi Docker/eldobható CockroachDB-fixture. A production docker01 létezése nem jelent felhatalmazást éles DB-n tesztelésre. A tesztek kizárólag loopbackes, `sslmode=disable` eldobható fixture-t és explicit `BTPHOTO_TEST_FIXTURE=ephemeral-cockroach26` markert fogadnak el.

A regisztrációs oldal 2026-10-14-i böngészős vizsgálata 390, 768 és 1280 px szélességen, világos és sötét témában történt. Mind a hat kombinációban a dokumentum scrollWidth és clientWidth egyezett, vízszintes túlcsordulás nélkül. A mért clientWidth értékek 375, 753 és 1265 px voltak; mobilon egy-, a nagyobb nézeteken kétoszlopos űrlap jelent meg. A vállalkozási mezők kapcsolása, a megszólításválasztás és a billentyűzetes fókusz ellenőrzött. Meglévő képfájlok: `btphoto-register-desktop.png` és `btphoto-register-mobile-dark.png`, a feladathoz tartozó helyi vizuális artifactkönyvtárban. Ezek nem production- és nem hitelesített account-E2E bizonyítékok. A teljes akadálymentességi megfelelőség nem állítható e mérés alapján.

## 4. Read-only infrastruktúra- és Compose-ellenőrzés

A 2026-10-14-i, kizárólag olvasási audit szerint `/srv/btphoto/media` a `192.168.60.2:/media` NFSv4.2 megosztás mountja volt; az `avatars` alkönyvtár nem létezett. Könyvtárat, tulajdonost vagy jogosultságot ez a munka nem módosított. A Compose `/srv/btphoto/media/avatars` → `/srv/btphoto/avatars` bindot ír elő, `create_host_path:false` mellett: hiányzó NFS-forrásból nem készülhet csendben helyi pótlókönyvtár.

A szerveren valódi `docker compose config --format json` történt, új Compose-tartalommal, kizárólag dummy envvel, production env olvasása nélkül. Nem történt `up`, pull, SQL-művelet vagy volume-/network-létrehozás. A feloldott konfigurációt a validator elfogadta; hét negatív változatot elutasított: read-only avatar, hibás forrás, extra mount, hibás regisztrációs kapcsoló, hiányzó trusted proxy, hibás célútvonal és automatikus hostkönyvtár-létrehozás. Ez konfigurációs bizonyíték, nem NFS-runtime teszt vagy a teljes production állapotváltozatlanságának snapshotja.

## 5. CI és kiadási kapuk

A production-image-build workflow három jobos szerkezete megmaradt. A PR ellenőrzi a deployment-szerződést, és backend/frontend/migrations image-et épít. Az új backend image-ben az AvatarCodecProbe a végleges JRE JPEG/PNG képességét vizsgálja. A migrations fixture V1/V2/V3 historyt, új táblákat és repository-/konkurenciateszteket vár el. Az avatar bind negatív fixture-jei bekerültek. Az account-contract `tenant-v1` OCI-címke kiadási marker, nem önmagában biztonsági bizonyíték.

Ezek az új konténeres lépések ebben a ciklusban még nem futottak le GitHubon, mert nem történt push. A main image-publikálás változatlanul csak sikeres main-push Quality CI workflow_run után, annak head_sha commitjából engedett. A három saját image azonos teljes Git SHA taget használ. A PR publikáló job kihagyása szándékos. Automatikus production deployment nincs hozzáadva.

A `deploy/controlled-deploy.sh` ebben a scope-ban szándékosan nem változott. **A jelenlegi script nem használható a CR-0001 új release-ének biztonságos élesítésére.** Külön operatív feladat az avatar runtime mount-engedélylista és a tenant-kompatibilitási rollback-gate. SystemAdmin/bootstrap vagy fotósadat jelenlétében a korábbi, minden aktív fióknak ADMIN szerepet adó backend nem indítható automatikus fallbackként. A DB migráció visszavonását nem szabad image-/checkout-rollbacknek tekinteni.

## 6. AC-státusz – az eredeti 25 és az UI-01 új kritériuma

A „helyileg igazolt” az adott szabály automatizált vagy böngészős helyi bizonyítékát jelenti, nem végleges production elfogadást. A teljes CR lezárása az egy ADMIN + két valódi PHOTOGRAPHER DB/NFS/böngészős forgatókönyvig nyitott.

| AC | Helyi megvalósítás/bizonyíték | Nyitott elfogadási elem |
| --- | --- | --- |
| AC-FR-AUT-0002-01 | PENDING/inaktív account + saját workspace/profil, nincs session; MockMvc igazolt | Valódi DB-tranzakció és E2E |
| AC-FR-AUT-0002-02 | Validáció, duplikált kérés elutasítása igazolt | Párhuzamos egyediség valódi DB-fixture |
| AC-FR-AUT-0002-03 | PENDING/REJECTED login tiltása igazolt | Production forgatókönyv |
| AC-FR-AUT-0002-04 | Jóváhagyás, aktiválás és PHOTOGRAPHER login igazolt | Valódi DB + böngésző |
| AC-FR-AUT-0002-05 | Hamis szerep, fotós adminművelete és CSRF-hiány elutasított | Production negatív próba |
| AC-FR-PRF-0001-01 | Feltételes vállalkozási mezők és backendvalidáció igazolt | Valódi regisztrációs E2E |
| AC-FR-PRF-0001-02 | Saját profil és idegen profil tiltása, minimális me DTO igazolt | Valódi kétfotós DB-fixture |
| AC-FR-PRF-0002-01 | Normalizált avatar és fejléc/monogram kódja elkészült; storage-fixture igazolt | Belépés utáni teljes böngészős avatar-E2E |
| AC-FR-PRF-0002-02 | Tiltott/sérült/túlméretes/APNG/path és storage/rollback negatív fixture igazolt | Valódi DB/NFS hibaforgatókönyv |
| AC-FR-AUT-0002-06 | Főoldali linkek, hat méret/téma nézet és célzott billentyűzetkezelés helyileg ellenőrzött | Production oldal és teljes elfogadási folyamat |
| AC-FR-PRF-0002-03 | Új storage-példányból visszaolvasás és mount-szerződés igazolt | Valódi NFS + backend-/konténerrestart + runtime security |
| AC-FR-AUT-0003-01 | Provisionálás és singleton DB-korlát elkészült; lokális service-tesztek zöldek | Konkurens DB-teszt, valódi operator-provisionálás |
| AC-FR-AUT-0003-02 | Operátori jóváhagyás és fotós hozzáférés-tiltás igazolt | Valódi E2E |
| AC-FR-AUT-0003-03 | Operátor fotós profil/API-hozzáférése tiltott | Galéria/média modulok még nem implementáltak |
| AC-FR-AUT-0003-04 | Közös login és szerepkörhelyes céloldalak frontendtesztje zöld | Valódi szerepkörös böngészős login |
| AC-FR-AUT-0003-05 | Egyszeri korlátozott session, reuse és jóváhagyás tiltása igazolt | Kezdeti fogyasztás konkurens DB-próbája |
| AC-FR-AUT-0003-06 | Kötelező csere, új login és explicit recovery elkészült, helyileg tesztelt | Valódi provisionálás + reboot/deploy elfogadás |
| AC-FR-AUT-0003-07 | Aktuális jelszó/CSRF és régi sessionök visszavonása igazolt | Valódi DB/böngészős több-session próba |
| AC-FR-TEN-0001-01 | Kétfotós profil MockMvc- és avatar-storage izoláció igazolt | Valódi DB/NFS + két böngészős fotós |
| AC-FR-TEN-0001-02 | Idegen ID/hamis workspace nem nyit idegen profilt | Valódi DB/E2E; későbbi erőforrások külön |
| AC-FR-TEN-0001-03 | Profil/workspace kompozit FK elkészült | DB-teszt; ügyfél/galéria/média/selection modulok későbbi scope |
| AC-FR-TEN-0001-04 | Követelmény és tenant-szerződés rögzített | Share/download/workflow még nincs implementálva |
| AC-FR-TEN-0001-05 | Saját tenantprefix és idegen fájl/path tiltása storage-fixture-ben igazolt | Valódi NFS és HTTP-elfogadás |
| AC-FR-TEN-0001-06 | Profillekérdezés saját tulajdonosra szűrt | Üzleti lista/keresés/darabszám moduljai még nincsenek készen |
| AC-FR-TEN-0001-07 | Kockázat és külön kiadási gate dokumentált; tenant-v1 image-marker elkészült | Deployment script módosítása és rollback-kompatibilitási teszt nincs kész |
| AC-FR-AUT-0002-07 | Google v2 widget, szerveroldali fail-closed verifier, hostname-/lejárat-/hiba-fixture és preflight elkészült | Valódi kulcspár/domainhelyes Google-widget és tokenellenőrzés nincs elfogadva |

## 7. Következő, külön engedélyezendő lépések

1. Célzott commit/push és PR, majd valódi GitHub-hosted image-, V3-, CockroachDB-, konkurencia- és JRE-codec gate. A helyi kihagyott teszt nem jelent sikeres CI-t.
2. Operatív terv és jóváhagyás a NFS avatar-alkönyvtárhoz, UID/GID 10001 írhatóságához, a deployment mount-engedélylistájához és a legacy rollback tiltásához. A regisztráció addig false marad.
3. Régi accountok auditja, a megfelelő create/adopt/recover eljárás kiválasztása, a secret repositoryn kívüli átadása, kontrollált V3/operator-jelszócsere és deployment. Egyik művelet sem futott le ebben a fejlesztésben.
4. Egy ADMIN + két PHOTOGRAPHER: regisztráció → pending login tiltása → elbírálás → szerepkörös login → saját profil/avatar → idegen adatok tiltása → logout, továbbá restart utáni avatar és session-visszavonás. Az eredményről külön elfogadási bizonyíték szükséges.

## 8. Fájlleltár

A UI-01 után frissített munkafa 126 érintett fájlt tartalmaz. M = módosított, A = új/untracked, D = törölt tracked fájl. A régi AdminUser/AdminUserRepository/AdminUserDetailsService és teszt közös AppUser/account implementációra váltott; forrásuk Git HEAD-ből helyreállítható. Production adatot vagy fájlt ez a munka nem törölt.

| Állapot | Fájl |
| --- | --- |
| M | `.github/workflows/README.md` |
| M | `.github/workflows/production-image-build.yml` |
| M | `README.md` |
| M | `backend/Dockerfile` |
| M | `backend/README.md` |
| M | `backend/pom.xml` |
| D | `backend/src/main/java/hu/btphoto/admin/model/AdminUser.java` |
| D | `backend/src/main/java/hu/btphoto/admin/repository/AdminUserRepository.java` |
| M | `backend/src/main/java/hu/btphoto/auth/controller/AuthController.java` |
| M | `backend/src/main/java/hu/btphoto/auth/controller/AuthExceptionHandler.java` |
| M | `backend/src/main/java/hu/btphoto/auth/dto/AuthenticatedAdminResponse.java` |
| M | `backend/src/main/java/hu/btphoto/auth/dto/CsrfTokenResponse.java` |
| M | `backend/src/main/java/hu/btphoto/auth/dto/LoginRequest.java` |
| M | `backend/src/main/java/hu/btphoto/auth/service/AuthService.java` |
| M | `backend/src/main/java/hu/btphoto/exception/ApiErrorResponse.java` |
| D | `backend/src/main/java/hu/btphoto/security/AdminUserDetailsService.java` |
| M | `backend/src/main/java/hu/btphoto/security/SecurityConfig.java` |
| M | `backend/src/main/resources/application-cockroachdb.yml` |
| M | `backend/src/main/resources/application.yml` |
| M | `backend/src/test/java/hu/btphoto/FlywayMigrationResourceTest.java` |
| M | `backend/src/test/java/hu/btphoto/admin/AdminUserRepositoryCockroachTest.java` |
| M | `backend/src/test/java/hu/btphoto/auth/AuthSecurityIntegrationTest.java` |
| D | `backend/src/test/java/hu/btphoto/security/AdminUserDetailsServiceTest.java` |
| M | `deploy/.env.production.example` |
| M | `deploy/Caddyfile` |
| M | `deploy/README.md` |
| M | `deploy/compose.production.yml` |
| M | `deploy/validate-production-config.sh` |
| M | `docs/01-uzleti-kovetelmenyek.md` |
| M | `docs/02-epicek-es-user-storyk.md` |
| M | `docs/03-funkcionalis-kovetelmenyek.md` |
| M | `docs/04-nem-funkcionalis-kovetelmenyek.md` |
| M | `docs/05-technikai-kovetelmenyek.md` |
| M | `docs/06-teszteset-gyujtemeny.md` |
| M | `docs/07-nyomonkovethetosegi-matrix.md` |
| M | `docs/08-ui-ux-terv.md` |
| M | `docs/09-rendszerterv-es-szolgaltatasarchitektura.md` |
| M | `frontend/README.md` |
| M | `frontend/src/api/auth.test.ts` |
| M | `frontend/src/api/auth.ts` |
| M | `frontend/src/components/auth/LoginForm.astro` |
| M | `frontend/src/components/ui/Input.astro` |
| M | `frontend/src/pages/admin/index.astro` |
| M | `frontend/src/pages/index.astro` |
| M | `frontend/src/pages/login.astro` |
| M | `frontend/src/scripts/admin-session.test.ts` |
| M | `frontend/src/scripts/admin-session.ts` |
| M | `frontend/src/scripts/login-form.test.ts` |
| M | `frontend/src/scripts/login-form.ts` |
| M | `frontend/src/styles/globals.css` |
| A | `backend/config/spotbugs/di-exclusions.xml` |
| A | `backend/docker/AvatarCodecProbe.java` |
| A | `backend/src/main/java/hu/btphoto/account/model/AppUser.java` |
| A | `backend/src/main/java/hu/btphoto/account/model/ApprovalStatus.java` |
| A | `backend/src/main/java/hu/btphoto/account/model/SystemAdmin.java` |
| A | `backend/src/main/java/hu/btphoto/account/repository/AppUserRepository.java` |
| A | `backend/src/main/java/hu/btphoto/account/repository/SystemAdminRepository.java` |
| A | `backend/src/main/java/hu/btphoto/account/service/AccountStore.java` |
| A | `backend/src/main/java/hu/btphoto/admin/config/OperatorSetupRunner.java` |
| A | `backend/src/main/java/hu/btphoto/admin/controller/ApprovalController.java` |
| A | `backend/src/main/java/hu/btphoto/admin/service/ApprovalService.java` |
| A | `backend/src/main/java/hu/btphoto/admin/service/OperatorProvisioningService.java` |
| A | `backend/src/main/java/hu/btphoto/auth/dto/PasswordChangeRequest.java` |
| A | `backend/src/main/java/hu/btphoto/auth/service/PasswordChangeService.java` |
| A | `backend/src/main/java/hu/btphoto/exception/ApiProblem.java` |
| A | `backend/src/main/java/hu/btphoto/profile/controller/ProfileController.java` |
| A | `backend/src/main/java/hu/btphoto/profile/dto/AddressRequest.java` |
| A | `backend/src/main/java/hu/btphoto/profile/dto/BusinessRequest.java` |
| A | `backend/src/main/java/hu/btphoto/profile/dto/ProfileResponse.java` |
| A | `backend/src/main/java/hu/btphoto/profile/model/PhotographerBusiness.java` |
| A | `backend/src/main/java/hu/btphoto/profile/model/PhotographerProfile.java` |
| A | `backend/src/main/java/hu/btphoto/profile/repository/PhotographerBusinessRepository.java` |
| A | `backend/src/main/java/hu/btphoto/profile/repository/PhotographerProfileRepository.java` |
| A | `backend/src/main/java/hu/btphoto/profile/service/ProfileService.java` |
| A | `backend/src/main/java/hu/btphoto/registration/controller/RegistrationController.java` |
| A | `backend/src/main/java/hu/btphoto/registration/dto/RegistrationRequest.java` |
| A | `backend/src/main/java/hu/btphoto/registration/service/RecaptchaVerifier.java` |
| A | `backend/src/main/java/hu/btphoto/registration/service/RegistrationLimiter.java` |
| A | `backend/src/main/java/hu/btphoto/registration/service/RegistrationRateFilter.java` |
| A | `backend/src/main/java/hu/btphoto/registration/service/RegistrationService.java` |
| A | `backend/src/main/java/hu/btphoto/security/AccountPrincipal.java` |
| A | `backend/src/main/java/hu/btphoto/security/AccountSessionFilter.java` |
| A | `backend/src/main/java/hu/btphoto/security/AccountUserDetailsService.java` |
| A | `backend/src/main/java/hu/btphoto/security/PasswordPolicy.java` |
| A | `backend/src/main/java/hu/btphoto/security/TrustedClientAddress.java` |
| A | `backend/src/main/java/hu/btphoto/storage/AvatarStorageService.java` |
| A | `backend/src/main/java/hu/btphoto/storage/NfsAvatarStorageService.java` |
| A | `backend/src/main/java/hu/btphoto/workspace/model/PhotographerWorkspace.java` |
| A | `backend/src/main/java/hu/btphoto/workspace/repository/PhotographerWorkspaceRepository.java` |
| A | `backend/src/test/java/hu/btphoto/ProductionConfigurationTest.java` |
| A | `backend/src/test/java/hu/btphoto/TestTransactions.java` |
| A | `backend/src/test/java/hu/btphoto/account/AccountFlowIntegrationTest.java` |
| A | `backend/src/test/java/hu/btphoto/account/AccountRepositoryCockroachTest.java` |
| A | `backend/src/test/java/hu/btphoto/admin/OperatorProvisioningTest.java` |
| A | `backend/src/test/java/hu/btphoto/registration/RegistrationCompensationTest.java` |
| A | `backend/src/test/java/hu/btphoto/registration/RegistrationLimiterTest.java` |
| A | `backend/src/test/java/hu/btphoto/registration/service/RecaptchaVerifierTest.java` |
| A | `backend/src/test/java/hu/btphoto/security/AccountUserDetailsServiceTest.java` |
| A | `backend/src/test/java/hu/btphoto/security/PasswordPolicyTest.java` |
| A | `backend/src/test/java/hu/btphoto/storage/AvatarStorageTest.java` |
| A | `database/migrations/V3__photographer_accounts.sql` |
| A | `docs/BASELINE-v0.4.md` |
| A | `docs/CR-0001-UI-01-regisztracios-javitasok.md` |
| A | `docs/CR-0001-fotos-regisztracio-terv.md` |
| A | `docs/CR-0001-implementacios-jelentes.md` |
| A | `frontend/src/api/accounts.test.ts` |
| A | `frontend/src/api/accounts.ts` |
| A | `frontend/src/components/AccountHeader.astro` |
| A | `frontend/src/components/auth/RegisterForm.astro` |
| A | `frontend/src/components/profile/AddressFields.astro` |
| A | `frontend/src/components/ui/Select.astro` |
| A | `frontend/src/pages/register.astro` |
| A | `frontend/src/pages/workspace/index.astro` |
| A | `frontend/src/scripts/account-identity.ts` |
| A | `frontend/src/scripts/form-validation.ts` |
| A | `frontend/src/scripts/operator.test.ts` |
| A | `frontend/src/scripts/operator.ts` |
| A | `frontend/src/scripts/protected-history.test.ts` |
| A | `frontend/src/scripts/protected-history.ts` |
| A | `frontend/src/scripts/recaptcha.test.ts` |
| A | `frontend/src/scripts/recaptcha.ts` |
| A | `frontend/src/scripts/registration-form.test.ts` |
| A | `frontend/src/scripts/registration-form.ts` |
| A | `frontend/src/scripts/workspace.ts` |
| A | `frontend/src/test/account.ts` |
| A | `frontend/src/test/forms-contract.test.ts` |

A történeti BASELINE-v0.1/v0.2/v0.3, V1/V2 SQL és a controlled-deploy.sh változatlan. A még nem commitolt v0.4 baseline tizenegy követelményfájl SHA-256 értékét rögzíti, beleértve az UI-01 kiegészítést. Nincs production elfogadás, commit vagy push.

## 9. UI-01 mezőelrendezési regresszió javítása – 2026-10-15

A felhasználói hibajelentés alapján a regisztráció hibajelzés előtti és utáni tényleges mezőgeometriája is mérésre került. A korábbi, egymásba ágyazott CSS-rács alapértelmezett nyújtása a megszólítás select magasságát 49,47-ről 63,45 px-re változtatta; a jelszómegerősítés 64,91 px-es kezdeti magassága és eltérő felső koordinátája szintén igazolta a hibát. A puszta oldal-túlcsordulási mérés ezt nem fedte le.

A `.form-grid` sorai nem nyújtják a gyermekmezőket; a `.ui-field` függőleges flex-elrendezést és az input/select rögzített 3,25 rem (52 px) magasságot használ. A súgó az Input komponensben a beviteli elem alá került, ezért a jelszó és a megerősítés is ugyanazon sorvonalon kezdődik. A hibaüzenetek és a súgó a mező alatti tartalmi területet növelhetik, a vezérlőt nem. A fókusz, aria-invalid és aria-describedby működése nem változott.

A computer-use böngészős próbában a 390/768/1280 px méretek mindkét témáján, bekapcsolt vállalkozási mezőkkel 27 látható input/select mérete került összehasonlításra üres beküldés előtt és után. Mind a hat kombinációban 52 px magasság, 0 méretváltozás és 0 px páronkénti sorigazítási eltérés adódott. Egyszerre 12 hibajelzés mellett is megmaradt a lastName fókusz. A kontrollok utáni hibaszöveg természetesen megnövelheti a következő sor előtti szükséges helyet; ez nem a beviteli elem átméretezése.

Érintett fájlok ebben a célzott javításban: frontend/src/styles/globals.css, frontend/src/components/ui/Input.astro, frontend/src/test/forms-contract.test.ts és ez a jelentés. US-0015 / FR-AUT-0002, AC-FR-AUT-0002-02/06 UI-rész és TC-REG-0011. Az új szerkezeti regressziós teszttel 90/90 frontendteszt, hibamentes check (62 fájl), lint és ötoldalas build készült. Backend, CAPTCHA-biztonsági logika, dependency, SQL, baseline-követelmény, commit/push vagy production nem változott ebben a javításban; a korábban nyitott elfogadási pontok nyitottak maradtak. Képi bizonyíték: btphoto-registration-layout-fixed.png a feladat helyi artifactkönyvtárában.

## 10. Jóváhagyott Git-átadás előtti ismételt zárókapu – 2026-10-16

A backend `clean verify` ismét BUILD SUCCESS eredményt adott: 59 tesztből 52 lefutott,
7 valódi CockroachDB-teszt fixture hiányában kihagyott, failure/error nincs.
Checkstyle 0 találat, SpotBugs 0 bug/error. A közvetlen Java és a Maven JVM egyaránt
Java 21.0.8; Maven 3.9.11. A frontend tiszta npm ci után 62 fájlon hibamentes checket,
sikeres lintet, 90/90 tesztet, ötoldalas buildet és 0 sérülékenységes auditot adott.
A korábbi böngészős bizonyítékot nem ismételt mérésként tüntetjük fel.

A regisztrációs commit saját PR-workflow-ja tartalmazza a V3- és account-repository
teszteket, az avatar-codec és CAPTCHA/mount contract kapukat, de nem hivatkozik a
külön staging/CD commit eszközeire. A teljes PR valódi CockroachDB-s, image-runtime
és végponti regisztrációs/CAPTCHA-elfogadása továbbra is nyitott. A történeti
baseline-ok, V1/V2 és controlled-deploy.sh nem változtak.
