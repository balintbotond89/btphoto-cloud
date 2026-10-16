# CR-0002 – Elkülönített staging és jóváhagyott production CD

**Döntés:** 2026-10-15, felhasználó által elfogadott infrastruktúrairány.
**Státusz:** repository-implementáció folyamatban; infrastruktúra- és runtime-elfogadás nyitott.

## 1. Hatókör

A BR-OPS-0001 → US-0011/US-0012 → NFR-MNT-0002/NFR-DEP-0001/NFR-SEC-0002/NFR-OPS-0001 → TR-DEP-0001/TR-DEP-0002/TR-OPS-0001 lánc kiegészítése. Klasszikus üzleti FR nem keletkezik. A CR-0001 fotósregisztrációs követelményei nem változnak. Új üzleti SQL-migráció nem szükséges.

Az sql01 meglévő CockroachDB-példányában külön btphoto_staging adatbázis, külön runtime- és migrációs felhasználó készül. A production btphoto adatbázis neve és adatai megmaradnak. A közös VM/klaszter erőforrás- és hibahatára nem szűnik meg. A staging nem használható terhelési vagy klaszterszintű hibatesztekre.

A docker01-en külön btphoto-staging Compose projekt, hálózatok, root-only release/config/state fájlok és NFS-avataralkönyvtár szükséges. A production projekt neve btphoto marad. A kiadási motor nem írja felül a korábbi /opt/btphoto checkoutot vagy /etc/btphoto/.env.production fájlt. Az első production átvétel külön, kompatibilitást igazoló műveleti kapu; ismeretlenül kezelt élő stacket nem állíthat le automatikusan.

Caddy marad a reverse proxy. Nyilvános címek: btphoto.hu és www.btphoto.hu; staging.btphoto.hu külön Basic Auth védelmet kap. A staging/production munkamenet, DB-secret, CAPTCHA-kulcspár és avatar tároló nem közös. A belső gateway csak a szűken rögzített edge-címből fogad proxyfejlécet.

## 2. Pipeline és bizalmi határ

A build és minden PR-teszt GitHub-hosted runneren fut. A staging/main push kiadási kapui a tényleges head SHA-ra is lefutnak. Mindhárom image közös 40 karakteres SHA-t, OCI source/revision és sémaujjlenyomat címkét kap. A deploy image-et nem épít, hanem SHA+digest referenciát használ.

A staging automatikus, production esetén GitHub Environment required reviewers kapu kötelező. A main kiadási SHA-ja stagingen is ellenőrzött; nem elegendő a merge előtti staging branch eltérő SHA-ja. Production előtt a szerveroldali staging receiptnek ugyanazt a release SHA-t és három digestet kell tartalmaznia. Időközben felülírt staging receipt esetén nincs production aktiválás.

A felhasználó self-hosted deploy runnert választott. Nyilvános repository esetén ez magas kockázatú; a runner nem lehet docker csoporttag, nem kaphat Docker socketet vagy általános sudót. Külön staging/production runneridentitás és minimális, argumentum nélküli root belépési pont szükséges. A root belépési pont környezetenként eltérő HMAC-kulcsot, GitHub API-val ellenőrzött futás-/joberedetet és production reviewer-konfigurációt követel. Nem hajt végre checkoutból származó root programot vagy Compose-fájlt. A kérést csak a jóváhagyott jobnak kiadott secret hitelesítheti; a label önmagában nem védelem. A runner további hardeningje és valós támadási próbája élesítési előfeltétel.

## 3. AC / teszteset / bizonyíték

| AC | Követelmény | TC |
| --- | --- | --- |
| AC-CD-01 | staging adatbázis/felhasználók nem olvashatják/írhatják a production táblákat; fordított hozzáférés sem engedett a kijelölt runtime usereknek | TC-CD-01 SQL negatív hozzáférés és migráció |
| AC-CD-02 | pontos projekt-, port-, hálózat-, mount-, capability-, tmpfs- és erőforrás-szerződés; környezetek közt nincs írható storage-átfedés | TC-CD-02 pozitív/negatív config és inspect fixture; valós inspect |
| AC-CD-03 | sikertelen quality/contract/DB/runtime kapu után nincs image publish vagy deploy | TC-CD-03 workflow eredet és dependency fixture; valódi CI |
| AC-CD-04 | csak staging/main push SHA-ja telepíthető; nincs PR deployment; sérült HMAC, idegen workflow, futás vagy runner elutasítva | TC-CD-04 kérés- és GitHub fixture |
| AC-CD-05 | production reviewer-kapu és egyező staging SHA/digest receipt nélkül nincs production aktiválás | TC-CD-05 reviewer/promóció negatív fixture; valós approval |
| AC-CD-06 | ismételt deploy felismeri a saját élő stacket; ismeretlen stack/portfoglaló megmarad | TC-CD-06 állapotgép és valós frissítés |
| AC-CD-07 | hiba után egyszeri diagnosztika/leállítás/helyreállítás; előző verzió újraindul és smoke tesztelt; eredeti hiba megmarad | TC-CD-07 hibainjektált rollback és valós staging próba |
| AC-CD-08 | adatbázis automatikus rollback/clean/törlés nincs; sémaváltozáskor külön jóváhagyott rollback-kompatibilitás kell | TC-CD-08 séma/tenant-contract negatív fixture |
| AC-CD-09 | secret nem kerül Gitbe, buildbe, argv-ba, normál logba vagy artifactba; env nincs source/eval alatt; root-only atomi fájlok | TC-CD-09 serializáció, redakció és jogosultságteszt |
| AC-CD-10 | HTTPS, staging Basic Auth, külön host-only session és hamis proxyfejlécek elutasítása működik | TC-CD-10 Caddy validálás, spoofing és böngészős próba |

Automatizált fixture nem helyettesít valós CockroachDB-, hálózati, HTTPS-, approval- vagy browserbizonyítékot. A TC-CD-01, TC-CD-02 runtime része, TC-CD-03 valódi CI, TC-CD-05 approval, TC-CD-06/07 élő próba és TC-CD-10 böngésző/publikus TLS külön elfogadási kapu.

## 4. Műveleti korlátok

2026-10-15-i további tulajdonosi döntés: a repository nyilvános és személyes
tulajdonban marad; a self-hosted runner kapcsolódó fennmaradó kockázata elfogadott.
Külön deploy repository létrehozása vagy szervezeti áthelyezés nem engedélyezett.
A label/if nem igazolt PR-kizárás; ezt nem állítjuk teljesült AC-nak.
A konfigurált PR/build jobok GitHub-hosted gépen maradnak, a korlátozott root gate,
külön runnerfelhasználók, titokvédelem és production jóváhagyás továbbra is kötelező.

Commit/push, GitHub environment/branch/runner módosítás, DNS/router, SQL provisioning, NFS-jogosultság, root telepítés és production deploy nem következik automatikusan a repository-fájlok elkészítéséből. Ezek végrehajtását a szükséges jogosultság és secret biztonságos rendelkezésre állása mellett külön kell jelenteni. A jelen feladatban sudo-jelszót vagy titkos kulcsot chatben nem kérünk.

A történeti baseline-ok változatlanok. A célzott CR-0002 önálló követelmény-kiegészítés; a korábbi teljesítési jelentések nem válnak utólag CD-bizonyítékká.
