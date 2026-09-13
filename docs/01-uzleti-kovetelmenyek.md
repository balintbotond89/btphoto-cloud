# Üzleti követelmények

**Dokumentum státusza:** fejlesztési baseline v0.1  
**Projekt:** BTPhoto Private Cloud  
**Baseline azonosító:** `BTPC-BL-2026-09-13-v0.1`  
**Baseline dátuma:** `2026-09-13`

A dokumentum a BTPhoto Private Cloud fotós privát felhő üzleti céljait, problémáit és követelményeit foglalja össze, és szolgál alapul a további tervezési dokumentumokhoz.

A projekt célja nem egy általános célú fájlmegosztó rendszer létrehozása, hanem egy saját infrastruktúrán futó, fotós munkafolyamatokra optimalizált szolgáltatás kialakítása. A rendszerben a fotós az ügyfelekhez tartozó galériákat, médiaállományokat, privát megosztásokat, ügyfélkiválasztásokat és később automatizált feldolgozási lépéseket egységes folyamatban kezelheti.

---

## BR összefoglaló

- BR-FNC-0001 – Ügyfél- és galériakezelés biztosítása (RICE: 14,3)
- BR-FNC-0002 – Privát ügyfélgaléria és megosztás biztosítása (RICE: 11,4)
- BR-PRC-0001 – Médiafeltöltési és client proofing folyamat támogatása (RICE: 8,9)
- BR-PRC-0002 – Ügyfélkiválasztás és digitális átadás támogatása (RICE: 8,1)
- BR-DAT-0001 – Követhető média- és metaadatmodell kialakítása (RICE: 5,4)
- BR-OPS-0001 – Saját infrastruktúrán üzemeltethető, menthető szolgáltatás kialakítása (RICE: 3,4)
- BR-FNC-0003 – Fotós-specifikus automatizálhatóság megalapozása (RICE: 1,9)

> A RICE pontszámok a jelenlegi tervezési fázis becslései. Feladatuk a backlog relatív sorrendjének támogatása; implementáció közben felülvizsgálhatók.

---

## BR-FNC-0001 – Ügyfél- és galériakezelés biztosítása

