# Nyomonkövethetőségi mátrix

**Dokumentum státusza:** fejlesztési baseline v0.1  
**Projekt:** BTPhoto Private Cloud  
**Baseline azonosító:** `BTPC-BL-2026-09-13-v0.1`  
**Baseline dátuma:** `2026-09-13`

**Kapcsolódó dokumentumok:**
- `01-uzleti-kovetelmenyek.md`
- `02-epicek-es-user-storyk.md`
- `03-funkcionalis-kovetelmenyek.md`
- `04-nem-funkcionalis-kovetelmenyek.md`
- `05-technikai-kovetelmenyek.md`
- `06-teszteset-gyujtemeny.md`
- `08-ui-ux-terv.md`
- `09-rendszerterv-es-szolgaltatasarchitektura.md`

A dokumentum célja a BTPhoto Private Cloud követelményeinek teljes láncú nyomon követése.

A mátrix a következő kapcsolatokat kezeli:

```text
Üzleti követelmény (BR)
        ↓
Epic / User Story (US)
        ↓
Funkcionális követelmény (FR)
        ↓
Acceptance Criteria (AC)
        ↓
Nem funkcionális követelmény (NFR)
        ↓
Technikai követelmény (TR)
        ↓
Teszteset (TC)
```

A nyomonkövethetőség célja, hogy:

- minden kritikus üzleti igényhez tartozzon implementálható specifikáció;
- minden kritikus funkcióhoz tartozzon ellenőrizhető Acceptance Criteria;
- minden kritikus Acceptance Criteria legalább egy teszttel igazolható legyen;
- minden fontos technikai döntés visszavezethető legyen valós követelményre;
- ne maradjanak „árva” funkciók, amelyeknek nincs üzleti indoka;
- ne maradjanak teszteletlen kritikus követelmények.

---

# 1. Fő BR → US → FR → NFR → TR → TC mátrix

| BR | Epic / US | FR | Fő NFR | Fő TR | Fő TC |
| --- | --- | --- | --- | --- | --- |
| `BR-FNC-0001` Ügyfél- és galériakezelés | Epic 1; `US-0001`, `US-0002`, `US-0003` | `FR-AUT-0001`, `FR-DAT-0001`, `FR-DAT-0002` | `NFR-MNT-0001`, `NFR-DAT-0001`, `NFR-SEC-0001`, `NFR-USB-0001` | `TR-TCH-0001`, `TR-ARC-0001`, `TR-DAT-0001`, `TR-SEC-0001` | `TC-AUT-0001..0003`, `TC-DAT-0001..0006`, `TC-API-0001..0002` |
| `BR-FNC-0002` Privát ügyfélgaléria és megosztás | Epic 3; `US-0006`, `US-0007` | `FR-SHR-0001`, `FR-SHR-0002` | `NFR-SEC-0001`, `NFR-USB-0001`, `NFR-USB-0002`, `NFR-PER-0001` | `TR-TCH-0002`, `TR-SEC-0001`, `TR-OPS-0001`, `TR-DEP-0001` | `TC-SHR-0001..0005`, `TC-SEC-0001`, `TC-UI-0001`, `TC-UI-0004`, `TC-UI-0005`, `TC-E2E-0002` |
| `BR-PRC-0001` Médiafeltöltési és client proofing folyamat támogatása | Epic 2; `US-0004`, `US-0005` | `FR-MED-0001`, `FR-MED-0002` | `NFR-REL-0001`, `NFR-DAT-0001`, `NFR-SEC-0001`, `NFR-PER-0001`, `NFR-OPS-0001` | `TR-STO-0001`, `TR-DAT-0001`, `TR-DAT-0002`, `TR-ARC-0001`, `TR-OPS-0002` | `TC-MED-0001..0007`, `TC-DB-0003`, `TC-OPS-0003`, `TC-E2E-0001` |
| `BR-PRC-0002` Ügyfélkiválasztás és digitális átadás | Epic 4; `US-0008`, `US-0009`, `US-0010`, `US-0013` | `FR-WFL-0001`, `FR-WFL-0002`, `FR-DWN-0001`, `FR-DWN-0002` | `NFR-DAT-0001`, `NFR-SEC-0001`, `NFR-USB-0002`, `NFR-REL-0001` | `TR-TCH-0001`, `TR-TCH-0002`, `TR-ARC-0001`, `TR-SEC-0001`, `TR-STO-0001` | `TC-WFL-0001..0006`, `TC-DWN-0001..0005`, `TC-E2E-0003` |
| `BR-DAT-0001` Követhető média- és metaadatmodell | Epic 1, 2, 5; `US-0002`, `US-0003`, `US-0004`, `US-0011` | `FR-DAT-0001`, `FR-DAT-0002`, `FR-MED-0001`, `FR-MED-0002` | `NFR-DAT-0001`, `NFR-MNT-0001`, `NFR-REL-0001` | `TR-DAT-0001`, `TR-DAT-0002`, `TR-ARC-0001`, `TR-STO-0001`, `TR-DEV-0003` | `TC-DAT-*`, `TC-MED-*`, `TC-DB-0001..0004`, `TC-QLT-0001` |
| `BR-OPS-0001` Saját infrastruktúrán üzemeltethető, menthető szolgáltatás | Epic 5; `US-0011`, `US-0012` | közvetlen üzleti FR helyett elsősorban NFR/TR lánc | `NFR-MNT-0002`, `NFR-OPS-0001`, `NFR-REC-0001`, `NFR-DEP-0001`, `NFR-SEC-0002` | `TR-INF-0001`, `TR-NET-0001`, `TR-DEP-0001`, `TR-DEP-0002`, `TR-OPS-0001`, `TR-OPS-0002`, `TR-BCK-0001` | `TC-QLT-*`, `TC-OPS-*`, `TC-DEP-*`, `TC-REC-*` |
| `BR-FNC-0003` Fotós-specifikus automatizálhatóság | Epic 6; POST-MVP | még nincs MVP FR | `NFR-MNT-0001` | `TR-ARC-0001`, `TR-STO-0001` | jelenleg nincs kötelező TC |

