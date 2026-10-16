# CR-0002 – Következő üzemeltetői lépés

## Állapot és felelősséghatár

2026-10-15. A CD repository-oldali munkája még nincs commitolva/pusholva.
GitHub Environment és self-hosted runner jelenleg nincs. A docker01 botond
felhasználója nem kap non-interaktív sudót; ezt Docker-hozzáféréssel nem kerüljük meg.
A következő egyszeri root művelet csak a letiltott CD-motor telepítése.
Nem indít staginget, nem állítja le a productiont, és nem ad általános sudo-jogot.

## 1. Most elvégezhető root művelet a docker01-en

A credentialmentes csomag már a docker01 ezen könyvtárában van:

```text
/home/botond/btphoto-cd-bootstrap.ME85XG/bundle
```

Root munkamenetben külön, csak root által írható könyvtárba kell másolni.
A forrás botond-home, a cél a docker01 /root könyvtára; ez nem Git checkout/deploy.

```shell
install -d -o root -g root -m 0700 /root/btphoto-cd-bootstrap-ME85XG
install -o root -g root -m 0600 -- \
  /home/botond/btphoto-cd-bootstrap.ME85XG/bundle/install-cd.py \
  /home/botond/btphoto-cd-bootstrap.ME85XG/bundle/btphoto_cd.py \
  /home/botond/btphoto-cd-bootstrap.ME85XG/bundle/btphoto-cd \
  /home/botond/btphoto-cd-bootstrap.ME85XG/bundle/policy.example.json \
  /home/botond/btphoto-cd-bootstrap.ME85XG/bundle/manifest.json \
  /root/btphoto-cd-bootstrap-ME85XG/
```

Először a telepítő eredetét kell ellenőrizni, majd a telepítő a teljes csomagot
ellenőrzi. Csak OK után következik végrehajtás; eltérésnél meg kell állni.

```shell
printf '%s  %s\n' \
  '9c076587bd3c5915080ed35442467b1ff1464605e536c43c08333ae37e270745' \
  '/root/btphoto-cd-bootstrap-ME85XG/install-cd.py' \
  | sha256sum --check - && \
python3 -I /root/btphoto-cd-bootstrap-ME85XG/install-cd.py \
  --bundle /root/btphoto-cd-bootstrap-ME85XG \
  --manifest-sha256 d7a5523befbec29af62f41933668c302250b579127f8baf02b109e8ec789c7f4 \
  --execute
```

Elvárt eredmény: a motor települt, **mindkét környezet letiltott**.
Kulcsértéket, policy-/env-tartalmat nem kell bemásolni. Hiba esetén csak a hibaüzenet
kell; a telepítőt nem szabad újrafuttatással vagy célfájlok törlésével erőltetni.
A csomag ellenőrzési módja --execute nélkül nem ír rendszerfájlokat.

## 2. Utána szükséges, külön ellenőrzött lépések

### Következő lépés: az igazolt sql01 root SQL-kapcsolat használata

A felhasználó igazolta a root tanúsítvány érvényességét és a root SQL-kapcsolatot;
az admin tanúsítványt/kulcsot nem kell a docker01-re másolni. A meglévő production
adatbázis btphoto, a staging még nincs. A CD-motor root telepítése szintén igazolt,
mindkét környezet disabled maradt. A fenti root telepítő nem futtatandó újra.

Az egyetlen átadandó, titokmentes fájl a fejlesztői gépen:
`C:/GitRepok/btphoto-cloud/deploy/cd/provision-staging-sql01.py`.
Cél az sql01-en: `/root/btphoto-provision-staging-sql01.py`.
Meglévő, ellenőrzött fájlátvitellel másolható. Ha nincs ilyen kapcsolat, root
terminálon nano segítségével a teljes forrás bemásolható; nincs új SSH-beállítás
vagy hitelesítési ellenőrzés kikapcsolása. Titkos adat nincs a forrásban.

```shell
nano /root/btphoto-provision-staging-sql01.py
```

Mentsd a teljes forrást, majd hash-ellenőrzés után futtasd. Eltérő hash esetén
a Python nem indul el; ne változtasd az elvárt hashértéket a hibás másolathoz.