- BR azonosító: `BR-FNC-0001`
- BR neve: Ügyfél- és galériakezelés biztosítása
- Kategória: `BR-FNC-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Üzleti érték: 95
- RICE: `(R=25 x I=3 x C=95%) / E=5 = 14,3`
- Üzleti probléma: A fotós ügyfélanyagai csak akkor kezelhetők egységesen, ha az ügyfél, a fotózás/projekt és a hozzá tartozó galéria strukturáltan összekapcsolható.
- Üzleti indoklás: Az ügyfél- és galériamodell a teljes alkalmazás alapja; erre épül a médiafeltöltés, a privát megosztás, a proofing és a letöltés.
- Jelenlegi helyzet (As-Is):
  - a működő infrastruktúra rendelkezésre áll
  - az alkalmazási ügyfél- és galériakezelés még nincs implementálva
- Cél állapot (To-Be):
  - a fotós ügyfeleket tud létrehozni és kezelni
  - egy ügyfélhez egy vagy több galéria kapcsolható
  - a galéria rendelkezik egyedi azonosítóval és életciklus-állapottal
- Várható üzleti előnyök:
  - egységes ügyfélanyag-kezelés
  - áttekinthető fotós munkafolyamat
  - stabil alap a további funkciókhoz
- Érintettek:
  - fotós/admin
  - ügyfél
  - fejlesztő
- Mérhetőség:
  - legalább egy ügyfél létrehozható
  - egy ügyfélhez legalább egy galéria létrehozható
  - a létrehozott galéria visszakereshető és listázható
- Kapcsolódó kockázat (ha nem teljesül):
  - a médiaállományok nem kapcsolhatók egyértelmű üzleti kontextushoz
  - a proofing folyamat nem építhető fel
- Sikerességi kritériumok:
  - ügyfél és galéria létrehozási folyamat működik
  - a galéria egyértelműen egy ügyfélhez kapcsolható
- Sikertelenségi kritériumok:
  - árva galéria vagy értelmezhetetlen ügyfélkapcsolat keletkezik
  - a galériák nem listázhatók vissza
- Kockázatok:
  - túl részletes ügyfélmodell már az MVP-ben (valószínűség: közepes, hatás: közepes)
- Korlátozás:
  - az MVP nem teljes CRM-rendszer
- Függőségek:
  - relációs adatmodell
  - admin hitelesítés
- Technikai megjegyzések:
  - az ügyfél- és galériaadatok CockroachDB-ben kerülnek tárolásra

---

## BR-FNC-0002 – Privát ügyfélgaléria és megosztás biztosítása

- BR azonosító: `BR-FNC-0002`
- BR neve: Privát ügyfélgaléria és megosztás biztosítása
- Kategória: `BR-FNC-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Üzleti érték: 95
- RICE: `(R=20 x I=3 x C=95%) / E=5 = 11,4`
- Üzleti probléma: A fotósnak olyan ügyféloldali hozzáférésre van szüksége, amely nem teszi publikussá a teljes médiaállományt és nem igényli a belső admin felület megosztását.
- Üzleti indoklás: A privát galéria a fotós szolgáltatás ügyféloldali megjelenése, ezért egyszerre kell egyszerűnek, esztétikusnak és kontrolláltnak lennie.
- Jelenlegi helyzet (As-Is): nem implementált
- Cél állapot (To-Be):
  - egy galériához privát hozzáférés generálható
  - az ügyfél a kapott linken keresztül csak a hozzá tartozó galériát éri el
  - a hozzáférés a fotós által visszavonható
- Várható üzleti előnyök:
  - professzionális ügyfélélmény
  - kontrollált tartalommegosztás
  - külső általános fájlmegosztó használatának csökkentése
- Érintettek:
  - fotós/admin
  - ügyfél
- Mérhetőség:
  - egy galériához működő megosztási hozzáférés létrehozható
  - más galéria az URL egyszerű módosításával nem érhető el
  - visszavont hozzáférés nem használható tovább
- Kapcsolódó kockázat (ha nem teljesül):
  - jogosulatlan ügyfélanyag-hozzáférés
  - a rendszer nem használható valódi ügyfélátadásra
- Sikerességi kritériumok:
  - privát link létrehozása, megnyitása és visszavonása működik
- Sikertelenségi kritériumok:
  - galéria publikus listából vagy könnyen kitalálható URL-lel elérhető
  - visszavont token továbbra is működik
- Kockázatok:
  - gyenge vagy kiszámítható tokenkezelés (valószínűség: alacsony, hatás: magas)
- Korlátozás:
  - az MVP-ben az ügyfélnek nem kötelező külön felhasználói fiók
- Függőségek:
  - galériakezelés
  - alkalmazásbiztonság
- Technikai megjegyzések:
  - a publikus szolgáltatási belépési pont reverse proxy mögött működik

---

## BR-PRC-0001 – Médiafeltöltési és client proofing folyamat támogatása