---

# 2. User Story → FR → AC → TC részletes mátrix

## US-0001 – Admin bejelentkezés

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-FNC-0001`, részben `BR-FNC-0002` |
| FR | `FR-AUT-0001` |
| AC | `AC-FR-AUT-0001-01`, `AC-FR-AUT-0001-02`, `AC-FR-AUT-0001-03` |
| NFR | `NFR-SEC-0001`, `NFR-SEC-0002`, `NFR-USB-0001` |
| TR | `TR-TCH-0001`, `TR-SEC-0001`, `TR-ARC-0001` |
| TC | `TC-AUT-0001`, `TC-AUT-0002`, `TC-AUT-0003`, `TC-SEC-0003` |

**Lefedettség:** teljes.

---

## US-0002 – Ügyfél létrehozása

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-FNC-0001`, `BR-DAT-0001` |
| FR | `FR-DAT-0001` |
| AC | `AC-FR-DAT-0001-01`, `AC-FR-DAT-0001-02` |
| NFR | `NFR-DAT-0001`, `NFR-MNT-0001`, `NFR-USB-0001`, `NFR-PRV-0001` |
| TR | `TR-TCH-0001`, `TR-ARC-0001`, `TR-DAT-0001`, `TR-DAT-0002` |
| TC | `TC-DAT-0001`, `TC-DAT-0002`, `TC-API-0001` |

**Lefedettség:** teljes.

**Nyitott kérdés:** ügyfél e-mail egyediség nem elfogadott üzleti szabály, ezért szándékosan nincs rá kötelező TC.

---

