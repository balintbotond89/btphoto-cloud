# CR-0002 – Staging/CD implementációs checkpoint

**Dátum:** 2026-10-15.
**Státusz:** repository-oldali implementáció és izolált ellenőrzés elkészült; a teljes CR-0002 nem elfogadott, a szerveroldali élesítési kapuk nyitottak.
**Ág:** feature/photographer-registration.
**HEAD:** d2d7216f76feac3419ea3b4aa390bf1bded6e4d3. Új commit nincs.

## 1. Elfogadott irány és tényleges megvalósítás

A felhasználó a meglévő sql01 CockroachDB-példányban külön btphoto_staging adatbázist
és felhasználókat, Caddy alapú btphoto.hu/www.btphoto.hu/staging.btphoto.hu HTTPS-belépést,
valamint megbízható self-hosted deploy runnert választott. A build/PR-tesztek GitHub-hosted
gépen maradnak. A jóváhagyás nem jelentett jelszó-, DNS/router-, NFS- vagy root-hozzáférés
átadását; ezeket nem kerültük meg.

Elkészült a staging/main kiadási pipeline bővítése, a tényleges kiadási SHA-ra futó
contract/runtime/DB kapuk, a három SHA-tagelt image publikálási függősége és a digest-manifest.
Ugyanaz a main kiadási artifact előbb stagingre, majd reviewer-kapu után productionre kerülhet.
A promóció nem építi újra az image-et. A repository BTPHOTO_CD_ENABLED kapcsolója
alapértelmezetten nem engedélyezett; a root policy mintája mindkét környezetre disabled.

Új root-owned CD-motor készült a régi script hallgatólagos átírása helyett. A kérést
HMAC, GitHub quality/publisher/job/runner eredet, a jobmetaadatban rögzített upstream
origin és productionnél tényleges review history igazolja. A motor csak rögzített
környezetcélokat és saját maga által generált Compose dokumentumot használ, nem
futtat checkoutból root kódot. A runner nem kap Docker socketet vagy általános sudót.

A runtime-szerződés nem root usert, read-only rootot, pontos mount/network/port/
capability/tmpfs készletet, restart policyt, CPU/memória/PID-keretet és logrotációt
követel. A Binds/Mounts és CAP_ reprezentáció különbségeit szemantikusan kezeli.
Nincs source/eval, credential argv-ba írás, nyers inspect/env log vagy root traceback.
A titkok csak a root-only raw .env fájlokba kerülnek, a callback read-only mountot kap.
A raw env dollárjeleit/idézőjeleit tényleges konténerben is ellenőriztük.

Hiba esetén egyszeri diagnosztika/down/korábbi release up/runtime/smoke fut;
az eredeti hiba megmarad, a subprocess 47, signal 143 és timeout 124 kódjai teszteltek.
SQL-ujjlenyomat változáskor konkrét root jóváhagyású rollback-pár szükséges.
Legacy admin-contract visszaindítása tiltott. Az image-rollback nem DB-rollback.

A staging user/DB provisionáló alapértelmezésben csak tervet mutat. Execute esetén
védett libpq service, explicit verify-full és rejtett jelszóbemenet szükséges.
A SQL a két staging useren és adatbázison kívüli meglévő objektumot nem módosítja.
A callback öt üzleti táblára ad runtime DML-t, a Flyway-history írását tiltja.
A valódi jogosultsági próba az eldobható CockroachDB-s CI-fixture-be került.

## 2. A feladat tényleges fájlhatára

A korábbi regisztrációs munka 126 meglévő változása megmaradt. A következő 22 útvonal
érintett ebben a CD-feladatban; ezek közül néhány korábban is módosított volt:

