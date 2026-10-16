# CR-0001 – Többfotós platform, regisztráció és üzemeltetői jóváhagyás

**Dátum:** 2026-10-14\
**Státusz:** jóváhagyott terv; repository-implementáció helyileg ellenőrzött, kiadási és production elfogadás nyitott\
**Kiindulás:** a meglévő session-alapú admin-hitelesítés és a külön Flyway migrations komponens.\
**Felhasználó által módosított üzleti döntés:** a platform több fotós egymástól elkülönített munkafolyamatát kezeli. Minden fotós saját munkaterületet kap. Pontosan egy üzemeltetői adminfiók létezik, amely külön felületen hagyja jóvá vagy utasítja el a fotósregisztrációkat. A korábbi, közös BTPhoto munkaterületre építő döntést ez a változat felváltja.

**További felhasználói döntés:** az üzemeltető és a fotós ugyanazon `/login/` oldalon lép be. Az ADMIN szerepű fiók a külön `/admin/` oldalra kerül, és ott bírálja el a fotósregisztrációkat. A kezdeti üzemeltetői felhasználónév `admin`; a felhasználó által meghatározott ideiglenes jelszó egyetlen sikeres belépésre érvényes. Az ideiglenes jelszó konkrét értéke nem kerül verziókövetett dokumentumba, kódba, SQL-migrációba vagy teszt-fixture-be.

Ez a dokumentum a felhasználó által 2026-10-14-én jóváhagyott követelménybővítés és implementációs szerződés. A megvalósítás elindítása engedélyezett; production adat-/infrastruktúra-módosítás, commit, push vagy deployment továbbra is külön művelet. A történeti baseline-ok változatlanok.

## 1. Kiinduló állapot és változtatási cél

A terv elfogadása előtti kiinduló állapotban a V2 migráció létrehozza az `admin_user` táblát, de nem hoz létre fiókot. A korábbi backend felhasználónévvel vagy e-maillel hitelesít, az aktív rekordokhoz ADMIN szerepet rendel. Regisztrációs oldal, fotósprofil, jóváhagyási felület és avatartárolás ebben a kiinduló állapotban még nincs. A megvalósítás utáni státuszt a [lezárási jelentés](CR-0001-implementacios-jelentes.md) külön rögzíti.

A frontend közös Astro layoutot, helyben csomagolt betűkészleteket, témarendszert és célzott TypeScript modulokat használ. A backend production konténere read-only; jelenleg csak a CA tanúsítvány van bemountolva. Az avatar ezért tartós, külön engedélyezett storage mountot és a runtime-validator célzott bővítését igényli.

A cél olyan regisztráció, amely a fotós saját adatait rögzíti, jóváhagyásra váró fiókot hoz létre, és jóváhagyás után a meglévő bejelentkezési folyamattal használható. Az ügyfelek továbbra is privát galérialinkkel férnek hozzá; a Client és a fotósprofil külön fogalom marad.

A fotós nem üzemeltetői admin. A jelenlegi, minden aktív hitelesített rekordnak ADMIN szerepet adó `AdminUserDetailsService` és az `/api/admin/**` útvonalvédelem ezért nem vihető át változatlanul. A közös session-, CSRF- és jelszóhash-mechanizmus megmaradhat, de a szerepköröket és az erőforrások tulajdonosi ellenőrzését át kell alakítani.

A platform közös backenddel és CockroachDB-adatbázissal, logikailag elkülönített fotósmunkaterületekkel indul. Fotósonként külön VM, adatbázis vagy új infrastruktúra nem szükséges. A különböző fotósok workflow-állapotai és adatai egymástól függetlenek; egyedi, fotósonként konfigurálható workflow-tervező nem része ennek a követelménynek.

## 2. Elfogadott követelménylánc

| Szint | Azonosító és tartalom |
| --- | --- |
| BR | A meglévő BR-FNC-0001, BR-FNC-0002 és BR-DAT-0001 kiegészítése több fotós elkülönített adat- és munkafolyamat-kezelésével |
| Epic | Epic 1 – Fotósfiókok, üzemeltetői jóváhagyás, saját ügyfél- és galériakezelés; a többi üzleti epic munkaterülethez kötése |
| US | US-0015 – Fotós regisztrációja, profilja és jóváhagyása |
| US | US-0016 – Regisztrációk kezelése egyetlen üzemeltetői adminisztrátorként |
| US | US-0017 – Fotósok adatainak és munkafolyamatainak elkülönítése |
| FR | FR-AUT-0002 – Fotós regisztrációja és hozzáférésének jóváhagyása |
| FR | FR-AUT-0003 – Egyetlen üzemeltetői admin és külön jóváhagyási felület |
| FR | FR-TEN-0001 – Fotósmunkaterületek backend- és storage-oldali elkülönítése |
| FR | FR-PRF-0001 – Fotós személyes és vállalkozási profiljának tárolása és saját lekérdezése |
| FR | FR-PRF-0002 – Fotós avatarjának biztonságos tárolása és megjelenítése |
| Meglévő FR | FR-AUT-0001 – szerepkörhöz igazodó bejelentkezés és hozzáférés; a fotós- és üzemeltetői jogosultság nem azonos |
| Meglévő üzleti FR | FR-DAT, FR-MED, FR-SHR, FR-WFL és FR-DWN – minden tulajdonosi művelet és kapcsolat az érintett fotósmunkaterületre korlátozott |
| NFR | NFR-SEC-0001, NFR-SEC-0002, NFR-PRV-0001, NFR-USB-0001, NFR-USB-0002, NFR-MNT-0002, NFR-DEP-0001 |
| TR | TR-SEC-0001, TR-DAT-0001, TR-DAT-0002, TR-STO-0001, TR-TCH-0002, TR-DEP-0001, TR-DEV-0003; új TR-TEN-0001 a tenant-kontekstushoz és konzisztens kapcsolatokhoz |
| TC | Új TC-REG-0001–0012, TC-ADM-0001–0007 és TC-TEN-0001–0007; meglévő TC-AUT, TC-SEC, TC-UI, TC-DB és TC-DEP regressziók |