## US-0003 – Galéria létrehozása és listázása

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-FNC-0001`, `BR-DAT-0001` |
| FR | `FR-DAT-0002` |
| AC | `AC-FR-DAT-0002-01`, `AC-FR-DAT-0002-02`, `AC-FR-DAT-0002-03` |
| NFR | `NFR-DAT-0001`, `NFR-MNT-0001`, `NFR-SEC-0001` |
| TR | `TR-TCH-0001`, `TR-ARC-0001`, `TR-DAT-0001`, `TR-DAT-0002` |
| TC | `TC-DAT-0003`, `TC-DAT-0004`, `TC-DAT-0005`, `TC-DAT-0006`, `TC-DB-0002` |

**Lefedettség:** teljes.

---

## US-0004 – JPEG feltöltése galériához

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-PRC-0001`, `BR-DAT-0001` |
| FR | `FR-MED-0001` |
| AC | `AC-FR-MED-0001-01`, `AC-FR-MED-0001-02`, `AC-FR-MED-0001-03` |
| NFR | `NFR-REL-0001`, `NFR-DAT-0001`, `NFR-SEC-0001`, `NFR-USB-0001`, `NFR-PER-0001` |
| TR | `TR-STO-0001`, `TR-DAT-0001`, `TR-DAT-0002`, `TR-ARC-0001` |
| TC | `TC-MED-0001`, `TC-MED-0002`, `TC-MED-0003`, `TC-MED-0004`, `TC-MED-0007`, `TC-DB-0003` |

**Lefedettség:** teljes funkcionális lefedettség.

**Technikai nyitott pont:** a DB-hiba utáni már kiírt storage fájl kompenzációs stratégiája még nincs véglegesítve, ezért `TC-MED-0004` részben tervezet.

---

## US-0005 – Feltöltött média megjelenítése az admin galériában

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-PRC-0001` |
| FR | `FR-MED-0002` |
| AC | `AC-FR-MED-0002-01`, `AC-FR-MED-0002-02` |
| NFR | `NFR-REL-0001`, `NFR-USB-0001`, `NFR-PER-0001` |
| TR | `TR-STO-0001`, `TR-TCH-0002`, `TR-ARC-0001` |
| TC | `TC-MED-0005`, `TC-MED-0006`, `TC-E2E-0001` |

**Lefedettség:** teljes.

---

## US-0006 – Privát galérialink létrehozása és visszavonása

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-FNC-0002` |
| FR | `FR-SHR-0001` |
| AC | `AC-FR-SHR-0001-01`, `AC-FR-SHR-0001-02` |
| NFR | `NFR-SEC-0001`, `NFR-USB-0001` |
| TR | `TR-SEC-0001`, `TR-TCH-0001`, `TR-DAT-0001` |
| TC | `TC-SHR-0001`, `TC-SHR-0002`, `TC-E2E-0002` |

**Lefedettség:** teljes.

---

## US-0007 – Ügyfélgaléria megtekintése

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-FNC-0002` |
| FR | `FR-SHR-0002` |
| AC | `AC-FR-SHR-0002-01`, `AC-FR-SHR-0002-02` |
| NFR | `NFR-SEC-0001`, `NFR-USB-0001`, `NFR-USB-0002`, `NFR-PER-0001`, `NFR-PRV-0001` |
| TR | `TR-TCH-0002`, `TR-SEC-0001`, `TR-OPS-0001`, `TR-STO-0001` |
| TC | `TC-SHR-0003`, `TC-SHR-0004`, `TC-SHR-0005`, `TC-UI-0001`, `TC-UI-0004`, `TC-UI-0005`, `TC-E2E-0002` |

**Lefedettség:** teljes.

---

## US-0008 – Kép kiválasztása ügyfélként

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-PRC-0002` |
| FR | `FR-WFL-0001` |
| AC | `AC-FR-WFL-0001-01`, `AC-FR-WFL-0001-02` |
| NFR | `NFR-DAT-0001`, `NFR-REL-0001`, `NFR-SEC-0001`, `NFR-USB-0002` |
| TR | `TR-TCH-0001`, `TR-TCH-0002`, `TR-DAT-0001`, `TR-SEC-0001` |
| TC | `TC-WFL-0001`, `TC-WFL-0002`, `TC-WFL-0003`, `TC-DB-0004`, `TC-E2E-0003` |

**Lefedettség:** teljes.

---