1. .github/workflows/quality-ci.yml
2. .github/workflows/production-image-build.yml
3. .github/workflows/environment-deploy.yml
4. .github/workflows/README.md
5. deploy/README.md
6. deploy/cd/btphoto_cd.py
7. deploy/cd/btphoto-cd
8. deploy/cd/btphoto-cd.sudoers.example
9. deploy/cd/policy.example.json
10. deploy/cd/schema_digest.py
11. deploy/cd/check_contract.py
12. deploy/cd/compose.edge.yml
13. deploy/cd/edge.Caddyfile
14. deploy/cd/create-staging-users.py
15. deploy/cd/provision-staging.sql
16. deploy/cd/test-database-isolation.sh
17. deploy/cd/tests/test_cd.py
18. deploy/cd/tests/test_tools.py
19. deploy/cd/README.md
20. docs/CR-0002-staging-cd.md
21. docs/CR-0002-implementacios-jelentes.md
22. docs/README.md

Alkalmazási Java/TypeScript/SQL-migráció/Dockerfile/dependency fájlhoz ebben a ciklusban
nem nyúltunk. A deploy/controlled-deploy.sh, compose.production.yml és eredeti
deploy/Caddyfile nem módosult. A történeti baseline-ok változatlanok.

## 3. Futtatott ellenőrzések és valós korlátok

| Ellenőrzés | Eredmény | Mit nem bizonyít? |
| --- | --- | --- |
| Python unittest | 30/30 sikeres; nyolc pozitív runtime fixture és negatív mutációk is | valódi teljes staging stack, GitHub approval/runner |
| actionlint 1.7.12 | 0 hiba; hivatalos release, közzétett SHA-256 ellenőrizve, csak artifactkönyvtárban | GitHubon lefutott workflow |
| Három workflow YAML | parse sikeres; quality 2, image/release 6, reusable deploy 2 job | szerveroldali környezetek léte |
| Bash/Python szintaxis | 24 workflow shellblokk és 7 beágyazott Python sikeres; hat CD Python-fájl fordítható | runtime külső szolgáltatás |
| SQL-provisionáló alapmód | csak terv, kapcsolat és módosítás nélkül | staging DB/user létrejötte |
| Natív Compose config | docker01 Compose v5.6.0, dummy envvel mindkét környezet sikeres | teljes release indíthatósága |
| Natív Caddy validate | production/staging belső gateway és publikus edge: Valid configuration | DNS, publikus ACME/TLS és forgalmi proxybizalom |
| Raw env runtime | egy hálózat nélküli dummy konténerben a dollárjel/idézőjel/backslash érték pontosan megmaradt | valódi production credential elfogadása |
| Maven clean verify | Java 21.0.8, Maven 3.9.11; BUILD SUCCESS; 59 tesztből 52 lefutott, 7 DB-teszt kihagyott; Checkstyle/SpotBugs 0 | valódi CockroachDB-integráció |
| Frontend quality | check 62 fájl, 0 error/warning/hint; lint sikeres; 15 fájl 90/90 teszt; build 5 oldal; audit 0 sérülékenység | teljes böngészős regisztráció |
| git diff --check | sikeres | üzleti/runtime elfogadás |

A Maven meglévő Mockito/Byte Buddy dinamikus agent figyelmeztetése nem okozott hibát.
A Caddy validálása formázási és redundáns X-Forwarded-For figyelmeztetést adott;
a konfigurációk érvényesek. A fejléc-felülírás szándékos, nem automatikus
bizalom a beérkező kliensfejlécben. A natív próba --pull never mellett a már
helyben lévő digest-rögzített Caddyt használta, új image nem lett letöltve.

## 4. Szerveroldali bizonyíték és változatlanság

A docker01 read-only mérése Docker Engine 29.9.0 / Compose v5.6.0 verziót mutatott.
A natív contract-próba kizárólag a botond home-jában létrehozott átmeneti könyvtárat,
dummy fájlokat és hálózat/hostport nélküli tesztkonténereket használta. A három
átviteli fájl és az üres könyvtár eltávolításra került; forrásuk a repositoryban megvan.

A production konténerek előtte–utána azonosítói változatlanok:

- btphoto-caddy-1: d83233033a94, healthy;
- btphoto-backend-1: 4cb561d202d6, healthy;
- btphoto-frontend-1: f6df5558f514, healthy;
- btphoto-migrations-1: d89e9dce1934, exited (0).

