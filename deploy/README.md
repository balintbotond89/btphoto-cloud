# Production deployment

Az első belső production-szerű stack három szolgáltatást futtat a `docker01`
gépen:

- `backend`: Spring Boot alkalmazás, közvetlen hostport nélkül;
- `frontend`: az Astro statikus buildet kiszolgáló belső Caddy, hostport nélkül;
- `caddy`: belső gateway és reverse proxy, kizárólag a
  `127.0.0.1:8080` hostcímen publikálva.

A CockroachDB nem része a Compose stacknek. A backend a belső hálózaton éri el
a `sql01` gépet. Ebben a fázisban a backend nem kapja meg az NFS média mountot,
és a gateway nem konfigurál publikus 80/443 portot, DNS-nevet vagy automatikus
HTTPS-t.

## Image-ek és hálózatok

A stack kizárólag teljes Git commit SHA-val címkézett GHCR image-et fogad:

```text
ghcr.io/balintbotond89/btphoto-backend:<teljes-commit-SHA>
ghcr.io/balintbotond89/btphoto-frontend:<teljes-commit-SHA>
```

`latest` fallback nincs. A `web` bridge a gateway és a frontend közötti belső
forgalmat, az `application` bridge pedig a gateway és a backend kapcsolatát,
valamint a backend `10.20.0.20:26257` irányú kimenő kapcsolatát biztosítja.

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

A `SPRING_PROFILES_ACTIVE=cockroachdb` és a
`DB_SSL_ROOT_CERT=/run/secrets/btphoto/cockroach-ca.crt` értékeket a Compose
fail-safe konstansként állítja be. Ezek nem írhatók felül a production
env-fájlból.

A host `/etc/btphoto/certs/ca.crt` fájlja read-only bind mountként kerül a
backendbe. A tanúsítvány tartalma nem kerül image-be vagy Gitbe.

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
feloldott backend- és frontend-image-nevekből igazolja, hogy mindkettő ugyanazt
a pontosan 40 karakteres, kisbetűs hexadecimális Git SHA taget használja. Az
env-fájlt nem hajtja végre shellkódként, és a `DB_PASSWORD` értékét nem írja ki.

Az indítás registry image-ekből történik; a production gép nem buildel image-et.

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

## Rollback

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
