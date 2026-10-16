# BTPhoto Private Cloud – Fejlesztési baseline v0.4

**Baseline azonosító:** `BTPC-BL-2026-10-14-v0.4`\
**Követelménydöntés dátuma:** `2026-10-14`\
**Manifest és lezárási státusz ellenőrzése:** `2026-10-15`\
**Előző baseline:** `BTPC-BL-2026-10-11-v0.3`

## 1. Hatókör és státusz

A baseline a felhasználó által jóváhagyott CR-0001 követelményállapotát rögzíti: több fotós saját munkaterülettel, egyetlen üzemeltető által jóváhagyott regisztrációval. A 01–09 dokumentum és a CR-terv alábbi hashértékei a tényleges fájlbájtokra vonatkoznak. A történeti v0.1–v0.3 baseline változatlan. A baseline nem jelent sikeres PR-, production- vagy teljes többfotós üzleti elfogadást.

## 2. Elfogadott döntések

- Közös `/login/`; az üzemeltető ADMIN szereppel `/admin/`, a jóváhagyott fotós PHOTOGRAPHER szereppel `/workspace/` felületet használ.
- Új regisztráció PENDING és inaktív, saját account/workspace/profile rekorddal; a beküldés nem hoz létre hitelesített sessiont.
- Legfeljebb egy SystemAdmin binding adatbázis-invariáns; a pontosan egy működő üzemeltető eléréséhez külön, auditált provisionálás szükséges.
- Kezdeti hitelesítő nincs SQL-ben, repositoryban vagy image-defaultban. Egy sikeres első belépés korlátozott jelszócsere-sessiont ad; a jelszócsere után új login szükséges. Normál jelszócsere minden korábbi admin-sessiont visszavon.
- Backend-oldali szerep- és tulajdonosellenőrzés, friss session-kontekstus; a frontend route guard nem biztonsági határ.
- A fizikai `admin_user` tábla megmarad. V3 új operator-, workspace-, profil- és vállalkozási struktúrát hoz létre; V1 és V2 változatlan.
- Avatar kizárólag ellenőrzött JPEG/PNG bemenetből, tenant/account/UUID relatív útvonallal és normalizált PNG-kimenettel, tartós NFS-adapteren keresztül kezelhető.
- A backend kizárólag az avatar-alkönyvtárat kapja meg írható bindként, nem a teljes médiatárat. Root fájlrendszere read-only marad; váratlan mount és capability nem elfogadott.
- A regisztráció alapértelmezetten kikapcsolt. A schema-, operator-, NFS-, CI- és deployment-gate-eket külön kell teljesíteni.
- Az új tenantadatok mellett a legacy, minden aktív fióknak ADMIN szerepet adó backend nem biztonságos rollbackcél. A deployment script frissítése külön operatív feladat.
- Az ügyfél/galéria/média/proofing teljes tenant-implementációja és az automatikus CD későbbi ciklus; ebben a baseline-ban ezek szerződése, nem teljesített funkciója szerepel.

## 3. Követelménydokumentumok SHA-256

A 2026-10-15-i felhasználói UI-01 és Google reCAPTCHA v2 döntés a még nem commitolt v0.4 követelményállapot része. Az eredeti 25 AC mellett AC-FR-AUT-0002-07 is érvényes; a manifest a külön kiegészítést is rögzíti.

| Fájl | SHA-256 |
| --- | --- |
| `01-uzleti-kovetelmenyek.md` | `7e0eb244dd00bca18f403d0cac23049fac98adb10439e5128964cb9823722356` |
| `02-epicek-es-user-storyk.md` | `261cd3b69160a5d10a6d33654ba3549feecb4aea4e4d21145965fec209ae5997` |
| `03-funkcionalis-kovetelmenyek.md` | `378888ffbd4aefa91fbc9a77e6ffba5081f36029e9f906335c5947c99bf93f6d` |
| `04-nem-funkcionalis-kovetelmenyek.md` | `dab60e6fe36aabb1b6306001d1c6aae911b7f2dc646706cdec6e7fb42628be3a` |
| `05-technikai-kovetelmenyek.md` | `b07fd9e0e23982d500e8d5435495658d170631af8b437cee050e45aa3fb5337e` |
| `06-teszteset-gyujtemeny.md` | `9f63f9f5162e8b3dd892ea6165db9ee58fa9138b4d4e3852f40fafddd02f20d2` |
| `07-nyomonkovethetosegi-matrix.md` | `be3a1b979121be787fac7e46bc20cf6df3dc1085563b6087cd3577e9721b8cb3` |
| `08-ui-ux-terv.md` | `ca186b5b29b0e13fda0797750c8fe6d986340d7508d59d0f76a8b5645a8be31d` |
| `09-rendszerterv-es-szolgaltatasarchitektura.md` | `932bca09f8a816d5664d02d4356e8d725a714996db9e706211b6ad33bba42373` |
| `CR-0001-fotos-regisztracio-terv.md` | `3242fe622c9b18b32782e6e1ca1bbaf42cbf5c00d8521dc41cd4bb126243b727` |
| `CR-0001-UI-01-regisztracios-javitasok.md` | `6ba292bcd66e61911e44dee9ce0a2f979924e71208bf1f347fae7ec1556bc778` |

## 4. Implementációs bizonyíték

A helyi mérési eredményeket, a teljes fájlleltárt és a nyitott 26 AC státuszát a [CR-0001 implementációs jelentés](CR-0001-implementacios-jelentes.md) rögzíti. A baseline követelmény-pillanatkép, nem release commit vagy deploymentengedély.
