# GitHub Actions

## CR-0001 PR-regresszió

A preflight pozitív/negatív avatar-mount és regisztrációs gate fixture-eket kapott.
A backend read-only root és cap_drop ALL szerződése megmarad, kizárólag az előírt avatar bind írható.
A backend image külön, nem root, hálózat nélküli AvatarCodecProbe PNG/JPEG runtime-próbát és
tenant-v1 account-contract címkeellenőrzést kap.

A V3 migráció után három sikeres history sor, hat public tábla és az admin_user tíz oszlopa elvárt.
Az eldobható CockroachDB-fixture a régi repository-teszt mellett az AccountRepositoryCockroachTest
kétfotós profil-, kompozit FK-, e-mail-egyediség-, egyszeri jóváhagyás-, singleton- és
kezdeti jelszófogyasztási konkurenciatesztjét is futtatja.
A BTPHOTO_TEST_FIXTURE=ephemeral-cockroach26 marker és loopback insecure URL kötelező;
a tesztek nem használhatják a production sql01 adatbázist.

Helyben ezek hiányzó fixture esetén kihagyottak, nem sikeres DB-bizonyítékok.
A GitHub-hosted futás a commit/push utáni PR-gate; ebben az implementációs munkában még nem futott.
Az action-SHA-k és a három image közös SHA-szerződése megmaradnak.

## Quality CI

A `quality-ci.yml` a backend és frontend automatizált minőségkapuja. A workflow
GitHub-hosted Ubuntu runneren, `contents: read` jogosultsággal fut a `main` ágra
irányuló pull requesteknél, valamint a `main` és `feature/**` ágak push
eseményeinél.

A backend job Java 21 alatt futtatja a Maven Wrapper `clean verify` folyamatát.
A frontend job Node.js 24 alatt futtatja az install, Astro check, lint, Vitest,
production build és dependency audit lépéseket.

## Production Image Build

A `production-image-build.yml` minden esetben GitHub-hosted runneren fut, és
két elkülönített működési módja van.

Pull request esetén:

- dummy, nem production konfigurációval lefuttatja a production preflightot;
- pozitív esetben ellenőrzi a backend, frontend és migrations közös, teljes
  commit-SHA tagjét, negatív esetekben
  elutasítja a `latest`, rövid, nagybetűs, valamint 39 és 41 karakteres tageket;
- elutasítja a hiányzó migrations image-et és a három komponenstől eltérő taget;
- a digesttel rögzített hivatalos Caddy image `validate` parancsával ellenőrzi a
  gateway és a frontend Caddyfile-t;
- strukturáltan ellenőrzi, hogy a backend nem kap hozzáadott capabilityt, a
  frontend és a gateway pedig a `cap_drop: ALL` mellett kizárólag a
  `NET_BIND_SERVICE` capabilityt kapja vissza;
- ellenőrzi a read-only root fájlrendszert, a `no-new-privileges` védelmet és a
  kizárólagos `127.0.0.1:8080` gateway portpublikálást;
- felépíti a backend, frontend és migrations production image-et;
- mindhárom saját image OCI revision címkéjét ellenőrzi;
- a PR-ben épített frontend image-et ideiglenes lokális CI-taggel betölti, de
  nem publikálja;
- a minimális capability-szerződés strukturális ellenőrzése után izolált,
  külső hálózat és hostport nélküli pozitív runtime- és health-teszttel
  ellenőrzi a frontend `/health` és a gateway `/_gateway/health` végpontját a
  célzott `NET_BIND_SERVICE` capability mellett;
- digesttel rögzített CockroachDB 26.2.2 CI-fixture-ben kétszer lefuttatja a
  tényleges migrations image-et, ellenőrzi a sikeres V1/V2/V3 history sorokat,
  az `admin_user` sémát és ugyanazon eldobható adatbázison a JPA repository
  integrációját, majd hibás kapcsolatnál igazolja a backend indítási kapujának
  blokkolását;
- nem jelentkezik be a GHCR-be;
- nem pushol image-et;
- csak `contents: read` jogosultságot kap;
- nem használ repository- vagy environment-secretet.

A CockroachDB fixture `--insecure` módja kizárólag eldobható CI-kompatibilitási
teszt. Nem használja a production `sql01` adatbázist, és nem helyettesíti a
production `sslmode=verify-full` TLS smoke tesztet.

Sikeres main Quality CI után:

- kizárólag a `Quality CI` sikeres, `main` ági `push` futása indíthat
  publikálást;
- a workflow az upstream futás pontos `head_sha` commitját checkoutolja;
- csak a publikáló job kap `packages: write` jogosultságot;
- a GHCR-login a beépített `GITHUB_TOKEN` használatával történik;
- a backend, frontend és migrations image kizárólag ugyanazt a teljes commit
  SHA taget kapja;
- `latest` tag nem készül;
- az image OCI `source` és `revision` labelt tartalmaz.

Publikált image-nevek:

```text
ghcr.io/balintbotond89/btphoto-backend:<teljes-commit-SHA>
ghcr.io/balintbotond89/btphoto-frontend:<teljes-commit-SHA>
ghcr.io/balintbotond89/btphoto-migrations:<teljes-commit-SHA>
```

A workflow nem használ `pull_request_target` eseményt, nem tölt le vagy hajt
végre upstream artifactot, nem használ self-hosted runnert, és deploymentet sem
végez. Későbbi hardeningként a Compose deployment a GHCR által visszaadott
immutable image digestre is rögzíthető a commit-SHA tag feloldása után.

Az actionök teljes commit SHA-val vannak rögzítve; a kommentek jelzik az
ellenőrzött stabil release-verziót.

## Későbbi workflow-k

A következő, külön scope-ba tartozó lépések:

- `production-deploy.yml` jóváhagyott production environmenttel, kontrollált
  runnerrel, health/smoke ellenőrzéssel és rollback-eljárással.

## UI-01 kiegészítés

A deployment-contract negatív fixture már a bekapcsolt, de CAPTCHA-konfiguráció nélküli
regisztrációt is elutasítja. A backend CAPTCHA-tesztjei mockolt Google-válaszokat használnak;
valódi secret és külső Google-hívás nem szükséges a CI-hez.