## US-0009 – Kiválasztás véglegesítése és admin megtekintése

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-PRC-0002` |
| FR | `FR-WFL-0002` |
| AC | `AC-FR-WFL-0002-01`, `AC-FR-WFL-0002-02`, `AC-FR-WFL-0002-03` |
| NFR | `NFR-DAT-0001`, `NFR-REL-0001`, `NFR-SEC-0001` |
| TR | `TR-TCH-0001`, `TR-TCH-0002`, `TR-DAT-0001`, `TR-ARC-0001` |
| TC | `TC-WFL-0004`, `TC-WFL-0005`, `TC-WFL-0006`, `TC-E2E-0003` |

**Lefedettség:** funkcionálisan teljes.

**Nyitott üzleti döntés:** véglegesítés után módosítható-e a selection. Mivel ez nincs elfogadva, nincs rá kötelező FR/TC.

---

## US-0010 – Engedélyezett kép letöltése

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-PRC-0002` |
| FR | `FR-DWN-0001` |
| AC | `AC-FR-DWN-0001-01`, `AC-FR-DWN-0001-02` |
| NFR | `NFR-SEC-0001`, `NFR-USB-0001`, `NFR-PER-0001` |
| TR | `TR-STO-0001`, `TR-SEC-0001`, `TR-TCH-0001` |
| TC | `TC-DWN-0001`, `TC-DWN-0002` |

**Lefedettség:** teljes.

**Függőség:** az ügyféloldali letöltéshez a `US-0013` / `FR-DWN-0002` szerinti admin engedély szükséges.

---

## US-0013 – Média letöltésének engedélyezése adminisztrátorként

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-PRC-0002` |
| FR | `FR-DWN-0002` |
| AC | `AC-FR-DWN-0002-01`, `AC-FR-DWN-0002-02`, `AC-FR-DWN-0002-03` |
| NFR | `NFR-SEC-0001`, `NFR-DAT-0001`, `NFR-REL-0001` |
| TR | `TR-TCH-0001`, `TR-DAT-0001`, `TR-SEC-0001` |
| TC | `TC-DWN-0003`, `TC-DWN-0004`, `TC-DWN-0005` |

**Lefedettség:** teljes.

**MVP döntés:** letöltési jogosultság médiaelemenként tárolódik; új média alapértelmezetten nem letölthető.

---

## US-0011 – Automatizált minőségkapu

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-OPS-0001`, `BR-DAT-0001` |
| FR | nincs szükség klasszikus üzleti FR-re |
| NFR | `NFR-MNT-0002`, `NFR-DEP-0001` |
| TR | `TR-DEV-0001`, `TR-DEV-0002`, `TR-DEV-0003`, `TR-DEP-0002` |
| TC | `TC-QLT-0002`, `TC-QLT-0003`, `TC-DEP-0001` |

**Lefedettség:** teljes, NFR/TR orientált.

---

## US-0012 – Mentés, helyreállítás és kontrollált deployment

| Szint | Kapcsolat |
| --- | --- |
| BR | `BR-OPS-0001` |
| FR | nincs szükség klasszikus üzleti FR-re |
| NFR | `NFR-OPS-0001`, `NFR-REC-0001`, `NFR-DEP-0001`, `NFR-SEC-0002` |
| TR | `TR-INF-0001`, `TR-DEP-0001`, `TR-DEP-0002`, `TR-OPS-0001`, `TR-OPS-0002`, `TR-BCK-0001` |
| TC | `TC-OPS-0001..0003`, `TC-DEP-0002..0004`, `TC-REC-0001..0004` |

**Lefedettség:** teljes, NFR/TR orientált.

---

# 3. Acceptance Criteria → Test Case mátrix

