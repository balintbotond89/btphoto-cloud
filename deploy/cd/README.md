# Staging / production CD – CR-0002

## Státusz és hatókör

Ez a csomag repository-oldali implementáció. Nem jelenti, hogy a staging adatbázis,
runner, GitHub Environment, DNS, publikus TLS vagy az éles CD már létrejött.
A normatív AC/TC és nyomonkövetés: [CR-0002](../../docs/CR-0002-staging-cd.md).
Az éles `btphoto` projekt/adatbázis megmarad. A régi `deploy/controlled-deploy.sh`
és az eredeti production Compose változatlan; az új CD nem hívja a régi,
üres szervert feltételező scriptet, és nem hajt végre checkoutból root kódot.

## 1. Kiadási útvonal

1. PR main/staging felé: GitHub-hosted quality, contract, három image build,
   CockroachDB 26.2.2 integráció és kétirányú SQL-jogosultsági negatív próba.
2. Main/staging push: a Quality CI pontos head SHA-ján újra lefutnak a kiadási kapuk.
3. Három image publikálása teljes SHA-val, OCI source/revision és közös SQL-sémaujjlenyomattal.
4. A Kiadási manifest job rögzíti a három registry digestet.
5. Engedélyezett CD esetén ugyanezek a digestek automatikusan stagingre kerülnek.
6. Main kiadásnál a production Environment required reviewer jóváhagyása szükséges.
   A szerver ismét ellenőrzi a staging receipt SHA/digest egyezését.

A CD alapértelmezetten két helyen tiltott: a repository `BTPHOTO_CD_ENABLED`
változója nincs true-ra állítva, a root policy `enabled` mezői false értékűek.
A staging futtatás sikere nem helyettesíti a regisztráció, jóváhagyás és
profilkép valódi böngészős elfogadását. Az approvalhoz ezt külön bizonyítékként kell használni.

## 2. SQL-előkészítés – külön, nem automatikus production művelet

Az sql01 root konzolján igazolt tanúsítványos adminbelépéshez a
`provision-staging-sql01.py` önálló, egyfájlos eszköz használható. Nem igényel új
Python dependencyt, libpq service-t vagy az admin privát kulcs docker01-re másolását.
Alapértelmezése kapcsolat nélküli dry-run. `--execute` előtt ellenőrzi a root SQL-identitást,
a meglévő adatbázis- és felhasználóneveket; staging névütközéskor nem kér jelszót és megáll.
Két külön 32–128 URL-safe karakteres, jelszókezelőbe előre mentett jelszót kell
rejtetten megadni és megismételni, majd a STAGING szóval jóváhagyni az írást.
A SQL kizárólag stdin-be kerül, a CLI echo tiltott, a környezet tisztított.
A kliens stdout/stderr nem kerül nyers kimenetre. Az admin URL kizárólag a már
igazolt fájlútvonalakat és verify-full módot tartalmazza, jelszót nem.
Futtatás után tulajdonos/user utóellenőrzés történik. Ez nem Flyway-futtatás vagy
teljes hozzáférési teszt. Részleges hiba után nincs automatikus törlés vagy újrapróba.
Az önálló SQL-törzs azonosságát a provision-staging.sql-lel regressziós teszt védi.

Az sql01 meglévő példányában `btphoto_staging`, `btphoto_staging_app` és
`btphoto_staging_migrator` készül. Új CockroachDB-szolgáltatás vagy konténer nem szükséges.
Az egyszeri eszköz repositoryn kívül előkészített libpq service-t és telepített
psql klienst feltételez. A service célját (sql01), adminidentitását és CA-ját
az üzemeltető előzetesen ellenőrzi. A helper kikényszeríti a verify-full TLS módot.

```shell
python3 create-staging-users.py --service btphoto-admin
# Csak terv; nincs módosítás.
python3 create-staging-users.py --service btphoto-admin --execute
```

A második parancs rejtett terminálon kéri a két eltérő, jelszókezelőben létrehozott,
32–128 URL-safe karakteres jelszót. Ezeket a staging Environment DB_PASSWORD és
MIGRATIONS_PASSWORD secretjébe kell biztonságosan felvenni. Chatbe vagy parancssori
argumentumba ne kerüljenek. A service adminsecretje/root klienskulcsa nem a helper része.

Meglévő user vagy adatbázis esetén nincs átnevezés, jelszó-felülírás vagy törlés.
Hiba részleges objektumokat hagyhat maga után; ezeket kézzel kell felmérni.
A script nem módosít production adatbázist, felhasználót vagy globális jogosultságot.

