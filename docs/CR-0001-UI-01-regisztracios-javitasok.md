# CR-0001 / UI-01 – Regisztrációs hibajelzés, szövegek, animáció és Google CAPTCHA

**Felhasználói kérés és v2 döntés:** 2026-10-15.\
**Kapcsolat:** US-0015; FR-AUT-0002; NFR-SEC-0001/0002, NFR-USB-0001/0002; TC-REG-0011 és új TC-REG-0013.\
**Státusz:** jóváhagyott célzott kiegészítés; valódi Google-kulcs és végponti elfogadás még nincs.

## 1. Jóváhagyott követelmények

A regisztráció üres kötelező mező esetén megtartja az első hibás mezőre ugrást, de tartós, mező melletti magyar szöveget is ad: „A mező kitöltése kötelező.” A hiba nem csupán színnel jelzett: aria-invalid és a mezőhöz kapcsolt aria-describedby is megjelenik. A felhasználó szerkesztése eltávolítja a korábbi mezőhibát. A hibás e-mail-formátum külön üzenetet kap. Ez az AC-FR-AUT-0002-02/06 pontosítása, nem új üzleti mező.

A cím „Fiók létrehozása”, az „Avatar” felirat helyett „Profilkép” jelenik meg. A login linkje „Regisztráció”; a bevezető „Kérjük adja meg adatait:”. A backend/session/CSRF technikai magyarázat kikerül a felhasználói loginoldalról; maga a biztonsági működés nem változik. A regisztráció is a meglévő canvas-/kurzor-/gombanimációs rendszert használja, a reduced-motion és mobil fallback megtartásával.

A felhasználó Google reCAPTCHA v2 „Nem vagyok robot” jelölőnégyzetet választott, de még nincs kulcspárja. Új AC-FR-AUT-0002-07 / TC-REG-0013: a regisztráció kizárólag a Google által elfogadott, az engedélyezett hostname-hez tartozó válasz után rögzíthető; hiányzó, hibás, lejárt/újrahasznált token, hiányos konfiguráció vagy szolgáltatói hiba nem hozhat létre fiókot és nem írhat profilképet. A korábbi 25 AC mellett ez a 26. kritérium. Nincs CAPTCHA nélküli éles vagy fejlesztői bypass.

## 2. Konfiguráció és API

- `BTPHOTO_RECAPTCHA_SITE_KEY`: nyilvános v2 webhelykulcs.
- `BTPHOTO_RECAPTCHA_SECRET`: titkos szerveroldali kulcs, kizárólag repositoryn kívüli helyi/production konfigurációból; nem PUBLIC_ változó, nem frontend buildargumentum.
- `BTPHOTO_RECAPTCHA_HOSTNAMES`: vesszővel elválasztott, explicit engedélyezett hostname-ek, protokoll/port/útvonal nélkül. Lokális teszthez a ténylegesen használt localhost/127.0.0.1, későbbi publikáláskor a megfelelő valódi domain szükséges, a Google kulcs domainbeállításaival összhangban.

A GET `/api/auth/registration-config` no-store válaszban kizárólag a providert és a nyilvános site key-t adja vissza. Hiányos backend-konfigurációnál a site key üres és a felület érthetően jelzi, hogy a regisztráció nem küldhető be. Emiatt a statikus frontend image-et nem kell titkos kulccsal újraépíteni. A POST `/api/auth/register` multipart `captcha` partban kapja a rövid életű választ; ez nem profiladat és nem kerül SQL-be, URL-be vagy logba.

A backend fix HTTPS Google siteverify címre POST bodyban küldi a secretet és a tokent, redirect nélkül, 3 másodperces kapcsolódási és 5 másodperces kéréslimittel. A válasz legfeljebb 8 KiB, a success és a hostname egyaránt ellenőrzött. Nincs kliens által megadott ellenőrzési URL, Host fejlécből képzett automatikus allowlist vagy Google-hiba-részlet visszaadása. A CAPTCHA megelőzi a regisztráció üzleti service-ének DB-/storage-műveleteit. CSRF és az IP-limiter megmarad. Bekapcsolt regisztrációnál a production validator mindhárom konfigurációs értéket megköveteli, értékük kiírása nélkül.