| Acceptance Criteria | Teszteset | Állapot |
| --- | --- | --- |
| `AC-FR-AUT-0001-01` | `TC-AUT-0001` | lefedett |
| `AC-FR-AUT-0001-02` | `TC-AUT-0003` | lefedett |
| `AC-FR-AUT-0001-03` | `TC-AUT-0002` | lefedett |
| `AC-FR-DAT-0001-01` | `TC-DAT-0001` | lefedett |
| `AC-FR-DAT-0001-02` | `TC-DAT-0002` | lefedett |
| `AC-FR-DAT-0002-01` | `TC-DAT-0003`, `TC-DAT-0004` | lefedett |
| `AC-FR-DAT-0002-02` | `TC-DAT-0005` | lefedett |
| `AC-FR-DAT-0002-03` | `TC-DAT-0006` | lefedett |
| `AC-FR-MED-0001-01` | `TC-MED-0001` | lefedett |
| `AC-FR-MED-0001-02` | `TC-MED-0002` | lefedett |
| `AC-FR-MED-0001-03` | `TC-MED-0003` | lefedett |
| `AC-FR-MED-0002-01` | `TC-MED-0005` | lefedett |
| `AC-FR-MED-0002-02` | `TC-MED-0006` | lefedett |
| `AC-FR-SHR-0001-01` | `TC-SHR-0001` | lefedett |
| `AC-FR-SHR-0001-02` | `TC-SHR-0002` | lefedett |
| `AC-FR-SHR-0002-01` | `TC-SHR-0003` | lefedett |
| `AC-FR-SHR-0002-02` | `TC-SHR-0004` | lefedett |
| `AC-FR-WFL-0001-01` | `TC-WFL-0001` | lefedett |
| `AC-FR-WFL-0001-02` | `TC-WFL-0002` | lefedett |
| `AC-FR-WFL-0002-01` | `TC-WFL-0004` | lefedett |
| `AC-FR-WFL-0002-02` | `TC-WFL-0005` | lefedett |
| `AC-FR-WFL-0002-03` | `TC-WFL-0006` | lefedett |
| `AC-FR-DWN-0001-01` | `TC-DWN-0001` | lefedett |
| `AC-FR-DWN-0001-02` | `TC-DWN-0002` | lefedett |
| `AC-FR-DWN-0002-01` | `TC-DWN-0003` | lefedett |
| `AC-FR-DWN-0002-02` | `TC-DWN-0004` | lefedett |
| `AC-FR-DWN-0002-03` | `TC-DWN-0005` | lefedett |

## AC lefedettségi összesítés

- összes azonosított AC: 27
- teljesen tesztesethez rendelt AC: 27
- tervezet/blokkolt AC: 0
- teszteset nélküli kritikus AC: 0
- funkcionálisan blokkolt terület: nincs

A `GAP-001` lezárásával a letöltési folyamat is teljes BR → US → FR → AC → TC lánccal rendelkezik.

---

# 4. NFR → TR → TC mátrix

| NFR | Fő TR | Verifikáló TC |
| --- | --- | --- |
| `NFR-MNT-0001` Rétegzett szerkezet | `TR-ARC-0001`, `TR-TCH-0001` | `TC-QLT-0001` |
| `NFR-REL-0001` Üzleti/storage konzisztencia | `TR-STO-0001`, `TR-DAT-0001`, `TR-ARC-0001` | `TC-MED-0003`, `TC-MED-0004`, `TC-WFL-0002`, `TC-WFL-0003` |
| `NFR-DAT-0001` Adatintegritás | `TR-DAT-0001`, `TR-DAT-0002`, `TR-DEV-0003` | `TC-DB-0001..0004` |
| `NFR-SEC-0001` Jogosultságvédelem | `TR-SEC-0001`, `TR-OPS-0001`, `TR-STO-0001` | `TC-AUT-0003`, `TC-MED-0007`, `TC-SHR-0004`, `TC-SHR-0005`, `TC-SEC-0001..0002`, `TC-DWN-0002` |
| `NFR-SEC-0002` Secret kezelés | `TR-SEC-0001`, `TR-DEP-0002` | `TC-SEC-0003`, `TC-SEC-0004`, `TC-DEP-0004` |
| `NFR-MNT-0002` Automatizált quality gate | `TR-DEV-0001`, `TR-DEV-0002`, `TR-DEV-0003`, `TR-DEP-0002` | `TC-QLT-0002`, `TC-QLT-0003`, `TC-DEP-0001` |
| `NFR-USB-0001` Egységes hiba-visszajelzés | `TR-ARC-0001`, `TR-TCH-0001`, `TR-TCH-0002` | `TC-API-0001`, `TC-API-0002`, `TC-API-0003`, `TC-UI-0008` |
| `NFR-USB-0002` Reszponzív és hozzáférhető UI | `TR-TCH-0002` | `TC-UI-0001..0008` |
| `NFR-PER-0001` Teljesítmény | `TR-TCH-0002`, `TR-STO-0001`, `TR-OPS-0002` | `TC-UI-0006`, `TC-UI-0007`, `TC-PER-0001`, `TC-PER-0002`, `TC-PER-0003` |
| `NFR-OPS-0001` Megfigyelhetőség | `TR-OPS-0001`, `TR-OPS-0002` | `TC-OPS-0001`, `TC-OPS-0002`, `TC-OPS-0003` |
| `NFR-REC-0001` Backup/restore | `TR-BCK-0001`, `TR-INF-0001` | `TC-REC-0001`, `TC-REC-0002`, `TC-REC-0003`, `TC-REC-0004` |
| `NFR-DEP-0001` Reprodukálható deployment | `TR-DEP-0001`, `TR-DEP-0002`, `TR-OPS-0002` | `TC-DEP-0001`, `TC-DEP-0002`, `TC-DEP-0003` |
| `NFR-PRV-0001` Minimális adatkezelés | `TR-SEC-0001`, `TR-DOC-0001` | `TC-SEC-0003`, API/DTO review |