A hálózatkészlet változatlan: bridge, host, none, btphoto_application és btphoto_web.
Docker volume nincs, tesztkonténer nem maradt. Production env-t vagy inspect Env-t
nem olvastunk/nyomtattunk ki. A read-only inspect kizárólag mount/security/restart/
tmpfs metaadatot kért. Production adatbázis-kapcsolat, migráció, stack up/down,
checkoutcsere, root telepítés, DNS/router vagy privilege-módosítás nem történt.

## 5. AC-státusz és következő kapu

A US-0011/US-0012 támogatásához elkészültek az AC-CD-02..09 repository-oldali
mechanizmusai és fixture-ei; ezek **nem jelentenek teljes AC-elfogadást**.
AC-CD-01 valódi sql01 jogosultsági bizonyítéka és AC-CD-10 publikus TLS/browser
bizonyítéka hiányzik. A CI-be kötött új CockroachDB-próba commit/push előtt még
nem futott le. A valós frissítési és rollback-próba, valamint az approval és
runner negatív hozzáférési tesztje szintén nyitott.

Nincs még provisioningolt staging DB/user/NFS könyvtár, telepített root CD-motor,
GitHub Environment/secret, védett ág és regisztrált/hardened deploy runner a feladat
végrehajtásából. A DNS/router/TLS és első production cutover nem történt meg.
A botond nem rendelkezik non-interaktív sudóval; root-only művelethez külön
operátori lépés szükséges, sudo-jelszó chatben nem kérhető.

Nyilvános repositorynál a puszta runner label nem biztonsági határ. A tulajdonos
a későbbi, ugyanazon napi döntésben a nyilvános személyes repository megtartását és
a runner kapcsolódó maradványkockázatát elfogadta. Külön deploy repository nem készül.
Ez nem tényleges PR-kizárási bizonyíték; a runner jogosultságcsökkentése és valós
negatív próbája továbbra is szükséges. A meglévő production stack automatikus átvételét
a motor tiltja; külön, backup-/tenant-/bootstrap-kompatibilis cutover szükséges.
A US-0012 adatbázis- és VM-restore AC-ja továbbra sem teljesített.

Új alkalmazásdependency vagy üzleti migráció nincs. A Python-eszközök standard
könyvtárat használnak. Az actionlint csak külső ellenőrző artifact, nem projektdependency.
Staging, commit, push, PR, merge és production deployment nem történt.

**Összegzés:** CD REPOSITORY-CHECKPOINT ELKÉSZÜLT – TELJES STAGING/PRODUCTION CD
MÉG NEM ÉLESÍTETT ÉS NEM ELFOGADOTT.

## 6. Folytatás – letiltott CD-motor telepítője és operátori átadás

A következő három új útvonal egészíti ki az előző 22-es hatókört:
deploy/cd/install-cd.py, deploy/cd/tests/test_install.py és
docs/CR-0002-uzemeltetoi-atadas.md. Frissült a CR-0002 döntése, a CD README,
a workflow README, a docs index és ez a jelentés; alkalmazáskód nem módosult.

A telepítő credentialmentes, manifesttel/hash-sel ellenőrzött csomagot készít,
ellenőrzi a policy letiltott állapotát és a Python szintaxist, és explicit root
execute nélkül nem módosít rendszerfájlt. A root telepítés meglévő cél esetén megáll.
A fájlok fsync után, nem felülíró hardlinkkel atomikusan jelennek meg; a wrapper utolsó.
Két külön root-only kéréskulcs készülhet, normál kimenetre egyik sem kerülhet.
Részleges telepítés esetén nincs automatikus felülírás/törlés. Nincs sudoers-, runner-,
SQL-, hálózat-, edge- vagy alkalmazásindítás a telepítőben.