```shell
chmod 0700 /root/btphoto-provision-staging-sql01.py &&
printf '%s  %s\n' \
  'eac8879f2c787b6efae1ede7c3e8178e1f7de298859265257a622f68f5390a1b' \
  '/root/btphoto-provision-staging-sql01.py' \
  | sha256sum --check - &&
python3 -I /root/btphoto-provision-staging-sql01.py --execute
```

Két eltérő, jelszókezelőbe előre mentett 32–128 karakteres jelszó szükséges,
betű/szám/aláhúzás/kötőjel készlettel. Mindkettőt rejtetten kéri és megismételteti;
végül a STAGING szó jóváhagyja a tényleges írást. Runtime jelszó később a staging
Environment DB_PASSWORD, migrációs jelszó a MIGRATIONS_PASSWORD secretjébe kerül.
Jelszó nem küldhető chatben. Elvárt eredmény: STAGING SQL ELŐKÉSZÍTÉS SIKERES.
Ez még nem Flyway vagy valódi izolációs teszt; az üzleti táblákat a migrations
image hozza majd létre. Hiba után részleges objektumok megmaradhatnak; ne indítsd
újra, ne töröld és ne írd felül őket automatikusan. Csak a hibaüzenetet küldd vissza.

### Teljes fennmaradó sorrend

1. Az sql01 hiteles hostkulcs-ujjlenyomatának ellenőrzése a VM konzolján, majd
   SSH known_hosts biztonságos felvétele. A StrictHostKeyChecking nem kapcsolható ki.
   SSH nem feltétele a SQL-kapcsolatnak: a docker01 védett libpq admin service-e
   is megfelelő lehet, verify-full TLS-sel. Az admincredentialt nem chatben kérjük.
2. Két staging SQL-felhasználó és btphoto_staging DB létrehozása az ellenőrzött
   create-staging-users.py eszközzel. Valódi keresztadatbázis- és DDL-tiltás igazolása.
3. Elkülönített staging NFS alkönyvtár és ingress hálózatok előkészítése;
   meglévő hálózat/UID/NFS root-squash és tenant-hozzáférés ellenőrzése.
4. GitHub staging/production Environment, eltérő secretkészlet és production reviewer;
   a titkokat védett bevitellel kell feltölteni. A CAPTCHA nélküli induláskor
   regisztráció disabled marad; a teljes regisztrációs elfogadáshoz valódi kulcspár kell.
5. Két korlátozott runnerfelhasználó, ellenőrzött runnerbinárisok, célzott sudoers
   és negatív hozzáférési tesztek. A nyilvános repo kockázata elfogadott, a label
   nem teljes PR-kizárás. Új repository nem készül.
6. Külön jóváhagyott commit/push, valódi GitHub-hosted CockroachDB CI, merge és
   image-publikálás. Staging előbb; automatikus kapcsolók csak kész előfeltételekkel.
7. Staging runtime/rollback és böngészős elfogadás. Caddy edge csak ellenőrzött DNS,
   router/80/443 és Basic Auth után; SQL/NFS/menedzsment nem kerül nyilvánosságra.
8. A jelenlegi, kézzel kezelt production stack külön átadási/cutover-tervet igényel.
   A motor szándékosan nem állítja le és nem vesz át hamis current.json alapján.
   Jóváhagyásos production CD csak az átadás és kompatibilitási/backup kapu után.

## 3. Bizonyíték és követelmény

US-0012, NFR-SEC-0002, NFR-DEP-0001, TR-DEP-0001, AC-CD-09 támogatása.
A telepítő fixture-jei tesztelik a manifest/tartalom módosítását, symlinket,
engedélyezett kezdőpolicyt, meglévő cél felülírásának tiltását és a Linux fájlmódokat.
A pozitív Linux fixture ideiglenes könyvtárban futott, root tulajdonosi műveleteket
mockolva, valódi fájlírással/fsync-kel/hardlinkkel. Ez nem tényleges root telepítés.
Linuxon 38/38 CD-teszt sikeres, Windows alatt 36 sikeres és 2 POSIX próba kihagyott.
Teljes CD-, valódi SQL-, runner- és nyilvános HTTPS-elfogadás továbbra sincs.