---

# 5. TR → Verifikációs kapcsolat

| TR | Verifikáció / TC |
| --- | --- |
| `TR-INF-0001` | `TC-REC-0001`, `TC-REC-0002`, VM connectivity tesztek |
| `TR-NET-0001` | hálózati connectivity és isolation teszt; végleges TC a vmbr2 implementáció után |
| `TR-TCH-0001` | `TC-QLT-0002`, backend unit/controller/integration tesztek |
| `TR-TCH-0002` | `TC-QLT-0003`, `TC-UI-*`, `TC-E2E-*` |
| `TR-ARC-0001` | `TC-QLT-0001` |
| `TR-DAT-0001` | `TC-DB-0001..0004`, `TC-REC-0003` |
| `TR-DAT-0002` | `TC-DB-0001` |
| `TR-STO-0001` | `TC-MED-0001..0007`, `TC-OPS-0003`, `TC-REC-0004` |
| `TR-SEC-0001` | `TC-AUT-*`, `TC-SHR-*`, `TC-SEC-*` |
| `TR-DEV-0001` | `TC-QLT-0002` + unit/controller tesztkatalógus |
| `TR-DEV-0002` | `TC-QLT-0002` |
| `TR-DEV-0003` | `TC-DB-0001..0004` |
| `TR-DEP-0001` | `TC-DEP-0003`, `TC-REC-0001` |
| `TR-DEP-0002` | `TC-DEP-0001..0004` |
| `TR-OPS-0001` | `TC-DEP-0003`, HTTPS/proxy smoke teszt |
| `TR-OPS-0002` | `TC-OPS-0001..0003` |
| `TR-BCK-0001` | `TC-REC-0001..0004` |
| `TR-AI-0001` | PR/diff review + CI; önálló runtime TC nem szükséges |
| `TR-DOC-0001` | dokumentáció/traceability review |

---

# 6. E2E lefedettség

## E2E-1 – Első architektúra-validáció

`TC-E2E-0001`

Lefed:

```text
US-0001
→ US-0002
→ US-0003
→ US-0004
→ US-0005
```

Kapcsolódó FR:

```text
FR-AUT-0001
FR-DAT-0001
FR-DAT-0002
FR-MED-0001
FR-MED-0002
```

Bizonyítja:

- admin security
- Astro → Spring kommunikáció
- Spring → CockroachDB kommunikáció
- Spring → NFS media storage kommunikáció
- metadata + physical media összekapcsolás
- admin galériamegjelenítés

Ez a fejlesztés első kötelező vertikális szelete.

---

## E2E-2 – Privát galéria

`TC-E2E-0002`

Lefed:

```text
US-0006
→ US-0007
```

Bizonyítja:

- share létrehozás
- publikus ügyfélbelépés
- gallery isolation
- share visszavonás

---

## E2E-3 – Client proofing

`TC-E2E-0003`

Lefed:

```text
US-0008
→ US-0009
```

Bizonyítja:

- média kijelölés
- selection adatmodell
- finalizálás
- admin oldali eredmény

---

# 7. Követelményrés-elemzés

A teljes `01`–`06` dokumentumcsomag összevezetése alapján a következő réseket vagy nyitott pontokat azonosítottuk.

