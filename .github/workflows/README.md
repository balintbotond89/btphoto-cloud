# GitHub Actions

A `quality-ci.yml` a backend és frontend első automatizált minőségkapuja.
A workflow a következő eseményeknél fut:

- a `main` ágra irányuló pull request;
- push a `main` ágra;
- push bármely `feature/**` ágra.

A workflow GitHub-hosted Ubuntu runneren, kizárólag `contents: read`
jogosultsággal fut, és két stabil nevű jobot tartalmaz:

- `Backend quality gate`: Temurin Java 21 és Maven dependency cache után a
  `backend` könyvtárban futtatja a `./mvnw clean verify` parancsot;
- `Frontend quality gate`: Node.js 24 és npm cache használatával a `frontend`
  könyvtárban sorrendben futtatja az alábbi parancsokat:

```shell
npm ci --no-audit --no-fund
npm run check
npm run lint
npm run test:run
npm run build
npm audit --audit-level=high
```

Ez a workflow nem használ repository- vagy environment-secretet, nem készít
production image-et, és nem végez deploymentet vagy infrastruktúra-elérést.

A CockroachDB-integrációs ellenőrzés, a GHCR production image build és a
production deployment külön, későbbi workflow-fázisban készül el:

- `cockroach-integration-check.yml`;
- `production-image-build.yml`;
- `production-deploy.yml`.