## 4. Következő root lépés – automount/NFS preflight javítás

2026-10-16: a staging SQL-előkészítés, a két staging user production SELECT
elutasítása, a staging ingress és az NFS-könyvtár létrehozása már igazolt.
Az élő, hálózat nélküli konténeres UID/GID 10001 írás/olvasási próba sikeres.
A korábbi, még nem létező előfeltételekre vonatkozó megjegyzések történeti checkpointok.

A jelenlegi findmnt két sort ad vissza (autofs és nfs4). A CD-motorban ezt javítani
kellett: valódi NFS-szűrés, nem az ellenőrzés elhagyása. A javított motor natív
ellenőrzése sikeres; /tmp nem-NFS-ként elutasítva. Production stack nem változott.
Az új fájl a docker01-en: /home/botond/btphoto-cd-nfs-preflight-20261016.py.

Csak a docker01 root termináljában, más deployment nélkül futtatható. Megköveteli
a letiltott környezeteket és az ismert régi motorhash-t, megőrzi a régi kódot,
a célkönyvtárban ellenőrzi az új fájlt, és atomikusan cseréli a motort.
Policy, request-key, sudoers, adatbázis, mount és stack nem módosul.

```shell
(
  set -eu
  python3 -I -c 'import json; p=json.load(open("/etc/btphoto-cd/policy.json")); assert set(p)=={"staging","production"} and all(v.get("enabled") is False for v in p.values()), "A CD nincs letiltva; megalltam."'

  printf '%s  %s\n' \
    '7007aed34dce407a76e92fc4316f659985ce2ed9791f0c6aeaefb68b15da400d' \
    '/usr/local/lib/btphoto-cd/btphoto_cd.py' | sha256sum --check -

  test ! -e /root/btphoto-cd-before-nfs-20261016.py
  test ! -L /root/btphoto-cd-before-nfs-20261016.py
  test ! -e /usr/local/lib/btphoto-cd/.nfs-20261016.pending
  test ! -L /usr/local/lib/btphoto-cd/.nfs-20261016.pending

  cp -p -- /usr/local/lib/btphoto-cd/btphoto_cd.py \
    /root/btphoto-cd-before-nfs-20261016.py

  install -o root -g root -m 0644 -- \
    /home/botond/btphoto-cd-nfs-preflight-20261016.py \
    /usr/local/lib/btphoto-cd/.nfs-20261016.pending

  printf '%s  %s\n' \
    '85976b9fb839ce1f60c6debc5d949fceb645e173e6438395e1585ad0d3c92e34' \
    '/usr/local/lib/btphoto-cd/.nfs-20261016.pending' | sha256sum --check -

  mv -T -- /usr/local/lib/btphoto-cd/.nfs-20261016.pending \
    /usr/local/lib/btphoto-cd/btphoto_cd.py

  stat -c '%U:%G %a %n' /usr/local/lib/btphoto-cd/btphoto_cd.py
  printf '%s\n' 'NFS PREFLIGHT JAVITAS TELEPITVE; A CD TOVABBRA IS LETILTVA.'
)
```

Siker után sem kell újrafuttatni a bootstrap telepítőt vagy engedélyezni a CD-t.
Hiba esetén a meglévő backup/pending fájlt nem szabad törölni vagy felülírni;
csak a hibaüzenetet kell visszaadni. A következő önálló fázis a korlátozott runner.

## 5. Végrehajtási checkpoint – 2026-10-16

A felhasználó a 4. fejezet sikeres konzolkimenetét visszaküldte: a régi motor és
az új pending fájl hash-ellenőrzése OK, a végleges motor root:root 0644,
NFS PREFLIGHT JAVITAS TELEPITVE; A CD TOVABBRA IS LETILTVA.
A 4. fejezet parancsait és a bootstrap telepítőt nem kell újra végrehajtani.
A külön jóváhagyott Git commit/push nem kapcsolja be a CD-t, és nem regisztrál
runnert; a fennmaradó szerveroldali kapuk külön ellenőrzött fázisban következnek.
