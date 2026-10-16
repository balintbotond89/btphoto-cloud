# Production deployment

## UI-01 CAPTCHA kiadási feltétel

Bekapcsolt regisztrációhoz a védett envben kötelező a BTPHOTO_RECAPTCHA_SITE_KEY,
BTPHOTO_RECAPTCHA_SECRET és BTPHOTO_RECAPTCHA_HOSTNAMES; a secret nem kerül a frontendhez.
A validator hiányzó értéknél megáll. Valódi kulcsok még nincsenek; kulcsos/domainhelyes
Google-végponti elfogadás szükséges. A CAPTCHA nem váltja ki a lent felsorolt korábbi kapukat.

## CR-0001 kiadási kapu – külön operatív feladat

A regisztráció alapértéke false. **A jelenlegi controlled-deploy.sh még nem a CR-0001 kiadási scriptje.**
Az avatar mount runtime-engedélylistája és a rollback-kompatibilitási gate külön,
jóváhagyott szerveroldali feladat. Ebben az implementációban a script nem változott.

Kiadás/bekapcsolás előtt kötelező: sikeres PR V1/V2/V3 és CockroachDB/konkurencia teszt;
végleges JRE avatar-codec teszt; régi accountok auditja; pontosan egy operator binding és
befejezett kötelező jelszócsere; NFS/UID/GID 10001 írhatóság és restart-utáni avatar;
frissített runtime/deploy-validator; valódi egy ADMIN + két PHOTOGRAPHER böngészős elfogadás.

A 2026-10-14-i read-only audit szerint /srv/btphoto/media a 192.168.60.2:/media NFSv4.2 mountja;
az avatars alkönyvtár még nem létezett. A Compose kizárólag
/srv/btphoto/media/avatars → /srv/btphoto/avatars írható bindot enged, create_host_path:false mellett.
Docker nem hozhat létre észrevétlenül helyi helyettesítő könyvtárat. A létrehozás és
NFS-jogosultságok külön jóváhagyandók; a teljes média mount nem kerül átadásra.

Az új backend account-contract labelje tenant-v1: kiadási marker, nem önmagában security-bizonyíték.
SystemAdmin/bootstrap vagy fotós account/workspace állapot mellett tilos legacy, minden aktív
fióknak ADMIN szerepet adó release automatikus visszaindítása. A későbbi gate a kiadás eredetét
és tényleges tesztbizonyítékát is ellenőrzi. Az image-rollback nem adatbázis-rollback.
A lenti korábbi indítási példák csak e kapu és külön műveleti jóváhagyás után használhatók.