Új ellenőrzés: Windows 38 tesztből 36 sikeres, 2 POSIX-specifikus kihagyott;
docker01-en ugyanaz a 38/38 teszt sikeres. A Linux fájlrendszerfixture valódi fsync/
hardlink/mód ellenőrzés, de a root tulajdonosi műveletek mockoltak és a célok csak
ideiglenes könyvtárban vannak. Ez nem valódi privilegizált telepítés vagy CD-runtime.

A docker01 botond home-jában megmaradt az ellenőrzött, titokmentes átadási csomag
és a tesztforrás: /home/botond/btphoto-cd-bootstrap.ME85XG.
Manifest SHA-256: d7a5523befbec29af62f41933668c302250b579127f8baf02b109e8ec789c7f4.
Telepítő SHA-256: 9c076587bd3c5915080ed35442467b1ff1464605e536c43c08333ae37e270745.
Az átadási leírás a pontos root parancsokat tartalmazza; végrehajtás nem történt.

Sudo továbbra is interaktív jelszót kér. Az sql01 SSH-elérése a hiányzó ismert
hostkulcsnál szabályosan megállt; ezt nem kerültük meg, SQL-parancs nem futott.
GitHub Environment és runner a friss API-lekérdezés szerint is 0 darab.
Az éles stack konténerei változatlanok; root telepítés, provisioning, CD-engedélyezés,
commit és push továbbra sem történt. US-0012/AC-CD-09 implementációs lefedettsége
bővült, teljes AC- és production-elfogadás nem adható. Új dependency és migráció nincs.

## 7. SQL-admin kapcsolat igazolása és staging-provisionáló előkészítése

Felhasználó által beküldött konzolbizonyíték: a CD-motor root telepítése sikeres,
mindkét környezet letiltott maradt. A korábbi "root telepítés nem történt" állítások
az adott checkpoint időpontjára vonatkoznak; ez az operátori lépés azóta megtörtént.

Az sql01 aktív cockroach.service tanúsítványkönyvtára /etc/cockroach/certs.
A meglévő kliens-root kulcs/tanúsítvány a /root/.cockroach-certs könyvtárban van;
a kulcs root:root 0600, a tanúsítvány root:root 0644. Tartalmuk nem került chatbe.
A felhasználó az openssl verify sikerét és a verify-full root SQL-belépést igazolta:
defaultdb/root. A SHOW DATABASES kimenete btphoto, defaultdb, postgres, system;
btphoto_staging nem létezik ezen ellenőrzéskor. A btphoto Flyway-előzménye V1/V2
sikeres; V3 nincs telepítve. A DB Explorer btphoto_app identitása nem a provisioning
admin-hozzáférése; jogosultságát nem bővítjük.

Elkészült deploy/cd/provision-staging-sql01.py és deploy/cd/tests/test_sql01.py;
a CD README, az üzemeltetői átadás és ez a jelentés frissült. Az eszköz önállóan
átadható, az igazolt root admin URL-t használja helyben, stdin SQL-lel és rejtett,
megerősített jelszóbemenettel. Módosító módban nem futott. A Python-fixture kapu
46 tesztből Windows alatt 44 sikeres, 2 POSIX próba kihagyott. A korábbi Linuxos
38-as eredmény nem állítja az új SQL-funkció valódi DB-futását.

US-0012, NFR-SEC-0002 és AC-CD-01/09 támogatása bővült; valós staging provisioning,
Flyway, negatív hozzáférési próba és teljes CD-elfogadás továbbra is nyitott.
Új dependency, üzleti migráció, commit vagy push nincs. A production adatbázison
ebben a lépésben kizárólag a felhasználó által beküldött olvasási ellenőrzések futottak.

## 8. Staging infrastruktúra és élő NFS-próba – 2026-10-16

A felhasználó sikeres staging provisioning kimenetet adott, majd docker01-ről
mindkét új felhasználóval valódi TLS 1.3 belépést igazolt a btphoto_staging adatbázisba.
A btphoto.public.admin_user SELECT mindkét staging identitással 42501 hibával
elutasított. Ez a production tábla olvasási tilalmát bizonyítja; fordított izoláció,
runtime DDL/history tiltás és az üzleti Flyway-migráció még nem igazolt.