A Google dokumentációja szerint a token két percig és egyszeri ellenőrzésre használható; a kliens minden tényleges beküldési kísérlet után reseteli a widgetet, lejárat/hiba esetén nem ad tokent. A Google script csak regisztrációs oldalon, rendelkezésre álló konfiguráció után töltődik be. A böngésző közvetlenül a Google-lel kommunikál; a szolgáltatás külső függőség és adatkezelési érintettség, nem helyi botfelismerő algoritmus.

Forrás: [Google v2 widget](https://developers.google.com/recaptcha/docs/display), [Google szerveroldali ellenőrzés](https://developers.google.com/recaptcha/docs/verify).

## 3. Ellenőrzés és korlát

A végső helyi mérés: backend clean verify BUILD SUCCESS, 59 tesztből 52 sikeres és 7 valódi CockroachDB-teszt feltételesen kihagyott, Checkstyle/SpotBugs 0 találat. Frontend check 62 fájlon 0 error/warning/hint; lint sikeres; 15 tesztfájl 89/89 tesztje sikeres; build öt statikus oldal; audit 0 ismert sérülékenység. A módosított workflow 3 jobja, 8 Bash-blokkja és a POSIX validator szintaktikailag érvényes. A validator tényleges Python-blokkja szintetikus Compose-struktúrán két pozitív és három hiányzó-kulcsos negatív fixture-t helyesen kezelt. Ez nem valódi Docker-futtatás.

A RecaptchaVerifierTest mockolt HTTP-válaszokkal vizsgálja a sikeres ellenőrzést, hostname-eltérést, hiányzó/túl hosszú tokent, hiányos konfigurációt, lejárt/duplikált elutasítást, hibás/túl nagy szolgáltatói választ, hálózati hibát és megszakítást. Az AccountFlowIntegrationTest igazolja, hogy CAPTCHA-hiba nem hoz létre accountot és nem éri el az avatartárolót. A frontendtesztek a widget betöltési állapotát, siker/lejárat/reset/hiba/dispose működését, a token multipart átadását, a mezőszintű hibát és a pontos szövegeket ellenőrzik.

Az automatikus teszt nem valódi Google-ellenőrzés. Valódi kulcs még nincs: a Google widget érvényes domainen való megjelenése és a valódi token elfogadása/elutasítása nyitott elfogadási pont. Titkos kulcsot nem szabad chatben megadni. A teljes regisztráció DB/NFS/operator és production elfogadási kapui változatlanul nyitottak. Új dependency és adatbázis-migráció nincs; commit, push vagy deployment nincs engedélyezve ebben a javításban.

A computer-use készséggel végzett, 2026-10-15-i helyi böngészős ellenőrzésben az üres beküldés lastName fókuszt, aria-invalid jelölést és mező melletti „A mező kitöltése kötelező.” szöveget adott. A közös motion-enhanced rendszer a regisztráción és a loginon aktív, a canvas-/kurzorhatás látható. A 390/768/1280 px szélességek világos/sötét témájának stabil állapotában nincs vízszintes túlcsordulás; a clientWidth/scrollWidth párok 375/375, 753/753 és 1265/1265. A témaváltás átmeneti animációja közbeni pillanatképeket nem használtuk végállapotmérésként. A loginban a kért új bevezető és Regisztráció-link látható, a technikai magyarázat hiányzik. Képi bizonyíték: btphoto-registration-required-ui01.png és btphoto-registration-required-mobile-ui01.png, a feladat helyi artifactkönyvtárában. A no-database backend a hiányzó CAPTCHA-beállítást jelezte; valódi fiók, secret vagy Google-token nem került beküldésre. Az ideiglenes, csak loopbackes tesztfolyamatok nem production deploymentet jelentenek.