A regisztrációs limit 5 kísérlet / 10 perc / ellenőrzött cím, egy backend memóriájában;
újraindításkor nullázódik. A gateway a saját peer címével felülírja az X-BTPhoto-Client-IP fejlécet.
A backend ezt csak a Docker DNS-ben caddy néven feloldott peerből fogadja el.
A [Caddy hivatalos reverse_proxy leírása](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
rögzíti a header_up felülírás működését. Az SSH-alagút mögött a gateway nem ismeri a böngésző
valódi távoli címét, ezért a tesztelőket közös címlimit érintheti. Új publikus proxyhoz külön trust-audit szükséges.

Az első belső production-szerű stack négy szolgáltatást futtat a `docker01`
gépen:

- `migrations`: egyszer lefutó Flyway 12.6.2 migrációs komponens;
- `backend`: Spring Boot alkalmazás, közvetlen hostport nélkül;
- `frontend`: az Astro statikus buildet kiszolgáló belső Caddy, hostport nélkül;
- `caddy`: belső gateway és reverse proxy, kizárólag a
  `127.0.0.1:8080` hostcímen publikálva.

A CockroachDB nem része a Compose stacknek. A migrations és a backend a belső
hálózaton éri el a `sql01` gépet. A migráció minden indítás előtt idempotensen
lefuthat; a backend csak a sikeres `exited (0)` végállapot után indul, és
Hibernate `ddl-auto: validate` módban nem módosít sémát. Ebben a fázisban a
backend kizárólag a külön avatar NFS-alkönyvtárat kapja meg írható mountként,
és a gateway nem konfigurál publikus 80/443 portot, DNS-nevet vagy automatikus
HTTPS-t.

## Caddy runtime capability

A frontend és a gateway a hivatalos Caddy image-re épül. Az image
`/usr/bin/caddy` binárisa `cap_net_bind_service=ep` fájlképességgel rendelkezik,
ezért a teljes capabilitykészlet eldobása a bináris indítását `operation not
permitted` hibával megakadályozta. A két Caddy-alapú szolgáltatás számára ezért
kizárólag a `NET_BIND_SERVICE` capability kerül célzottan visszaadásra; a
backend nem kap hozzáadott capabilityt.

Mind a négy szolgáltatásnál megmarad a `cap_drop: ALL`, a read-only root
fájlrendszer és a `no-new-privileges:true` védelem. A frontend és a gateway
továbbra is nem root felhasználóként fut; a migrations és a backend szintén
rögzített nem root felhasználót használ. Hostportot csak a gateway publikál,
kizárólag a `127.0.0.1:8080` címen.

## Image-ek és hálózatok

A stack kizárólag teljes Git commit SHA-val címkézett GHCR image-et fogad:

```text
ghcr.io/balintbotond89/btphoto-backend:<teljes-commit-SHA>
ghcr.io/balintbotond89/btphoto-frontend:<teljes-commit-SHA>
ghcr.io/balintbotond89/btphoto-migrations:<teljes-commit-SHA>
```

Mindhárom saját image ugyanazt a teljes, 40 karakteres Git SHA taget használja;
`latest` fallback nincs. A `web` bridge a gateway és a frontend közötti belső
forgalmat, az `application` bridge pedig a gateway és a backend kapcsolatát,
valamint a migrations és a backend `10.20.0.20:26257` irányú kimenő kapcsolatát
biztosítja. A migrations nem csatlakozik a `web` hálózathoz és nem publikál
hostportot.

## Production konfiguráció

A repositoryban található `.env.production.example` csak változóneveket és
nem érzékeny mintákat tartalmaz. A tényleges fájl helye a szerveren:

```text
/etc/btphoto/.env.production
```

Kötelező tulajdonos és jogosultság:

```text
root:root
0600
```

Szükséges változók:

| Változó | Jelentés |
| --- | --- |
| `BTPHOTO_IMAGE_TAG` | A telepítendő teljes, 40 karakteres commit SHA |
| `DB_HOST` | A CockroachDB tanúsítvány SAN-bejegyzésével egyező host vagy IP |
| `DB_PORT` | CockroachDB SQL-port, jelenleg `26257` |
| `DB_NAME` | Alkalmazás-adatbázis, jelenleg `btphoto` |
| `DB_USERNAME` | Alkalmazásfelhasználó, jelenleg `btphoto_app` |
| `DB_PASSWORD` | Repository-n kívül kezelt production secret |
| `BTPHOTO_REGISTRATION_ENABLED` | false alapérték; csak a CR-0001 kiadási kapu után true |

A `SPRING_PROFILES_ACTIVE=cockroachdb` és a
`DB_SSL_ROOT_CERT=/run/secrets/btphoto/cockroach-ca.crt` értékeket a Compose
fail-safe konstansként állítja be. Ezek nem írhatók felül a production
env-fájlból.

A host `/etc/btphoto/certs/ca.crt` fájlja read-only bind mountként kerül a
migrations és a backend konténerbe. Mindkettő rögzített
`sslmode=verify-full` kapcsolati módot használ. A `btphoto_app` felhasználó nem
kap `system` vagy `crdb_internal` hozzáférést. A tanúsítvány tartalma nem kerül
image-be vagy Gitbe.

A `DB_PASSWORD` environment változó ebben az első fázisban átmeneti megoldás.
Nyitott hardening feladat a Docker Compose secret vagy Spring config-tree alapú
kezelés bevezetése; ez külön Spring-konfigurációs változtatást igényel.

## Első telepítés előtti ellenőrzések

Telepítés előtt ellenőrizendő:

1. a `docker01` Docker Engine és Compose plugin működik;
2. a `10.20.0.20:26257` TCP- és TLS-kapcsolat elérhető;
3. a CA-fájl létezik, ujjlenyomata jó, és olvasható a Docker daemon számára;
4. a GHCR image-ek pontosan a jóváhagyott main commit SHA-jával léteznek;
5. a `/etc/btphoto/.env.production` tulajdonosa `root:root`, módja `0600`;
6. a repository checkout tiszta és a jóváhagyott kiadási commiton áll;
7. a `BTPHOTO_IMAGE_TAG` pontosan 40 kisbetűs hexadecimális karakter.

A régi, piszkos `/opt/btphoto` checkoutot nem szabad helyben resetelni vagy
felülírni. Tartalmát megőrizve, külön mentett néven kell félretenni, majd a
telepítést tiszta checkoutból kell végrehajtani. Ennek szerveroldali elvégzése
nem része a jelen repository-implementációnak.

## Konfiguráció ellenőrzése és indítás

A parancsokat a tiszta repository gyökeréből kell futtatni:

```shell
sh deploy/validate-production-config.sh /etc/btphoto/.env.production

docker compose \
  --env-file /etc/btphoto/.env.production \
  -f deploy/compose.production.yml \
  pull

docker compose \
  --env-file /etc/btphoto/.env.production \
  -f deploy/compose.production.yml \
  up -d --no-build --wait
```

Az első parancs lefuttatja a `docker compose config --quiet` ellenőrzést, majd a
feloldott backend-, frontend- és migrations-image-nevekből igazolja, hogy
mindhárom ugyanazt a pontosan 40 karakteres, kisbetűs hexadecimális Git SHA
taget használja. Ellenőrzi a migrációs szolgáltatás hálózati, mount-, tmpfs-,
capability- és `service_completed_successfully` szerződését is. Az
env-fájlt nem hajtja végre shellkódként, és a `DB_PASSWORD` értékét nem írja ki.

Az indítás registry image-ekből történik; a production gép nem buildel image-et.
Az indítási sorrend: migrations sikeres befejezés → backend indulás és health →
frontend/gateway a meglévő függőségi rendben. Hibás migráció esetén a backend
nem indulhat el.

## Health és smoke tesztek

```shell
docker compose \
  --env-file /etc/btphoto/.env.production \
  -f deploy/compose.production.yml \
  ps

curl --fail --silent --show-error http://127.0.0.1:8080/_gateway/health
curl --fail --silent --show-error http://127.0.0.1:8080/api/health
curl --fail --silent --show-error http://127.0.0.1:8080/
```

Az első végpont a gateway saját állapotát, a második a Caddyn keresztül elért
Spring Boot Actuator állapotát, a harmadik pedig a statikus frontend route-ot
ellenőrzi. A backend health az aktív `cockroachdb` profil miatt a tényleges
adatbázis-kapcsolat hibáját is jelezheti.

## Kontrollált deployment és rollback

A verziókövetett `deploy/controlled-deploy.sh` egyetlen kötelező paramétere a
jóváhagyott, teljes, 40 karakteres kisbetűs release SHA. Ellenőrzi a távoli
`main` pontos SHA-ját, a három saját image meglétét és OCI revision címkéjét,
majd atomi candidate/predeploy checkout- és env-cserét végez. A migrations
`exited (0)` állapotát és Flyway JSON `info` kimenetét a backend health előtt
ellenőrzi.

Példa kizárólag előzetesen jóváhagyott release-re, root környezetben:

```shell
bash /opt/btphoto/deploy/controlled-deploy.sh <teljes-40-karakteres-release-SHA>
```

A script globális non-blocking lockot használ. Aktiválás utáni hiba esetén a
rollback explicit állapotgépe és reentrancy guardja letiltja az `ERR`, `EXIT`,
`INT` és `TERM` trapek újbóli aktiválódását. A root-only diagnosztika és a stack
leállítása pontosan egyszer, a checkout- és env-visszaállítás legfeljebb egyszer
fut. A diagnosztika hibája nem blokkolja a rollbacket; volume, adatbázis és
failed checkout nem törlődik automatikusan.

## Kézi image-visszaállítás

Rollbackhez a `/etc/btphoto/.env.production` fájlban a
`BTPHOTO_IMAGE_TAG` értékét egy korábban jóváhagyott teljes commit SHA-ra kell
állítani, majd ugyanazzal az env- és Compose-fájllal végrehajtani:

```shell
sh deploy/validate-production-config.sh /etc/btphoto/.env.production

docker compose \
  --env-file /etc/btphoto/.env.production \
  -f deploy/compose.production.yml \
  pull

docker compose \
  --env-file /etc/btphoto/.env.production \
  -f deploy/compose.production.yml \
  up -d --no-build --wait
```

A konténer-image visszaállítása nem jelent adatbázis-visszaállítást. A Flyway
migrációk és a CockroachDB adatok helyreállításához külön, előzetesen tesztelt
adatbázis-backup/restore eljárás szükséges.

## Hatókör

Ez a konfiguráció az image-ek, a belső routing és a telepítési szerződés
repository-oldali előkészítése. Nem végez image-publikálást, szervertelepítést,
adatbázis-migrációt, infrastruktúra-módosítást vagy publikus HTTPS-beállítást.