## GAP-001 – Letöltésengedélyező admin folyamat

**Státusz:** lezárva a baseline v0.1-ben.

**Döntés:**
- létrejött `US-0013 – Média letöltésének engedélyezése adminisztrátorként`
- létrejött `FR-DWN-0002`
- létrejöttek az `AC-FR-DWN-0002-01..03` kritériumok
- létrejöttek a `TC-DWN-0003..0005` tesztesetek
- az MVP letöltési jogosultsága médiaelemenkénti és alapértelmezetten tiltott

---

## GAP-002 – Véglegesített selection módosíthatósága

**Érintett:**
- `US-0009`
- `FR-WFL-0002`

**Kérdés:**

Az ügyfél véglegesítés után:
- soha nem módosíthat;
- admin újranyitással módosíthat;
- vagy szabadon módosíthat?

**Státusz:** nyitott üzleti döntés.

**Hatás:** az MVP első proofing verziója előtt döntendő.

---

## GAP-003 – Ügyfél e-mail egyediség

**Érintett:**
- `US-0002`
- `FR-DAT-0001`

**Kérdés:**

Ugyanaz az e-mail több `Client` rekordhoz tartozhat-e?

A jelenlegi specifikáció ezt nem tiltja.

**Státusz:** nem blokkolja az első vertikális szeletet.

---

## GAP-004 – Share token többes aktív példány

**Érintett:**
- `FR-SHR-0001`

**Kérdés:**

Egy galériához:
- pontosan egy aktív share lehet;
- vagy több külön aktív share token is engedélyezett?

**Státusz:** MVP-2 előtt eldöntendő.

---

## GAP-005 – Thumbnail / preview feldolgozás

A rendszertervben és NFR-ben fontos későbbi teljesítményoptimalizálás, de nincs még külön MVP user story/FR.

**Javaslat:** az első JPEG upload után új storyként:

```text
US-0014 – Optimalizált preview generálása feltöltött képből
```

Lehetséges FR:

```text
FR-MED-0003 – Preview és thumbnail generálás
```

**Státusz:** nem blokkolja az első vertikális szeletet.

---

## GAP-006 – vmbr2 konkrét hálózati megvalósítása

`TR-NET-0001` még tervezet.

**Kérdés:**
- végleges bridge név;
- végleges címek;
- sql01 LAN adapter szükségessége;
- DB admin UI elérhetősége.

**Státusz:** `sql01` és `docker01` VM létrehozásakor véglegesítendő.

---

# 8. Árva elem vizsgálat

## BR szint

| Elem | Állapot |
| --- | --- |
| `BR-FNC-0001` | teljesen levezetett |
| `BR-FNC-0002` | teljesen levezetett |
| `BR-PRC-0001` | teljesen levezetett |
| `BR-PRC-0002` | teljesen levezetett |
| `BR-DAT-0001` | teljesen levezetett |
| `BR-OPS-0001` | NFR/TR/TC láncon teljesen levezetett |
| `BR-FNC-0003` | szándékosan POST-MVP |

Nincs indokolatlanul árva kritikus BR.

---

## US szint

| Elem | Állapot |
| --- | --- |
| `US-0001` | teljes |
| `US-0002` | teljes |
| `US-0003` | teljes |
| `US-0004` | teljes |
| `US-0005` | teljes |
| `US-0006` | teljes |
| `US-0007` | teljes |
| `US-0008` | teljes |
| `US-0009` | teljes, egy üzleti döntés nyitott |
| `US-0010` | teljes |
| `US-0011` | teljes NFR/TR láncon |
| `US-0012` | teljes NFR/TR láncon |
| `US-0013` | teljes |

---

## FR szint

| Elem | Állapot |
| --- | --- |
| `FR-AUT-0001` | teljes AC + TC |
| `FR-DAT-0001` | teljes AC + TC |
| `FR-DAT-0002` | teljes AC + TC |
| `FR-MED-0001` | teljes AC + TC; technikai kompenzáció még nyitott |
| `FR-MED-0002` | teljes AC + TC |
| `FR-SHR-0001` | teljes AC + TC |
| `FR-SHR-0002` | teljes AC + TC |
| `FR-WFL-0001` | teljes AC + TC |
| `FR-WFL-0002` | teljes AC + TC |
| `FR-DWN-0001` | teljes AC + TC |
| `FR-DWN-0002` | teljes AC + TC |