Flyway a staging migrációs userrel fut. Az afterMigrate callback kizárólag az öt
aktuális üzleti táblára ad DML-jogot a runtime usernek. A Flyway-history csak
olvasható. Új üzleti tábla később célzott callback-/tesztfrissítést igényel.
Valódi környezetben a production tábla elérését staging userrel, a stagingét
production runtime userrel és a runtime DDL/history írást is tiltottként kell igazolni.
A `test-database-isolation.sh` kizárólag címkézett, eldobható CI-fixture-re használható;
production sql01 ellen szándékosan nem futtatható.

## 3. Docker/NFS és Caddy előfeltételek

Környezetenként külön root release/state könyvtár szükséges:

| Cél | Production | Staging |
| --- | --- | --- |
| Projekt | btphoto | btphoto-staging |
| Root release-gyökér | /opt/btphoto-cd/production/releases | /opt/btphoto-cd/staging/releases |
| Root state-gyökér | /var/lib/btphoto-cd/production | /var/lib/btphoto-cd/staging |
| Gateway hostport | 127.0.0.1:8080 | 127.0.0.1:8081 |
| NFS avatar | /srv/btphoto/media/avatars | /srv/btphoto/media/staging/avatars |
| SQL runtime user | btphoto_runtime | btphoto_staging_app |
| SQL migrációs user | btphoto_migrator | btphoto_staging_migrator |

Productionnél a két új SQL-identitás létrehozása és a meglévő táblák jogosultságainak
átadása külön cutover-kapu; a helper ezeket nem hozza létre automatikusan.
Az NFS-könyvtárakat nem a Docker hozza létre. Ellenőrzött UID 10001 írhatóság,
root-squash kezelés és környezetek közti elérés tiltása szükséges; nincs chmod 777.
Systemd automount esetén a findmnt ugyanarra az útvonalra autofs és nfs4 sort is
adhat. A CD-kapu ezért nfs,nfs4 típusszűréssel és --first-only kapcsolóval keresi
a tényleges NFS-csatolást; helyi ext4/tmpfs vagy önmagában autofs nem fogadható el.
A 2026-10-16-i élő próba ezt, valamint UID/GID 10001 staging írás/olvasást igazolt.
A korábban telepített root motor egyfájlos javítása még külön operátori lépés;
a pontos, backupot készítő átadás az üzemeltetői leírás végén szerepel.

Két előzetesen ellenőrzött, ütközésmentes, internal bridge szükséges:
`btphoto-ingress-production` (172.30.10.0/28) és
`btphoto-ingress-staging` (172.30.11.0/28). A címtereket a host routinggal és
létező Docker hálózatokkal össze kell vetni létrehozás előtt.
Az edge .2, a megfelelő gateway .3 címet kap. A root motor a hálózat típusát,
internal tulajdonságát és pontos subnetjét is ellenőrzi.

Az `edge.Caddyfile` és `compose.edge.yml` új, külön edge projektet ír le.
Az edge internet hálózatot használ az ACME eléréséhez; az alkalmazásgyökerek
nem kapnak közös alkalmazási hálózatot. Az internal ingress sem helyettesíti
a SQL-jogosultságokat vagy a host hálózati szabályait.
Mindkét publikus gateway átvétele előtt ellenőrizni kell a DNS A/AAAA rekordokat,
a router TCP 80/443 továbbítását, IPv6 kitettséget és az ACME működését.
A DB, NFS és menedzsment portok továbbra sem lehetnek publikusak.

A host `/etc/btphoto-cd/.env.edge` root:root 0600 raw env fájlban tartalmazza
a STAGING_BASIC_AUTH_USERNAME és STAGING_BASIC_AUTH_HASH értékeket. A username
csak egyszerű betű/szám/alsóvonás legyen, a hash Caddy által előállított bcrypt.
Nincs alapértelmezett staging jelszó. A CA-fájl a korábbi, ellenőrzött
`/etc/btphoto/certs/ca.crt`, root:root 0644. Az edge data/config könyvtárai
65534:65534 tulajdonú tartós könyvtárak; a root fájlrendszer read-only.

Az edge minden X-Forwarded-For értéket a saját peerjéből állít elő, a belső gateway
csak az edge pontos /32 címében bízik. A backend csak saját caddy peerjét fogadja el.
Basic Auth Authorization nem kerül a backendhez. A session cookie host-only marad;
közös `.btphoto.hu` Domain attribútum nem kerül bevezetésre.

## 4. Privilegizált belépési pont telepítése

Az `install-cd.py --prepare <új könyvtár>` credentialmentes, négy forrásfájlos
csomagot és manifestet készít. A shell wrapper LF sortörésű lesz. A manifest SHA-256
és a telepítő külön SHA-256 értéke az ellenőrzött forrásból rögzítendő; a manifest
önmagában nem digitális aláírás és nem bizonyít megbízható eredetet.
`--bundle <könyvtár> --manifest-sha256 <ellenőrzött hash>` csak olvasási ellenőrzés.
Külön root-owned másolatban ugyanez `--execute` mellett egyszer telepíti a motort.
A végrehajtási példa és a konkrét átadási hash: [üzemeltetői átadás](../../docs/CR-0002-uzemeltetoi-atadas.md).