A US-0014 az előző dokumentációban preview-generálási javaslatként szerepel, ezért a regisztráció nem veszi át ezt az azonosítót. A jelenlegi repositoryban a fenti új azonosítók nem foglaltak.

## 3. Regisztrációs mezők és validáció

A kötelező mezők körét az alábbi terv állapítja meg; a felhasználó eredeti kérése felsorolta a mezőket, de nem jelölte valamennyit kötelezőnek.

| Mező | Elfogadott szabály |
| --- | --- |
| Vezetéknév | Kötelező, 1–100 karakter; szóközök normalizálása, Unicode, ékezet és kötőjel támogatása |
| Utónév | Kötelező, 1–100 karakter; a vezetéknévvel azonos szemlélet |
| Megszólítás | Opcionális dropdown; üres, Id., Ifj., Özv., Dr., PhD., Prof., Dr. habil.; backend engedélylista |
| E-mail | Kötelező, legfeljebb 254 karakter, backend e-mail-validáció és normalizált egyediség |
| Jelszó | Kötelező, legalább 12 karakter, legfeljebb 72 UTF-8 bájt a jelenlegi BCrypt-alapú encoder mellett; nincs csendes levágás vagy whitespace-trimmelés; jelszókezelő és beillesztés használható |
| Jelszó megerősítése | Kötelező; frontend és backend összehasonlítja; nem tárolható |
| Telefonszám | Opcionális, legfeljebb 32 karakter; nem kizárólag magyar formátum; nem kell a mobil mellett kitölteni |
| Mobilszám | Opcionális, a telefonszámmal azonos szabály |
| Cím / lakhely | Opcionális strukturált cím: ország, irányítószám, település, cím első és opcionális második sora |
| Telephely | Opcionális, a lakhelytől külön címobjektum |
| Van vállalkozásom | Boolean, alapértelmezetten kikapcsolva |
| Vállalkozási forma | Bekapcsolt vállalkozási jelölőnél kötelező dropdown: Kft., Bt., Kkt., Zrt., Nyrt., egyéni vállalkozó, egyéb |
| Cég / vállalkozás neve | Bekapcsolt vállalkozási jelölőnél kötelező, legfeljebb 200 karakter |
| Adószám | Bekapcsolt vállalkozási jelölőnél kötelező, legfeljebb 32 karakter; nem numerikus típus, a vezető nulla és elválasztó megőrzendő |
| Cégjegyzékszám | Opcionális szöveg, legfeljebb 32 karakter; egyéni vállalkozásnál nem tehető általánosan kötelezővé |
| Vállalkozás címe | Bekapcsolt vállalkozási jelölőnél kötelező strukturált cím |
| Fotó / avatar | Opcionális JPEG vagy PNG; hiányában monogram vagy semleges kör alakú helyettesítő |

A címmezők korlátai: országkód 2 karakter, irányítószám legfeljebb 16, település legfeljebb 100, címsoronként legfeljebb 200 karakter. Megkezdett címnél ország, irányítószám, település és első címsor együtt szükséges. A címadat nem kötődik magyar lakcímformátumhoz.

Az adószám és cégjegyzékszám ellenőrzése ebben a ciklusban nem jelent hatósági hitelesítést vagy cégadatbázis-lekérdezést. A kötelezőség és a forma részletes szabálya a fenti egyszerű mezőszerződés; jogi megfelelőséget nem állítunk.

Kikapcsolt vállalkozási jelölőnél a vállalkozási mezők rejtettek és letiltottak. A backend a jelölővel ellentmondó, nem üres vállalkozási adatot elutasítja. Sikertelen beküldés után a nem titkos mezők megmaradnak az oldalon, a jelszómezők törlődnek. Regisztrációs személyes adat nem kerül localStorage-ba vagy URL-be.

## 4. Regisztráció, jóváhagyás és belépés

1. A főoldal fejlécében látható a Regisztráció és a Belépés gomb.
2. A `/register/` oldal szekciókba rendezve jeleníti meg a személyes, elérhetőségi, vállalkozási és avatarmezőket.
3. Beküldés előtt a frontend a meglévő CSRF-végpontról kér tokent. A szerver minden szabályt önállóan ellenőriz.
4. Sikeres mentés után az új fotósfiók `PENDING` és `active=false` állapotú, saját profilhoz és munkaterülethez rendelve. Nem keletkezik hitelesített session, és a munkaterület még nem használható.
5. A felület ezt írja ki: „A regisztráció rögzítve. A bejelentkezés jóváhagyás után válik elérhetővé.”
6. Az egyetlen üzemeltető a közös `/login/` oldalon belép, majd a `/admin/` felületen elfogadja vagy elutasítja a kérelmet. Az első belépéshez kötelező jelszócsere tartozik, amelynek befejezése előtt nincs jóváhagyási hozzáférés. A művelet CSRF-védett, nem ismételhető állapotváltozásként kétszer, és naplózza a fotósfiók, az üzemeltető és az eredmény azonosítóját.
7. Elfogadáskor a fiók `APPROVED` és aktív lesz. Elutasításkor `REJECTED` és inaktív marad.
8. A jóváhagyott fotós e-maillel és jelszóval belép, és a saját `/workspace/` munkaterületére kerül. Más fotós ügyfeleit, galériáit, médiáját, kiválasztásait és adatait nem láthatja és nem módosíthatja.
9. Bejelentkezés után a jobb felső sarokban kör alakú avatar, avatar nélkül helyettesítő jelenik meg.

Az új fotós nem küldhet be szerepkört, aktív állapotot, üzemeltetői azonosítót, tenantazonosítót vagy jóváhagyási jogosultságot. A saját kontextust a backend rendeli hozzá. A profil személyes adataihoz a saját fotósfiók, a regisztráció elbírálásához szükséges adatokhoz pedig az üzemeltető fér hozzá; az összes fotós számára nem készül nyilvános címtár.