- BR azonosító: `BR-PRC-0001`
- BR neve: Médiafeltöltési és client proofing folyamat támogatása
- Kategória: `BR-PRC-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Üzleti érték: 100
- RICE: `(R=25 x I=3 x C=95%) / E=8 = 8,9`
- Üzleti probléma: A fotós munkafolyamat akkor nyújt valódi értéket, ha a galéria nem csupán adatbázisrekord, hanem valós médiaállományokat képes kezelni és ügyféloldalon megjeleníteni.
- Üzleti indoklás: A saját storage-ra történő feltöltés és a galéria megjelenítése igazolja a projekt központi koncepcióját: az alkalmazás, az adatbázis és a fájltárolás együtt működik.
- Jelenlegi helyzet (As-Is):
  - a MicroServer NFSv4 `media` megosztása működik
  - Debian VM-ből a csatolás és írás tesztelt
  - alkalmazásszintű feltöltés még nincs
- Cél állapot (To-Be):
  - a fotós galériához médiafájlt tud feltölteni
  - a bináris fájl a saját NFS storage-on kerül tárolásra
  - a hozzá tartozó metaadat adatbázisba kerül
  - a kép az admin és ügyfél galérianézetben megjeleníthető
- Várható üzleti előnyök:
  - saját kontroll alatt maradó médiaállományok
  - egységes fotós workflow
  - későbbi preview/render pipeline alapja
- Érintettek:
  - fotós/admin
  - ügyfél
  - rendszerüzemeltető
- Mérhetőség:
  - legalább egy JPEG sikeresen feltölthető
  - a fájl fizikailag megjelenik a média storage-on
  - a metaadat rekord az adatbázisban létrejön
  - a feltöltött kép megjelenik a webes felületen
- Kapcsolódó kockázat (ha nem teljesül):
  - a projekt csak metaadat-kezelő demonstráció marad
  - megszakad a kapcsolat az alkalmazás és a saját storage között
- Sikerességi kritériumok:
  - end-to-end JPEG upload flow működik
  - hibás storage esetén a rendszer nem jelez sikeres feltöltést
- Sikertelenségi kritériumok:
  - az adatbázisban olyan médiarekord keletkezik, amely mögött nincs tényleges fájl
  - a fájl nem köthető galériához
- Kockázatok:
  - nagy fájlok és hálózati storage miatti teljesítményprobléma (valószínűség: közepes, hatás: közepes)
- Korlátozás:
  - az első vertikális szelet JPEG fájlokra fókuszál
- Függőségek:
  - `BR-FNC-0001`
  - NFS storage rendelkezésre állása
  - adatbázis
- Technikai megjegyzések:
  - nagy bináris fájlok nem SQL BLOB-ként kerülnek tárolásra

---

## BR-PRC-0002 – Ügyfélkiválasztás és digitális átadás támogatása

- BR azonosító: `BR-PRC-0002`
- BR neve: Ügyfélkiválasztás és digitális átadás támogatása
- Kategória: `BR-PRC-xxxx`
- Státusz: elfogadott
- Prioritás: kritikus
- Üzleti érték: 95
- RICE: `(R=20 x I=3 x C=95%) / E=7 = 8,1`
- Üzleti probléma: A képválogatás gyakran külön üzenetváltásban vagy manuális fájllistákkal történik, ami időigényes és hibára hajlamos.
- Üzleti indoklás: A client proofing a rendszer fotós-specifikus funkciója; ez különbözteti meg egy egyszerű fájlmegosztástól.
- Jelenlegi helyzet (As-Is): nem implementált
- Cél állapot (To-Be):
  - az ügyfél a megosztott galériában képeket jelölhet ki
  - a kiválasztás véglegesíthető
  - a fotós a kiválasztást strukturáltan visszakapja
  - a fotós médiaelemenként engedélyezheti vagy visszavonhatja a letöltést
  - kizárólag az engedélyezett végleges képek tölthetők le
- Várható üzleti előnyök:
  - kevesebb manuális egyeztetés
  - egyértelmű ügyfél-visszajelzés
  - gyorsabb átadási folyamat
- Érintettek:
  - fotós/admin
  - ügyfél
- Mérhetőség:
  - legalább egy kép kijelölhető és a kijelölés adatbázisban megmarad
  - véglegesítés után az admin látja a kiválasztást
  - engedélyezett kép ügyféloldalról letölthető
- Kapcsolódó kockázat (ha nem teljesül):
  - a rendszer csak vizuális galéria marad, fotós munkafolyamat nélkül
- Sikerességi kritériumok:
  - pozitív proofing flow végigfut
  - ügyfél és galéria kiválasztásai nem keverednek
- Sikertelenségi kritériumok:
  - duplikált vagy idegen galériához tartozó kiválasztás rögzíthető
- Kockázatok:
  - túl összetett selection state már az MVP-ben (valószínűség: közepes, hatás: közepes)
- Korlátozás:
  - képmegjegyzések és többkörös approval nem része az első MVP-nek
- Függőségek:
  - privát galériamegosztás
  - média megjelenítés
- Technikai megjegyzések:
  - a kiválasztás üzleti állapotát az adatbázis kezeli

---

## BR-DAT-0001 – Követhető média- és metaadatmodell kialakítása

- BR azonosító: `BR-DAT-0001`
- BR neve: Követhető média- és metaadatmodell kialakítása
- Kategória: `BR-DAT-xxxx`
- Státusz: elfogadott
- Prioritás: magas
- Üzleti érték: 80
- RICE: `(R=15 x I=2 x C=90%) / E=5 = 5,4`
- Üzleti probléma: A médiafájlok, galériák, ügyfelek és kiválasztások csak egyértelmű kapcsolatokkal kezelhetők biztonságosan és tesztelhetően.
- Üzleti indoklás: A jó adatmodell támogatja a proofingot, a visszakereshetőséget, a tesztelést és a későbbi automatizálást.
- Jelenlegi helyzet (As-Is): alkalmazási adatmodell még nincs
- Cél állapot (To-Be):
  - a fő domain entitások egyértelmű relációkkal kapcsolódnak
  - a média bináris tartalma és üzleti metaadata külön tárolási rétegben marad
  - az adatbázisséma verziózott módon fejleszthető
- Várható üzleti előnyök:
  - kevesebb inkonzisztens adatállapot
  - könnyebb tesztelhetőség
  - későbbi workflow-k bővíthetősége
- Érintettek:
  - fejlesztő
  - fotós/admin
  - rendszerüzemeltető
- Mérhetőség:
  - minden médiarekord valós galériához kapcsolódik
  - minden selection item valós selection és media rekordhoz kapcsolódik
  - séma migráció új adatbázison reprodukálható
- Kapcsolódó kockázat (ha nem teljesül):
  - árva fájlok és rekordok
  - nehezen tesztelhető üzleti logika
- Sikerességi kritériumok:
  - alap adatintegritási szabályok adatbázis- és service-szinten érvényesülnek
- Sikertelenségi kritériumok:
  - ugyanaz a média többértelműen vagy galéria nélkül létezik
- Kockázatok:
  - túlkomplikált domainmodell (valószínűség: közepes, hatás: közepes)
- Korlátozás:
  - az első verzió a magmodellre fókuszál
- Függőségek:
  - CockroachDB
  - Spring Data JPA
  - Flyway
- Technikai megjegyzések:
  - az adatbázis egy külön `sql01` VM-en fut

---

## BR-OPS-0001 – Saját infrastruktúrán üzemeltethető, menthető szolgáltatás kialakítása

- BR azonosító: `BR-OPS-0001`
- BR neve: Saját infrastruktúrán üzemeltethető, menthető szolgáltatás kialakítása
- Kategória: `BR-OPS-xxxx`
- Státusz: elfogadott
- Prioritás: magas
- Üzleti érték: 85
- RICE: `(R=10 x I=3 x C=90%) / E=8 = 3,4`
- Üzleti probléma: A saját fejlesztésű fotós szolgáltatás csak akkor használható felelősen, ha telepíthető, menthető és helyreállítható.
- Üzleti indoklás: A projekt egyik fő célja a saját privát felhő, ezért az üzemeltethetőség nem különálló technikai extra, hanem a koncepció része.
- Jelenlegi helyzet (As-Is):
  - Proxmox VE, ZFS és NFS infrastruktúra működik
  - VM backup/restore és snapshot tesztelve
  - alkalmazás VM-ek és CI/CD még nincsenek véglegesítve
- Cél állapot (To-Be):
  - külön `docker01` és `sql01` VM működik
  - a deployment verziózott és reprodukálható
  - VM- és adatbázis-szintű mentés dokumentált
  - kritikus szolgáltatások health állapota ellenőrizhető
- Várható üzleti előnyök:
  - kisebb helyreállítási kockázat
  - kontrollált saját üzemeltetés
  - reprodukálható fejlesztési és kiadási folyamat
- Érintettek:
  - rendszerüzemeltető
  - fejlesztő
  - fotós/rendszer tulajdonosa
- Mérhetőség:
  - CI build és teszt automatikusan lefut
  - production image előállítható
  - legalább egy dokumentált DB restore és VM restore teszt sikeres
- Kapcsolódó kockázat (ha nem teljesül):
  - manuális, nem reprodukálható telepítés
  - adatvesztés vagy hosszú helyreállítás
- Sikerességi kritériumok:
  - alkalmazás verziózott artifactból deployolható
  - kritikus mentési folyamatok kipróbáltak
- Sikertelenségi kritériumok:
  - csak kézi, dokumentálatlan telepítés lehetséges
  - nincs visszaállítási teszt
- Kockázatok:
  - média és backup egy fizikai storage környezetben marad (valószínűség: közepes, hatás: magas)
- Korlátozás:
  - az MVP nem teljes földrajzilag redundáns HA környezet
- Függőségek:
  - Proxmox VE
  - MicroServer
  - GitHub repository
- Technikai megjegyzések:
  - CI/CD GitHub Actions, konténer registry és self-hosted deployment irányba készül

---

## BR-FNC-0003 – Fotós-specifikus automatizálhatóság megalapozása

- BR azonosító: `BR-FNC-0003`
- BR neve: Fotós-specifikus automatizálhatóság megalapozása
- Kategória: `BR-FNC-xxxx`
- Státusz: tervezet
- Prioritás: közepes
- Üzleti érték: 70
- RICE: `(R=10 x I=2 x C=75%) / E=8 = 1,9`
- Üzleti probléma: Egy egyszerű privát galéria önmagában kevés megkülönböztető értéket ad a meglévő felhő- és proofing szolgáltatásokhoz képest.
- Üzleti indoklás: A saját rendszer hosszabb távú értéke a fotós-specifikus workflow-kban rejlik.
- Jelenlegi helyzet (As-Is): nincs alkalmazási automatizálás
- Cél állapot (To-Be):
  - az architektúra lehetővé teszi thumbnail/preview generálás, render pipeline, metaadat-alapú műveletek és automatikus publikálás későbbi bevezetését
- Várható üzleti előnyök:
  - kevesebb manuális művelet
  - egyedibb szakdolgozati megoldás
  - továbbfejleszthető termékalap
- Érintettek:
  - fotós/admin
  - fejlesztő
- Mérhetőség:
  - legalább egy automatizált médiafeldolgozási lépés később a meglévő storage és adatmodell teljes újraírása nélkül beilleszthető
- Kapcsolódó kockázat (ha nem teljesül):
  - a projekt általános galériamegosztó szintjén marad
- Sikerességi kritériumok:
  - a médiafeldolgozás külön szolgáltatási felelősségként bővíthető
- Sikertelenségi kritériumok:
  - minden feldolgozási funkció az alap CRUD logikába épül, erős csatolást okozva
- Kockázatok:
  - túl korai automatizálás elviszi az időt az MVP-ről (valószínűség: magas, hatás: magas)
- Korlátozás:
  - az automatizált válogatás, RAW render és automatikus publikálás nem része az első MVP-nek
- Függőségek:
  - működő médiafeltöltés
  - stabil metaadatmodell
- Technikai megjegyzések:
  - későbbi külön `media-worker` konténer bevezethető