GitHub API-val ellenőrzött staging Environment: egyetlen main branch-szabály,
admin bypass false, DB_PASSWORD és MIGRATIONS_PASSWORD secretnevek, valamint
BTPHOTO_REGISTRATION_ENABLED=false. Secretértéket nem olvastunk. Runner még nincs.
A felhasználó létrehozta a btphoto-ingress-staging internal bridge hálózatot,
172.30.11.0/28 subnettel és 172.30.11.1 gatewayjel.

A Dokumentacio/AGENT.md 1908–1918 és 2948–2963 sorai igazolják a
nas01 /srv/storage/media → NFSv4 /media → docker01 /srv/btphoto/media adatútvonalat.
Az S: és UNC AGENT.md fájl SHA-256 értéke megegyezett. A történeti exportbeállítást
nem írtuk át és nem állítottuk aktuális, teljes exportauditnak.
A felhasználó nas01-en létrehozta a staging (0:0 0755) és staging/avatars
(10001:10001 0700) könyvtárat; ez a docker01 oldali stat szerint is megjelent.

Élő írás/olvasási próba: a már helyben lévő frontend image azonosítójával,
--pull never, --network none, --read-only, cap_drop ALL, no-new-privileges,
UID/GID 10001, 32 MiB/0.25 CPU/32 PID korláttal egyetlen staging avatar bindon.
A saját mktemp próbaállomány 10001:10001 0600 móddal létrejött és visszaolvasható volt;
EXIT trap eltávolította. A --rm tesztkonténer eltűnt. Új image, network vagy volume
nem készült ebben a próbában; production konténerazonosítók és health állapotok
változatlanok maradtak. Más médiát nem olvastunk és nem módosítottunk.

Felfedezett preflight regresszió: a findmnt ténylegesen két sort adott vissza,
autofs és nfs4 típussal; a régi motor ezt tévesen nem-NFS tárolónak minősítette volna.
Célzott javítás: verify_nfs_mount, nfs/nfs4 típusszűrés, első egyezés, továbbra is
fail-closed ellenőrzés. Három új teszt védi a parancsot, a nem-NFS/multisoros kimenet
elutasítását és a sikertelen lekérdezés propagálását. Teljes helyi CD-kapu: 49 teszt,
47 sikeres, 2 POSIX fixture kihagyott. Natív docker01 próba: NFS elfogadva,
/tmp nem-NFS helyesen elutasítva. git diff --check sikeres; staged fájl nincs.

Módosult: deploy/cd/btphoto_cd.py, deploy/cd/tests/test_tools.py, deploy/cd/README.md,
docs/CR-0002-uzemeltetoi-atadas.md és ez a jelentés. Új dependency/migráció nincs.
US-0012 / AC-CD-02 és AC-CD-09 részleges élő bizonyítéka bővült; teljes CD-elfogadás
nem teljesült. A root motor frissítése még nem történt meg; a javított, hash-ellenőrzött
átadási példány a botond home-jában van. Commit, push, alkalmazásdeploy nincs.

## 9. Operátori motorfrissítés és jóváhagyott Git-átadás – 2026-10-16

A felhasználó a 8. fejezet után sikeres root konzolkimenetet küldött: az ismert
régi motor és az új pending példány hash-ellenőrzése OK; a telepített btphoto_cd.py
root:root 0644, a CD továbbra is letiltott. Az új motor SHA-256 értéke
85976b9fb839ce1f60c6debc5d949fceb645e173e6438395e1585ad0d3c92e34.
A korábbi, függő frissítésre utaló bejegyzés történeti checkpoint.

A felhasználó jóváhagyta a záróellenőrzést, a külön regisztrációs és staging/CD
commitokat és a normál push-t. A CD regressziós kapuja ismét 49 tesztből 47 sikeres,
2 POSIX-specifikus Windows-kihagyott eredményt adott. A backend 52 sikeres és
7 kihagyott CockroachDB-tesztet, a frontend 90 sikeres tesztet adott; mindkét build
és minőségellenőrzés sikeres. A régi 38-as Linux-eredmény nem az új 49-es készlet
natív futásának bizonyítéka.