Nincs TC nélküli elfogadott kritikus FR.

---

# 9. Első fejlesztési release traceability

Az első fejlesztési release scope:

```text
US-0001
US-0002
US-0003
US-0004
US-0005
```

## Kötelező FR-ek

```text
FR-AUT-0001
FR-DAT-0001
FR-DAT-0002
FR-MED-0001
FR-MED-0002
```

## Kötelező NFR-ek

```text
NFR-MNT-0001
NFR-REL-0001
NFR-DAT-0001
NFR-SEC-0001
NFR-SEC-0002
NFR-MNT-0002
NFR-USB-0001
NFR-OPS-0001
NFR-DEP-0001
```

## Kötelező TR-ek

```text
TR-INF-0001
TR-TCH-0001
TR-TCH-0002
TR-ARC-0001
TR-DAT-0001
TR-DAT-0002
TR-STO-0001
TR-SEC-0001
TR-DEV-0001
TR-DEV-0002
TR-DEV-0003
TR-DEP-0001
TR-DEP-0002
TR-OPS-0002
TR-DOC-0001
```

## Minimum CI tesztek

```text
TC-AUT-0001
TC-AUT-0002
TC-AUT-0003

TC-DAT-0001
TC-DAT-0002
TC-DAT-0003
TC-DAT-0004
TC-DAT-0005
TC-DAT-0006

TC-MED-0001
TC-MED-0002
TC-MED-0003
TC-MED-0005
TC-MED-0007

TC-API-0001
TC-API-0002
TC-API-0003

TC-DB-0001
TC-DB-0002
TC-DB-0003

TC-QLT-0002
TC-QLT-0003
TC-OPS-0001
```

## Release előtti E2E

```text
TC-E2E-0001
```

---

# 10. Dokumentumfrissítési szabály

Ha egy követelmény scope-ja változik, a dokumentumokat ebben a sorrendben kell ellenőrizni:

```text
1. BR – változott-e az üzleti igény?
2. US – változott-e a felhasználói cél?
3. FR / AC – változott-e a rendszer viselkedése?
4. NFR – változott-e a minőségi elvárás?
5. TR – változott-e a technikai megoldás?
6. TC – továbbra is igazolja-e a követelményt?
7. Traceability matrix – minden kapcsolat naprakész-e?
```

Új funkció nem tekinthető teljesen dokumentáltnak, ha:

- nincs BR vagy üzleti indok;
- nincs US vagy egyértelmű enabler indok;
- nincs FR/AC, ha funkcionális viselkedést ad;
- nincs tesztelési mód;
- nincs a traceability mátrixban.

---

# 11. Traceability státusz összefoglaló

A jelenlegi dokumentumcsomag alapján:

- kritikus BR-ek száma: 6
- POST-MVP BR-ek: 1
- aktuális User Story-k: 13
- funkcionális követelmények: 11
- Acceptance Criteria: 27
- NFR-ek: 13
- TR-ek: 19
- definiált TC-k: több mint 50, külön unit/integrációs/CI/E2E csoportokban
- azonosított kritikus követelményrés: 0
- további nem blokkoló nyitott döntések: 5

A dokumentumcsomag az első vertikális fejlesztési szelet elindításához követelmény- és tesztelési szempontból már elegendően részletes.

---

# 12. Baseline állapot és következő fázis

A `01`–`09` tervezési csomag a `BTPC-BL-2026-09-13-v0.1` fejlesztési baseline része.

A kritikus `GAP-001` lezárult. A fennmaradó nyitott pontok nem blokkolják az első vertikális szeletet.

A következő fázis:
1. repository skeleton;
2. `README.md`;
3. `AGENTS.md`;
4. `sql01` és `docker01` előkészítése;
5. walking skeleton;
6. első vertikális feature.

Az első implementációs scope továbbra is:

```text
US-0001 → US-0002 → US-0003 → US-0004 → US-0005
```
