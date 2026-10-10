# GitHub Actions

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
- pozitív esetben ellenőrzi a közös, teljes commit-SHA taget, negatív esetekben
  elutasítja a `latest`, rövid, nagybetűs, valamint 39 és 41 karakteres tageket;
- a digesttel rögzített hivatalos Caddy image `validate` parancsával ellenőrzi a
  gateway és a frontend Caddyfile-t;
- felépíti a backend és frontend production image-et;
- nem jelentkezik be a GHCR-be;
- nem pushol image-et;
- csak `contents: read` jogosultságot kap;
- nem használ repository- vagy environment-secretet.

Sikeres main Quality CI után:

- kizárólag a `Quality CI` sikeres, `main` ági `push` futása indíthat
  publikálást;
- a workflow az upstream futás pontos `head_sha` commitját checkoutolja;
- csak a publikáló job kap `packages: write` jogosultságot;
- a GHCR-login a beépített `GITHUB_TOKEN` használatával történik;
- a backend és frontend image kizárólag teljes commit SHA taget kap;
- `latest` tag nem készül;
- az image OCI `source` és `revision` labelt tartalmaz.

Publikált image-nevek:

```text
ghcr.io/balintbotond89/btphoto-backend:<teljes-commit-SHA>
ghcr.io/balintbotond89/btphoto-frontend:<teljes-commit-SHA>
```

A workflow nem használ `pull_request_target` eseményt, nem tölt le vagy hajt
végre upstream artifactot, nem használ self-hosted runnert, és deploymentet sem
végez. Későbbi hardeningként a Compose deployment a GHCR által visszaadott
immutable image digestre is rögzíthető a commit-SHA tag feloldása után.

Az actionök teljes commit SHA-val vannak rögzítve; a kommentek jelzik az
ellenőrzött stabil release-verziót.

## Későbbi workflow-k

A következő, külön scope-ba tartozó lépések:

- `cockroach-integration-check.yml` valódi, eldobható CockroachDB
  tesztkörnyezettel;
- `production-deploy.yml` jóváhagyott production environmenttel, kontrollált
  runnerrel, health/smoke ellenőrzéssel és rollback-eljárással.