A Git-átadás nem engedélyezi a CD kapcsolóit, a runner regisztrálását, merge-et,
staging- vagy production-telepítést. A valódi PR/kiadási CI, runner negatív próba,
teljes kétirányú DB-izoláció, staging migráció/runtime/rollback/böngésző,
production cutover és publikus TLS továbbra is nyitott elfogadási kapu.

## 10. PR #11 preflight JSON-regresszió javítása – 2026-10-17

A 00b78c91bd1fc2857a90e27713a23f77b1531f9d fejű PR #11 contract jobja
az avatar create_host_path ellenőrzésénél bukott el. A backend/frontend/migrations
image-jobok és a két quality gate sikeresek. A hiba nem élő DB- vagy NFS-elérési
próba eredménye: a validátor a szabályos konfiguráció JSON-ábrázolását utasította el.
A runner ubuntu24/20261012.334 szoftverlistája Compose 2.38.2-t tartalmaz;
ennek compose-go 2.7.1 típusa false értéknél kihagyja a create_host_path mezőt.
A docker01 Compose 5.6.0 explicit false értéket ír; az újabb ábrázolásban viszont
az üres bind true alapértéket is jelenthet. Egyszerű get(..., False) emiatt nem
biztonságos, és nem ez lett a javítás.

A validátor ugyanazzal a Compose-példánnyal egy külön, rögzített, explicit false
referenciát is felold. Ez kizárólag config művelet, nem build/pull/run/up;
a dummy referencia-image nem töltődik le. A 0600 ideiglenes referencia JSON-t
a meglévő EXIT/HUP/INT/TERM takarítás kezeli. Csak az azonos parser ismert false
alakjával egyező bind fogadható el; true, hibás típus, hiányzó bind és ismeretlen
referencia elutasított. A CA/avatar útvonal-, írhatóság-, read-only root- és
capability-kapuk megmaradtak. Új dependency, üzleti szabály és migráció nincs.

Érintett fájlok: deploy/validate-production-config.sh,
deploy/cd/tests/test_preflight.py, .github/workflows/production-image-build.yml
és ez a jelentés. A workflow két további natív negatív fixture-t kapott:
autocreate és missingbind. US-0012 / AC-CD-02/03 / TC-CD-02/03,
valamint FR-PRF-0002 / TC-REG-0012 implementációs támogatása; új AC nem keletkezett.

Ellenőrzés: Windows alatt 56 tesztből 54 sikeres, 2 POSIX-specifikus kihagyott.
A hivatalos Compose 2.38.2 ideiglenes Windows-binárisa SHA-256 ellenőrzés után,
telepítés és Docker-konténer nélkül előállította a valódi JSON-okat: a teljes
beágyazott Python-kapu a szabályos esetet elfogadta, a true és hiányzó bind esetet
elutasította. A docker01 ideiglenes könyvtárában a teljes 56/56 teszt sikeres;
a Linux telepítőfixture-ek root műveletei továbbra is mockoltak. A workflow
Production preflight és Avatar/CAPTCHA negatív lépése natívan is sikeres
Compose 5.6.0 alatt. A negatív esetek hibaüzenetei elvárt elutasítások.
Az ideiglenes forrás/fixture könyvtár automatikusan törlődött; az előtte/utána
konténerazonosítók és státuszok megegyeztek. Production env nem lett kiolvasva.

A shell és workflow szintaktikai ellenőrzése, actionlint és git diff --check
sikeres. Alkalmazáskód, SQL, Compose deployment-konfiguráció és a telepített
CD-motor forrása változatlan; a motor hash-e továbbra is 85976b9f...92e34.
Staging, commit, push, CI-újrafuttatás, root telepítés és deployment nem történt.
A javított PR GitHub-hosted zöld futása külön, még nyitott verifikációs kapu.