Az üzemeltetői admin nem publikus fotósregisztrációval jön létre. Egyszeri, szerveroldali provisionáló művelet inicializálja az `admin` nevű üzemeltetőt, vagy read-only audit alapján ugyanennek a meglévő, fotósmunkaterülethez nem rendelt fióknak a bindingját állítja be. A felhasználó által meghatározott kezdeti jelszó rejtett interaktív bekérésből vagy jóváhagyott szerveroldali secretforrásból érkezik, és kizárólag hashként tárolódik. Nem kerül parancssori argumentumba, build-time konfigurációba vagy naplóba. A művelet második admin létrehozását elutasítja. Ismételt appindítás, migráció vagy deploy nem állítja vissza a kezdeti jelszót, és nem írja felül a megváltoztatott hash-t. Meglévő hitelesítési adat vagy eltérő üzemeltetői rekord felülírása nem automatikus: külön ellenőrzött helyreállítási műveletet igényel.

### 4.1. Szerepkörök és navigáció

| Szerep / állapot | Belépés és felület | Jogosultság |
| --- | --- | --- |
| Látogató | Főoldal, regisztráció és login | Nincs belső hozzáférés |
| Függő vagy elutasított fotós | A login nem hoz létre hitelesített munkamenetet | Nem érhet el workspace- vagy admin-adatot |
| PHOTOGRAPHER | `/workspace/` | Kizárólag saját profil, avatar és saját munkaterület üzleti adatai |
| ADMIN, első belépés és kötelező jelszócsere | Közös `/login/` után `/admin/`, kizárólag jelszócsere-nézettel | Csak saját jelszócsere, session-állapot és logout; regisztrációs lista/jóváhagyás még tiltott |
| ADMIN, jelszócsere után | Közös `/login/` után `/admin/` | Regisztrációk elbírálása, szükséges fiókmetaadatok és saját jelszó módosítása; nem automatikus hozzáférés a fotós galériáihoz vagy médiájához |
| Galéria ügyfele | Privát megosztási link | Csak a megosztás tenantjához és galériájához tartozó engedélyezett tartalom |

Egyetlen közös `/login/` kötelező. A backend `/api/auth/me` válasza dönti el a szerepkört, a kötelező jelszócsere állapotát és a megnyitható felületet. Fotós sikeres belépéskor `/workspace/`, üzemeltető `/admin/` célra kerül. Külön üzemeltetői loginoldal nem készül. A regisztrációs lista és elbírálás közvetlenül a `/admin/` oldalon található; külön `/admin/registrations/` frontend route nem szükséges. Az API regisztrációs útvonalai ettől változatlanok.

A frontend szerepkörfüggő átirányítása nem helyettesíti a backend védelmét. Fotósnak az üzemeltetői API 403, üzemeltetőnek a fotós üzleti API szintén 403; szerepkör nélküli belső kérés 401. Idegen fotós konkrét erőforrására a fotós API egységes 404 választ adhat, hogy annak létezését se árulja el.

### 4.2. Egyszer használható kezdeti adminjelszó és kötelező csere

1. Az inicializált `admin` fiók aktív és a singleton üzemeltetői bindinghoz tartozik, de `requires_password_change=true`. A jelszó az adott bootstrap-művelet bemenete, nem az alkalmazás beégetett defaultja. Az átmeneti bootstrap-secret kivétel a regisztrációs új jelszavak hosszszabálya alól; az új, tartós adminjelszónak már a normál szabályt kell teljesítenie.
2. A kezdeti jelszó az első sikeres `/api/auth/login` kérésnél atomikusan felhasználtnak jelölődik. Hibás próbálkozás nem fogyasztja el. Két párhuzamos helyes kérés közül legfeljebb egy kap jelszócserére használható sessiont; a többinek nem jön létre hitelesített állapota.
3. A létrejött session korlátozott, csak jelszócserét engedő állapotú. Az account szerepe ADMIN marad a me válaszban, de a backend nem ad teljes adminműveleti jogot. A `/admin/` oldalon az új jelszó és megerősítése jelenik meg. Regisztrációk lekérése, jóváhagyása és elutasítása a backendnél is tiltott, nem csak elrejtett gomb.
4. A módosítás a meglévő CSRF-mechanizmussal védett. Az új jelszó és megerősítés egyezzen, teljesítse a normál jelszószabályt, és ne egyezzen a jelenlegi jelszóval. Az új hash és a `requires_password_change=false` érték egy tranzakcióban tárolódik.
5. Sikeres csere után a korlátozott session érvénytelen, a cookie törlődik; a felület a közös `/login/` oldalra irányít. Az új jelszóval történő belépés már a teljes üzemeltetői `/admin/` felületet nyitja meg. A kezdeti jelszó ezután sem fogadható el.
6. Ha az első sikeres belépés után a böngésző/session elveszik vagy lejár, a már elhasznált kezdeti jelszó nem aktiválódik újra. Az üzemeltető csak explicit, szerveroldali helyreállítási művelettel állíthat be új ideiglenes secretet; ez nem történhet automatikusan reboot/deploy során. Az első belépés és a session létrehozása közötti technikai hiba is ezt a kontrollált helyreállítást igényelheti.
7. A `/admin/` felületen később is legyen saját jelszóváltoztatási lehetőség. Normál módosításnál a jelenlegi jelszót is ellenőrizni kell, az új jelszó megerősítése és CSRF kötelező. Módosítás után minden meglévő admin-session érvénytelenítendő, és új belépés szükséges.

A bootstrap-hitelesítés csak a kontrollált kezdeti beállításhoz használható. A nyilvános regisztráció engedélyezéséhez az üzemeltető kötelező jelszócseréjének befejezése is szükséges. A régi, korlátlan ADMIN szerepet adó backend ezt a korlátozott bootstrap-sessiont nem kezelheti, ezért a korábbi rollback-kompatibilitási gate itt is kötelező.

Az e-mail-tulajdon igazolása, automatikus jóváhagyási e-mail és elfelejtettjelszó-folyamat nem része ennek a ciklusnak. SMTP-szolgáltatás nem kerül bevezetésre. Az e-mail ezért ebben a körben bejelentkezési azonosító, nem igazolt e-mail-cím.