A telepítő minden fájlt memóriába olvas és hash/szintaxis szerint ellenőriz a
rendszerfájlok írása előtt. Csak letiltott kezdőpolicyt fogad el, root-owned,
symlinkmentes szülőláncot követel, meglévő CD cél esetén felülírás nélkül megáll.
Egyedi átmeneti fájl, fsync és nem felülíró atomi hardlink-publikálás védi a fájlokat.
A wrapper utolsóként jelenik meg. Két eltérő kéréskulcs készül, értékük nem jelenik meg.
A teljes telepítés nem többfájlos tranzakció: megszakadás után részleges állományok
megmaradhatnak, ezeket kézzel kell felmérni. Nincs automatikus újratelepítés/törlés.
Sudoers, runner, hálózat, SQL, NFS, edge vagy alkalmazásállapot nem változik.

Előfeltétel: külön jóváhagyott root munkamenet, a csomag reviewed SHA-256 értékeinek
ellenőrzése és nincs folyamatban más telepítés. A telepített célok:

- `/usr/local/lib/btphoto-cd/btphoto_cd.py`: root:root 0644, root tulajdonú könyvtár.
- `/usr/local/sbin/btphoto-cd`: root:root 0755; izolált `/usr/bin/python3 -I` hívás.
- `/etc/btphoto-cd/policy.json`: root:root 0600, a policy.example.json alapján;
  DB host/port a tényleges SAN-nak megfelelő root konfigurációból jön.
- `/etc/btphoto-cd/staging.request-key`, `production.request-key`: eltérő,
  kriptográfiailag generált 64 kisbetűs hex karakter, root:root 0600.
- release/state gyökerek: root:root 0700, meglévő production checkout áthelyezése nélkül.

A kéréskulcsokat a megfelelő GitHub Environment DEPLOY_REQUEST_KEY secretjébe
kell biztonságosan betölteni. A policy maradjon disabled a valós elfogadásig.
Az állományokat `install` és atomi csere segítségével, külön root műveletben kell
telepíteni; a CI nem cserélheti a saját root deploymotorját.
A sudoers-minta csak visudo-validálás és runner-hardening után telepíthető.
Az üres argumentumlista kötelező. Nincs NOPASSWD:ALL, shell vagy szabad Python-parancs.

A motor stdin JSON-t, HMAC-ot és GitHub API-val ellenőrzött run/job/runner eredetet
követel. A requestet egyszer lehet felhasználni. Teljes inspect/env nem kerül normál
logba. A secret csak a root-only `.env.backend` és `.env.migrations` raw fájlokba kerül;
a Docker Compose raw formátuma nem értékeli ki a dollárjelet vagy idézőjelet.
A root generálja a Compose JSON-t, nem a checkoutból tölt be végrehajtható konfigurációt.
Docker daemon/root hozzáféréssel az environment-secret továbbra is kiolvasható;
ez nem Vault vagy titkosított Docker Swarm secret megoldás.

## 5. GitHub és a nyilvános repository runnerkockázata

Két Environment szükséges: staging, production. Mindkettőnél kizárólag main nevű
branch-szabály legyen, ne tag vagy wildcard. Ez a `workflow_run` vezérlő workflow
refje; a telepítendő SHA eredetét külön a root motor ellenőrzi main/staging pushként.
Productionnél nem üres required reviewers kötelező. Egyszemélyes jóváhagyásnál
a Prevent self-review beállítást úgy kell megválasztani, hogy maradjon jogosult reviewer.
A GitHub branch protection/ruleset a main és staging ágakat is védje; a kiadási
kapukat nem lehet közvetlen, ellenőrizetlen pushsal helyettesíteni.

Environment Secrets: DEPLOY_REQUEST_KEY, DB_PASSWORD, MIGRATIONS_PASSWORD,
BTPHOTO_RECAPTCHA_SECRET. Environment Variables: BTPHOTO_REGISTRATION_ENABLED
(kezdetben false), BTPHOTO_RECAPTCHA_SITE_KEY, BTPHOTO_RECAPTCHA_HOSTNAMES.
Staging és production külön CAPTCHA-kulcspárt kap; hostlistájuk nem fedheti egymást.

A runner neve és egyedi labelje: btphoto-deploy-staging / btphoto-deploy-production.
Külön szolgáltatásfelhasználó, nincs docker csoport, socket, általános sudo,
production env/media hozzáférés. A deploy job nem checkoutol és nem futtat artifactot.
A root motor csak az adott környezet megfelelő runner_name értékét fogadja el.
Productionnél a workflow-futás review history-jában is szükséges az adott
Environmenthez tartozó User jóváhagyás; pusztán a reviewer beállítás léte vagy
egy environment-kapu megkerülése nem elegendő. Elutasított futás helyett új,
teljes kiadási futást kell indítani. Az upstream Quality CI és a kiadási futás
kapcsolatát a GitHub jobmetaadatában rögzített origin lépés is igazolja.