## 5. Adatmodell és migráció

Az admin_user elnevezés nem megfelelő valamennyi fotós és az egyetlen üzemeltető közös hitelesítési fogalmának. Az alkalmazási entity/repository/UserDetailsService ezért AppUser névre és közös account-felelősségre áll át. A fizikai `admin_user` tábla ebben a kiadásban kompatibilitási okból megmarad és bővül; az AppUser entity ezt a legacy táblanevet képezi le. Így nem történik a futó régi backend alól azonnali táblanév-eltávolítás. A fizikai átnevezés későbbi, külön expand/contract migráció lehet. A meglévő azonosítók és jelszóhash-ek, valamint a már kiadott V2 migráció megőrzendők.

A közös hitelesítési rekord új mezői:

- `approval_status`: PENDING, APPROVED vagy REJECTED;
- `approved_at`, `approved_by`: nullable jóváhagyási metaadatok.

Az üzemeltető kötelező jelszócsere-állapotát a singleton `system_admin` rekord tárolja: `requires_password_change`, `initial_password_used_at` és a jelszó/session-életciklust verziózó érték. Az egyszeri felhasználást feltételes, tranzakciós állapotváltás biztosítja. A normál fotósfiók nem kap bootstrap-jogosultságot. A felhasznált ideiglenes secret értékét vagy másolatát egyik mező sem tárolja.

Meglévő fiókoknál az aktív állapot és a hitelesítési adatok megőrzendők. A migráció nem hoz létre default admint, nem ad minden régi rekordnak üzemeltetői szerepet, és nem talál ki üzletiadat-tulajdonost. A szerep- és munkaterület-hozzárendelést a régi rekordok read-only auditja után explicit migrációs/provisionálási szabály határozza meg. Hozzárendelés nélküli rekord nem kaphat korlátlan hozzáférést.

Új táblák:

- `system_admin`: egyetlen, rögzített kulcsú rekord (`id=1`), egyedi `user_id` hivatkozással az AppUser által leképezett hitelesítési táblára. CHECK + primary key biztosítja, hogy legfeljebb egy üzemeltető létezhessen. A publikus API ehhez a táblához nem írhat. Az éles regisztráció/jóváhagyás bekapcsolása előtt pontosan egy aktív üzemeltetői binding kötelező;
- `photographer_workspace`: UUID azonosító, egyedi tulajdonosi `photographer_user_id` és létrehozási metaadatok; az első körben egy fotósnak egy saját munkaterülete van, közös csapattagság nincs;
- `photographer_profile`: egy-egy kapcsolat az AppUser által leképezett fotósrekorddal; név, megszólítás, telefonok, lakhely, telephely és relatív avatarútvonal;
- `photographer_business`: legfeljebb egy vállalkozási adatlap a profilhoz; forma, név, adószám, cégjegyzékszám és cím.

A PHOTOGRAPHER szerep aktív, jóváhagyott, saját workspace-hez rendelt fiókból, az ADMIN szerep az egyetlen system_admin bindingból származik. Ugyanaz a fiók ebben a tervben nem tölti be egyszerre a két szerepet. A kizáró kapcsolatot a provisionáló/registration service és tranzakciós teszt is ellenőrzi. A tervezett `can_approve_users` flag megszűnik: nem lesz több, fotósból kijelölhető jóváhagyó.

Az aktív fotós önálló workflow-adatainak kapcsolata:

```text
AppUser (PHOTOGRAPHER) 1 ── 1 PhotographerWorkspace
PhotographerWorkspace 1 ── * Client
PhotographerWorkspace 1 ── * Gallery ── * MediaAsset
Gallery ── * GalleryShare / ClientSelection
ClientSelection ── * SelectionItem
SystemAdmin (egyetlen binding) ── AppUser (ADMIN)
```

Ez az új account-, üzemeltető-, workspace- és profilmodell mellett a későbbi üzleti entitások kötelező tervezési szerződése, nem állítás arról, hogy az ügyfél-, galéria- vagy médiatáblák már megvalósultak.

A publikus űrlap nem kér új felhasználónevet. Az új fiókhoz belső, egyedi, legfeljebb 64 karakteres technikai username készül; a felhasználó e-maillel lép be. Így a meglévő username oszlopot nem kell a 254 karakteres e-maillel felülírni. A felület a fotós nevét jeleníti meg, nem a technikai username-et. A meglévő felhasználónév-alapú belépés működése megmarad.

A jelszó a meglévő PasswordEncoderrel készülő verziójelölt hashként kerül az adatbázisba. Jelszó és megerősítés nem profilmező. Az e-mail-egyediséget adatbázis-constraint is védi, így párhuzamos kérés sem hozhat létre dupla fiókot.

A BCrypt hosszkorlátja bájtban értendő, ezért ékezetes vagy más többbájtos karakterekkel is külön validáció és teszt szükséges. A korlátot a [Spring Security hivatalos BCrypt implementációja](https://github.com/spring-projects/spring-security/blob/main/crypto/src/main/java/org/springframework/security/crypto/bcrypt/BCrypt.java) rögzíti; a projektben ténylegesen feloldott dependency-verzióval is ellenőrizni kell. A verziójelölt hash-kezelés alapja a [Spring Security 6.5 jelszótárolási dokumentációja](https://docs.spring.io/spring-security/reference/6.5/features/authentication/password-storage.html).

A következő szabad Flyway-verziót az implementáció kezdetén kell ellenőrizni; a jelenlegi V1/V2 után ez várhatóan V3. Már kiadott migráció nem módosítható.

### 5.1. Tenant-határok és konzisztencia

- Minden fotóshoz kötött üzleti entitás `workspace_id` tulajdonosi kontextust kap. A workspace azonosítóját a backend a hitelesített fiókból határozza meg; a kérés mezője, URL-paramétere vagy tetszőleges HTTP-fejléce nem választhat másik fotóst.
- Repository-lekérdezés mindig a workspace és az erőforrás azonosítójára szűr. Globális `findById` utáni frontend-szűrés nem elfogadható. Az egyszerű szerepkörellenőrzés önmagában nem véd másik fotós azonosítójának használatától.
- Létrehozásnál a backend állítja a workspace-értéket; listázás, keresés, darabszám, státuszlekérdezés, export és módosítás is tenant-szűrt. A cache-kulcs és későbbi háttérfeldolgozási feladat tenantot tartalmaz.
- A galéria ügyfelének, a média galériájának és a kiválasztási elem médiájának azonos munkaterülethez kell tartoznia. Ezt kompozit idegen kulcsok vagy azzal egyenértékű adatbázis-constraint, valamint service-validáció védi.
- A külön fotósok egymástól független ügyfélrekordjai nem olvadnak össze azonos név vagy ügyfél-e-mail miatt. A belépési e-mail a közös account-táblában továbbra is egyedi. Az ügyfél-e-mail munkaterületen belüli egyediségének korábbi nyitott üzleti döntését ez a terv nem zárja le.
- Privát galérialinknél a tokenhez tárolt workspace/galéria határozza meg a hozzáférést. Visszavonás, kiválasztás, letöltés és médiaelemenkénti engedély ugyanebben a kontextusban ellenőrzendő.
- A regisztrációs státusz és az aktív állapot jóváhagyáskor tranzakcióban változik. A workspace csak jóváhagyott és aktív tulajdonossal használható. A jóváhagyó nem változtathatja meg egy kérelem tulajdonosát.
- Meglévő üzleti adatok esetén a tulajdonosi visszatöltés explicit döntést igényel; nem rendelhető minden rekord hallgatólagosan egyetlen fotóshoz. A jelenlegi V1/V2 csak technikai alapot és hitelesítési táblát definiál, ezt a deployment előtti auditnak is meg kell erősítenie.
- A read-only sessionben tárolt szerep sem adhat jogosultságot egy közben inaktivált vagy jóváhagyását elvesztett fióknak. A védett kérések aktuális fiókállapot-ellenőrzést igényelnek.

### 5.2. Kiadási kompatibilitás és rollback

A fizikai táblanév megőrzése nem teszi a korábbi backendet biztonságosan többfotós-kompatibilissé. A régi UserDetailsService minden aktív felhasználónak ADMIN szerepet ad; ezért új fotósfiókok elfogadása után automatikusan nem indítható vissza ilyen legacy release.

A többfotós kiadás regisztrációs funkciója alapértelmezetten kikapcsolt. Az engedélyezéshez a sikeres migráció, pontosan egy üzemeltetői binding, befejezett kötelező adminjelszó-csere, tenant-kompatibilis backend és az izolációs tesztek teljesülése szükséges. A rollout alatt a régi backend nem szolgálhat ki új fotósadatokat; a szerepváltás a sessionök kontrollált érvénytelenítésével és szükség esetén rövid karbantartási ablakkal történik.

A deployment script rollback-alkalmassági ellenőrzést kap. Többfotós adatállapot mellett kizárólag igazoltan tenant- és szerepkör-kompatibilis korábbi release indítható automatikusan. A jelenlegi legacy release ilyen bizonyíték nélkül nem elfogadható fallback. Tiltott fallback esetén biztonságos, a fotós üzleti adatokat nem kiszolgáló állapot és kézi helyreállítási jelzés szükséges; health=UP önmagában nem bizonyít jogosultsági kompatibilitást. Adatbázis-visszaállítás nem automatikus kompenzáció. E korlátozás a szerveroldali deployment script külön operatív gate-jéhez tartozik.

## 6. Avatar és tartós storage

- Beérkező állomány legfeljebb 2 MiB, csak valóban dekódolható JPEG vagy PNG.
- A fájlkiterjesztés és a kliens MIME-értéke nem elegendő bizonyíték.
- Legfeljebb 4096 pixel oldalhossz és összesen 4 megapixel a dekódolás előtti méretellenőrzésnél.
- SVG, animált formátum és más tartalom elutasítandó.
- A backend 256 × 256 pixeles, középre vágott PNG avatart állít elő; az eredeti képet nem őrzi meg, a kimenet nem tartalmaz eredeti metaadatokat.
- Szerver által képzett UUID-alapú név és relatív útvonal: `tenants/<workspace-uuid>/avatars/<account-uuid>/<image-uuid>.png`.
- A böngésző nem adhat szerveroldali célútvonalat vagy fájlnevet.
- A fájl NFS-alapú tartós storage-ra kerül storage absztrakción keresztül; nem SQL BLOB, konténer-image vagy elvesző tmpfs lesz a tároló.
- A hostoldali mount pontos helyét read-only storage auditban kell rögzíteni; ez a terv nem állítja, hogy az avatartároló már létezik.
- A backend csak a kijelölt avatar storage-gyökérhez kap írható mountot; azon belül külön tenant-alkönyvtárak és kanonikus útvonalellenőrzés szükséges. A read-only root filesystem és a többi security-beállítás megmarad. A tenant-alkönyvtár önmagában nem jogosultságvédelem: minden fájlkérésnél backend tulajdonosi ellenőrzés kell.
- Az avatar saját, hitelesített backend-végponton keresztül érhető el, nem publikus könyvtárból. A jóváhagyó a függő kérelmek avatarját is jogosultságellenőrzés mellett láthatja.

A regisztráció üzleti értelemben csak akkor sikeres, ha az opcionálisan kiválasztott avatar is tárolható. Fájlrendszer és adatbázis között nincs közös ACID-tranzakció: ideiglenes staging, DB-tranzakció és célzott kompenzáló takarítás szükséges. Storage-hiba esetén nem maradhat sikeresen regisztrált félkész profil; DB-hiba esetén csak az adott kérés új fájlja takarítható. Összeomlásból visszamaradt staging fájl felismerhető, és külön, dokumentált karbantartással rendezhető. Az előző avatar vagy más fiók fájlja nem törölhető.

## 7. API és komponensszerződés

| Végpont | Funkció és hozzáférés |
| --- | --- |
| POST /api/auth/register | Regisztráció, CSRF-védelemmel; multipart JSON adat + opcionális avatar; siker: 201, PENDING állapot, session nélkül |
| POST /api/auth/change-password | Csak az egyetlen üzemeltető; bootstrapkor korlátozott session + új jelszó/megerősítés, később normál admin-session + jelenlegi jelszó + új jelszó/megerősítés; CSRF kötelező; siker: 204 és session/cookie érvénytelenítés |
| GET /api/photographer/profile | Saját fotósprofil; PHOTOGRAPHER szerep és a sessionből levezetett saját workspace |
| GET /api/photographer/profile/avatar | Saját avatar, megfelelő Content-Type és nosniff; PHOTOGRAPHER szerep és tenantellenőrzés |
| GET /api/admin/registrations | Függő kérelmek; kizárólag jóváhagyó |
| GET /api/admin/registrations/{id}/avatar | Függő kérelem avatarja; kizárólag jóváhagyó |
| POST /api/admin/registrations/{id}/approve | Jóváhagyás; kizárólag az egyetlen ADMIN + CSRF |
| POST /api/admin/registrations/{id}/reject | Elutasítás; kizárólag az egyetlen ADMIN + CSRF |

Az `/api/auth/me` válasz minimális, a frontenddel együtt verziózott kiegészítést kap: szerep, megjelenítési név, `requiresPasswordChange` állapot, fotós esetén saját workspace-azonosító és saját avatar végpontja. Nem ad vissza lakcímet, adószámot, jelszóhash-t vagy storage-útvonalat. A kliensnek visszaadott workspace-azonosító nem felhatalmazás: az író/olvasó API továbbra is a backend-kontekstusból dolgozik. Az ADMIN szerepet az egyetlen üzemeltetői bindingból, a teljes vagy korlátozott műveleti hozzáférést a backend session- és jelszócsere-állapotából kell ellenőrizni; menüelrejtés önmagában nem jogosultságvédelem.

A fotós üzleti végpontjai a tervben `/api/photographer/**` alá kerülnek, saját frontendjük `/workspace/**`. A régi FR-DAT/MED/SHR/WFL/DWN dokumentumok `/api/admin/**` példáit jóváhagyás után célzottan át kell vezetni. Az `/api/admin/**` kizárólag az üzemeltető területe marad. A publikus `/api/public/**` share-token hozzáférés megőrzi a galéria- és workspace-határt.

Backend felelősségek: AppUser/UserDetailsService, WorkspaceContext és tenant-szűrt repository-k, RegistrationController/DTO, RegistrationService, PhotographerWorkspace/Profile/Business entity és repository, SystemAdmin binding és provisionáló, bootstrap/session-állapotgép, PasswordChangeService és session-visszavonás, AvatarStorageService, képvalidáló/feldolgozó, ApprovalService. Controllerben nem lehet közvetlen fájlrendszerírás. A login/logout és CSRF alapmechanizmus megőrzendő; a jelenlegi hardcoded ADMIN szerep kiosztása megszűnik.

Frontend: `register.astro`, regisztrációs űrlapkomponens, központosított regisztrációs API-modul, célzott TypeScript űrlapvezérlő, megosztott account/avatar fejléc, `/workspace/` fotóskezdőlap és `/admin/` üzemeltetői nézet. A `/admin/` kötelező jelszócserekor kizárólag a csereűrlapot, normál admin-sessionnel a regisztrációs listát/elbírálást és a saját jelszóváltoztatást mutatja. A közös `/login/` a backend szerep- és állapotválasza alapján navigál. A már meglévő Button/Input/feedback komponensek és design tokenek felhasználandók. Új dropdown és checkbox komponens csak akkor készül, ha nincs megfelelő meglévő elem.

## 8. Biztonság, UI és hibák

Megmarad a same-origin session, HttpOnly/SameSite cookie, production Secure cookie és a módosító kérések CSRF-védelme. Új regisztráció és jóváhagyás nem hozhat létre kliens által megadott jogosultságot.

A rendszerprogram szintjén az ADMIN szerep nem univerzális fotósadat-hozzáférési felmentés. A regisztrációk megtekintése/elbírálása engedélyezett; a fotós galériájának vagy médiájának üzemeltetői megnyitása külön jóváhagyott support-funkció nélkül tiltott. Az üzemeltető host-/adatbázis-adminisztrátori infrastruktúra-jogosultságait ez az alkalmazásszintű korlátozás nem szünteti meg.

A regisztrációhoz kérésméret-, mezőhossz- és korlátozott próbálkozásszám tartozik. Kiinduló javaslat: 5 regisztrációs kísérlet / 10 perc / ellenőrzött klienscím, 429 válasszal. A limiter a meglévő egy backendpéldányra épülhet, nem igényel Redis infrastruktúrát. Forwarded fejléc csak ellenőrzött proxyból fogadható el; a közös gateway címére alapozott korlátozás nem blokkolhatja az összes felhasználót egyként. A pontos proxy-szerződés megvalósítás előtt ellenőrzendő.

Formátumhibák mezőhöz rendelt, érthető visszajelzést kapnak. Duplikált vagy már foglalt e-mail esetén a publikus válasz nem részletezi a meglévő fiók állapotát. Avatarhiba esetén az űrlap nem állít sikeres regisztrációt. Jelszó, megerősítés, teljes profil, hash és képtartalom nem kerül naplóba.

A frontend megőrzi a jelenlegi BTPhoto vizuális rendszert és a most javított login-megjelenést. A hosszú regisztrációs form szekciókra bontott, mobilon egyoszlopos; jól látható kötelező mezőkkel, billentyűzettel kezelhető dropdownnal, checkboxszal és hibaösszegzéssel. A megszólítás alapértéke üres. Az avatar előnézete lokális, object URL-lel; a megszüntetett előnézet erőforrása felszabadítandó. A jobb felső avatar kör alakú, alt szöveggel vagy dekoratív monogrammal, és nem takarja a kijelentkezési műveletet.

## 9. Elfogadási kritériumok és bizonyítékok

| AC | Given / When / Then tartalom | Tervezett TC |
| --- | --- | --- |
| AC-FR-AUT-0002-01 | Érvényes fotósadatok beküldésekor egyetlen PENDING, inaktív fiók, profil és saját workspace jön létre; nincs session | TC-REG-0001 |
| AC-FR-AUT-0002-02 | Hibás e-mail, hiányzó kötelező adat, eltérő jelszó vagy párhuzamos duplikált e-mail esetén nincs új sikeres fiók | TC-REG-0002, TC-REG-0003 |
| AC-FR-AUT-0002-03 | Függő vagy elutasított fiók bejelentkezése nem hoz létre hitelesített sessiont | TC-REG-0004 |
| AC-FR-AUT-0002-04 | Az üzemeltető elfogadja a kérelmet, és a fotós PHOTOGRAPHER szereppel saját workspace-re léphet be | TC-REG-0005 |
| AC-FR-AUT-0002-05 | Fotós által, saját aktiválási kéréssel, hamisított ADMIN szereppel vagy CSRF nélkül a jóváhagyás megtagadott | TC-REG-0006 |
| AC-FR-PRF-0001-01 | Vállalkozási checkbox bekapcsolásakor a cégmezők megjelennek és a backend a feltételes szabályokat ellenőrzi | TC-REG-0007 |
| AC-FR-PRF-0001-02 | Saját profil lekérhető, más fotós személyes profilja normál fotósként nem; hash és teljes cím nem kerül a me válaszba | TC-REG-0008 |
| AC-FR-PRF-0002-01 | Érvényes avatar tárolódik, belépés után a fejlécben kör alakúan megjelenik; avatar nélkül helyettesítő látható | TC-REG-0009 |
| AC-FR-PRF-0002-02 | Tiltott, sérült, túl nagy vagy útvonalmanipuláló avatar elutasított; storage/DB-hibánál nincs sikeres félkész regisztráció | TC-REG-0010 |
| AC-FR-AUT-0002-06 | A főoldalról Regisztráció és Belépés elérhető; 390/768/1280 px nézet, világos/sötét téma és billentyűzetes működés ellenőrzött | TC-REG-0011 |
| AC-FR-PRF-0002-03 | Új konténer vagy backend-újraindítás után a tartós avatar megmarad; mount és runtime security contract teljesül | TC-REG-0012 |
| AC-FR-AUT-0003-01 | Szerveroldali provisionálás után pontosan egy ADMIN létezik; párhuzamos második létrehozás DB-szinten is sikertelen | TC-ADM-0001 |
| AC-FR-AUT-0003-02 | ADMIN a speciális regisztrációs felületen elbírálhat; PHOTOGRAPHER nem fér hozzá | TC-ADM-0002 |
| AC-FR-AUT-0003-03 | ADMIN nem kap automatikus hozzáférést fotós galériához vagy médiához | TC-ADM-0003 |
| AC-FR-AUT-0003-04 | Közös login után ADMIN a /admin/, PHOTOGRAPHER a /workspace/ felületre kerül; külön admin-login nincs | TC-ADM-0004 |
| AC-FR-AUT-0003-05 | Az admin kezdeti jelszava csak egyszeri, korlátozott sessiont ad; párhuzamos újrafelhasználás és jelszócsere előtti jóváhagyás sikertelen | TC-ADM-0005 |
| AC-FR-AUT-0003-06 | Kötelező jelszócsere után a régi secret nem működik, az új jelszó teljes admin-hozzáférést ad; reboot/deploy nem inicializálja újra | TC-ADM-0006 |
| AC-FR-AUT-0003-07 | Normál adminjelszó-csere jelenlegi jelszót és CSRF-t igényel; csere után minden korábbi admin-session érvénytelen | TC-ADM-0007 |
| AC-FR-TEN-0001-01 | Két aktív fotós profilja, avatarja és workspace-lekérdezése egymástól elkülönített | TC-TEN-0001 |
| AC-FR-TEN-0001-02 | Idegen resource-ID vagy hamis workspace mező/fejléc nem enged olvasást vagy írást; nincs idegen adat a válaszban | TC-TEN-0002 |
| AC-FR-TEN-0001-03 | Ügyfél/galéria/média/selection workspace-eltérő kapcsolata DB- és service-szinten elutasított | TC-TEN-0003 |
| AC-FR-TEN-0001-04 | Share-token, letöltés és workflow-státusz csak a tokenhez/actorhoz tartozó workspace-ben érvényes | TC-TEN-0004 |
| AC-FR-TEN-0001-05 | Tenantválasztó útvonalmanipuláció vagy más tenant fájlja nem ad ki idegen képet | TC-TEN-0005 |
| AC-FR-TEN-0001-06 | Lista, keresés és darabszám kétfotós fixture-ben csak a saját tenant adataiból áll | TC-TEN-0006 |
| AC-FR-TEN-0001-07 | Többfotós adatállapot mellett a rollback elutasítja a legacy, minden aktív fióknak ADMIN szerepet adó backendet | TC-TEN-0007 |

A jelszó a hash-előállítóval ellenőrizhető, de sima jelszóként vagy jelszómegerősítésként nem tárolódik. A regisztrációs limiter 429 válasza és a klienscím-hamisítás elleni proxy-szerződés külön security tesztet kap.

Verifikáció: backend Maven clean verify; frontend Astro check, lint, Vitest, production build; valódi CockroachDB migrációs/repository tesztek a GitHub-hosted fixture-ben; negatív authorization/CSRF tesztek; kétfotós tenant-fixture; singleton-admin párhuzamos létrehozási teszt; egyszeri bootstrap-belépés konkurens tesztje, elveszett session és kötelező jelszócsere megkerülésének negatív próbája; jelszócsere utáni régi session-visszavonás; storage-fixture pozitív/negatív tesztek; Compose-validáció és szigorú runtime mount-engedélylista; böngészős admin első login → kötelező jelszócsere → új login → regisztráció → üzemeltetői jóváhagyás → szerepkörhelyes fotós login → saját workspace/avatar → logout elfogadási próba. A helyben hiányzó Docker-futást nem lehet sikeres integrációs tesztként jelenteni.

A TC-TEN-0003/0004 és az ügyfél-, galéria-, média- és selection-listák teljes bizonyítéka a megfelelő üzleti modulok implementációjához tartozik. Ezeket a regisztrációs ciklus nem jelenti teljesítettnek üres adatmodell vagy csak mock alapján. A regisztrációs ciklus viszont két valódi account/workspace/profile rekorddal és elkülönített avatar-fixture-rel köteles igazolni az aktuálisan elkészült tenant-határokat; a következő feature nem készülhet globális, tulajdonos nélküli modellre.

## 10. Megvalósítási lépések és módosítási határ

1. Jóváhagyás után a 01–09 dokumentumok célzott szakaszainak és táblázatainak aktualizálása: BR/US/FR/AC, NFR/TR, TC, traceability, UI és adatmodell. Új baseline csak a jóváhagyott követelményállapotról készül. A v0.1–v0.3 fájlok történeti állapota nem írható felül.
2. Következő szabad Flyway-migráció, közös AppUser account-modell a fizikai legacy tábla megőrzésével, singleton SystemAdmin binding, fotósmunkaterület és fiókállapotok; régi rekordok célzott szerep-hozzárendelési auditja.
3. Szerepkörök, tenant-kontekstus és kétfotós negatív authorization/repository tesztek; az egyetlen admin nevű üzemeltető provisionáló parancsa, egyszeri kezdeti belépési állapota, kötelező és későbbi jelszócsere, session-visszavonás.
4. Regisztrációs service/API, adat- és jelszóvalidáció, kizárólag ADMIN által végezhető jóváhagyás; az új állapotok nem lazíthatják a meglévő session-védelmet.
5. Avatar storage absztrakció, tenantprefix, validáció/feldolgozás és hibakompenzáció; a pontos tartós mount read-only auditja.
6. Astro register form, főoldali gombok, közös /login/, /admin/ jóváhagyási és jelszócsere-nézet, fotós workspace, szerepkörhelyes navigáció és felső avatar; a login-vizuális javítások megőrzése.
7. Image/Compose/env példa és PR contract/runtime fixture-ek célzott bővítése az új avatar-mounttal és a regisztráció bekapcsolási kapujával. A szerveroldali deployment script mount- és rollback-kompatibilitási változtatása külön operatív gate, a tényleges útvonal és release ismeretében.
8. Quality gate, PR containeres ellenőrzések, review és kézi, egy ADMIN + két PHOTOGRAPHER szereplős böngészős elfogadás. Commit/push/merge/deployment külön engedély szerint; a terv jóváhagyása önmagában nem engedély production adat- vagy infrastruktúra-módosítást.

Várható kódscope: backend account/admin/auth/workspace/profile/storage/security és tesztek; új SQL-migráció; frontend regisztráció, szerepkörnavigáció, account-fejléc, jóváhagyási nézet, fotós workspace, auth API és tesztek; deploy Compose/env/README; production-image-build workflow és dokumentáció. A végleges fájllistát az implementáció elején kell rögzíteni; nem kap felhatalmazást az egész repository átírására.

Új framework, SMTP, Redis, objektumtároló vagy nyilvános ügyfélregisztráció nem szükséges a tervhez. A képfeldolgozás elsőként a JDK ImageIO lehetőségeire épül; a konténerben való elérhetőségét ellenőrizni kell. Külön dependency csak igazolt szükség és külön jóváhagyás után vezethető be.

Az üzleti ügyfél/galéria/média funkciók tényleges implementációja, a nyilvános domain publikálása és az automatikus CD nem része ennek a regisztrációs ciklusnak. A későbbi üzleti funkciók tervének tenant-szerződése viszont már most kötelezően módosul. Az avatar storage és a deployment-validator módosítása szükséges függőség; az avatart nem lehet elvesző konténerkönyvtárban „elkészültnek” minősíteni.

## 11. Jóváhagyás és lezárási feltétel

A 2026-10-15-i felhasználói visszajelzéshez tartozó [UI-01 kiegészítés](CR-0001-UI-01-regisztracios-javitasok.md) egyszerűsíti a feliratokat, pontosítja a tartós mezőhibát és a regisztráció animációját, valamint jóváhagyott Google reCAPTCHA v2 védelmet ad. Új kritériuma AC-FR-AUT-0002-07 / TC-REG-0013; a korábbi 25 kritériummal együtt 26 AC érvényes. A kulcspár még hiányzik, valódi Google-végponti elfogadás nem történt.

Az account-scope döntését a felhasználó módosította: több fotós külön munkaterülettel és munkafolyamattal, egyetlen üzemeltetői ADMIN által jóváhagyott regisztrációval. A korábbi közös-workspace feltételezés már nem érvényes.

A felhasználó a teljes módosított tervet jóváhagyta, és 2026-10-14-én kérte az implementáció elindítását. A mezők, singleton üzemeltető, egyszeri bootstrap, tenant-határok és avatar-storage követelmények elfogadottak. A repository-oldali megvalósítás és a kiadási/éles elfogadás külön státusz; production módosítást a terv jóváhagyása nem engedélyez. A bizonyítékokat és nyitott AC-kat a CR-0001-implementacios-jelentes.md tartalmazza.

A regisztrációs fejlesztés csak egy ADMIN és két külön PHOTOGRAPHER fiókkal bizonyított admin-bootstrap + egyszeri kezdeti login + kötelező jelszócsere + regisztráció + jóváhagyás + szerepkörhelyes login + tenant- és avatar-elkülönítés + logout mellett zárható le. A teljes többfotós üzleti platform csak a későbbi ügyfél/galéria/média/proofing modulok tenanttesztjeivel kész. A tervezési dokumentum elkészítése nem jelent teljesített funkcionális AC-t.