**Nyilvános repository esetén a label vagy a workflow if önmagában nem zárja ki,
hogy egy PR más workflow-ja ugyanazt a self-hosted gépet célozza.** A tulajdonos
2026-10-15-én a jelenlegi nyilvános, személyes repository megtartását választotta,
és a hozzá kapcsolt self-hosted runner fennmaradó kockázatát kifejezetten elfogadta.
Külön deploy repository vagy szervezeti áthelyezés nem jóváhagyott irány.
Ez kockázatelfogadás, nem a PR-kizárás technikai bizonyítéka. A meglévő workflow-k
PR/build jobjai továbbra is GitHub-hosted gépen futnak; untrusted kód futtatására
nem konfigurálunk saját runnert. A két külön szolgáltatásfelhasználó, korlátozott
root belépési pont, Docker-csoport/socket tiltása és production reviewer-kapu megmarad.
Az eldobható jobkörnyezet és folyamatfa-takarítás további védelem; a tényleges runner
regisztrációja/hardeningje és negatív próbája még nem történt meg. A nyilvánosság
önmagában nem blokkoló feltétel. A HMAC/root gate nem védi meg az environment
secretet egy korábban kompromittált runnerfolyamattól; ezt maradványkockázatként kezeljük.

Csak az összes kapu után lehet a repository BTPHOTO_CD_ENABLED változó true,
majd a root policy megfelelő enabled mezője true. A kapcsolók felkapcsolása külön
élesítési művelet; ebben a fejlesztésben nem történt meg.

## 6. Frissítés és rollback

A motor saját, receipt alapján azonosított healthy stacket fogad el portfoglalóként.
Ismeretlen vagy kézzel kezelt production stack esetén még pull/aktiválás előtt megáll.
A globális lock a korábbi controlled-deploy lockútvonalát is használja.
Új release saját könyvtárban készül, konfiguráció atomi írással és fsync-kel.
Régi release, secretbackup, image és DB nem törlődik automatikusan.

Hiba esetén egyszeri redaktált diagnosztika, új stack down, korábbi release up,
runtime és smoke ellenőrzés következik. A régi receipt csak igazolt újraindítás után
íródik vissza. Az eredeti kivétel a rollback hibája mellett is megmarad.
A rollback hibája nem jelenthető sikeres helyreállításként.

Azonos SQL-ujjlenyomat és tenant-v1 mellett a korábbi CD-kezelt verzió visszaindítható.
Eltérő SQL-sémaujjlenyomatnál root policy rollback_pairs bejegyzés szükséges, a
konkrét from/to SHA-khoz. Ez csak előzetes kompatibilitási bizonyíték alapján adható.
Nem jelent automatikus adatbázis-visszaállítást. Legacy admin-contract visszaindítása tiltott.

**Első production cutover:** a jelenlegi, nem CD-kezelt stacket a motor nem veszi át.
Külön, reviewed átadási eljárás kell, amely a V3/tenant/bootstrap/backup kaput,
a production SQL-user váltást, a konfiguráció/mount változást, a régi stack
megőrzését és az első, ténylegesen ellenőrzött CD receipt létrehozását igazolja.
Kézzel kitalált current.json vagy disabled gate megkerülése tilos.
Ez a jelenlegi production biztonságát védő, még nyitott élesítési feladat.

## 7. Ellenőrzések

```shell
python3 -B -m unittest discover -s deploy/cd/tests -v
python3 -B deploy/cd/check_contract.py
```

Az első fixture-alapú és nem használ Docker/GitHub/SQL kapcsolatot. A második
valódi Docker Compose config és három Caddyfile natív validálás, dummy envvel;
Docker nélkül nem futtatható. A CI staging SQL-próbája valódi CockroachDB,
de nem bizonyít sql01 jogosultságot vagy production TLS-t. A végső jelentésben
ezeket, a PR/CI-, runner-, DNS/TLS-, valós rollback- és böngészős eredményeket
külön kell felsorolni. A US-0012 backup/restore AC-ja ettől még nem teljesül.

## Elsődleges hivatkozások

- [GitHub environment védelem](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [GitHub self-hosted runner kockázat](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Docker raw env_file](https://docs.docker.com/reference/compose-file/services/#format)
- [Caddy Basic Auth](https://caddyserver.com/docs/caddyfile/directives/basic_auth)
- [CockroachDB default jogosultságok](https://www.cockroachlabs.com/docs/v26.2/alter-default-privileges)
