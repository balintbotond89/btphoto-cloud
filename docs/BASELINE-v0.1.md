# BTPhoto Private Cloud – Fejlesztési baseline v0.1

**Baseline azonosító:** `BTPC-BL-2026-09-13-v0.1`  
**Dátum:** `2026-09-13`  
**Cél:** az első walking skeleton és vertikális feature megkezdéséhez rögzített dokumentációs állapot.

## Baseline döntések

- `GAP-001` lezárva.
- `US-0013 – Média letöltésének engedélyezése adminisztrátorként` elfogadva.
- `FR-DWN-0002` elfogadva.
- Letöltési jogosultság: médiaelemenkénti, alapértelmezetten tiltott.
- `docker01` és `sql01` külön VM.
- Média: `nas01` NFSv4.
- Backend: Java 21 + Spring Boot 3.
- Frontend: React + TypeScript + Vite.
- DB: CockroachDB + Flyway.
- Futtatás: Docker Compose + Caddy.
- CI/CD: GitHub Actions + GHCR.
- Fejlesztés: VS Code + Codex, repository-szintű `AGENTS.md` szabályokkal.

## Nem blokkoló nyitott döntések

- véglegesített selection újranyithatósága;
- ügyfél e-mail egyedisége;
- több aktív share token engedélyezése;
- preview/thumbnail pipeline pontos backlog helye és technológiája;
- `vmbr2` végleges címzése és CockroachDB TLS-részletei.

Ezek nem blokkolják az első vertikális fejlesztési szeletet.

## Baseline dokumentumok SHA-256

- `01-uzleti-kovetelmenyek.md`  
  `cc92ed2ca699f443a3d3bb71a38693163801746107221ab696cdcd7bb0fd6030`
- `02-epicek-es-user-storyk.md`  
  `f590323a1fb5a236b8e3e6a0d4eae59d37644df5e1a04901012586e19f1d3b96`
- `03-funkcionalis-kovetelmenyek.md`  
  `3e4b8230e8ea1cf05814a70ab11b1f1209d194c6d58ddf2a94f5a33fab623082`
- `04-nem-funkcionalis-kovetelmenyek.md`  
  `8330ac4318b3752297fdf84db6e706ffd9658f8540bc66c200bd2451b6483354`
- `05-technikai-kovetelmenyek.md`  
  `a2591fab8708bf48051d8ff376fa51e09aa25ba1974209f70a2026cf5251d358`
- `06-teszteset-gyujtemeny.md`  
  `49df29c7030c17ce64f86984d88ebad6ae82cc3e0d3f37cf1f5c5f2dad8afb8b`
- `07-nyomonkovethetosegi-matrix.md`  
  `f866a4f282697769ded8c02198307226a4885e0231aad7b2185b7f813cf461d4`
- `08-ui-ux-terv.md`  
  `22cd9d1c68ee3edbd987e4a2713443b44e12c25667c18f9448d83944e36bcd69`
- `09-rendszerterv-es-szolgaltatasarchitektura.md`  
  `181ecdd2f3bffa0836ce3198fc551b7b5c5b1e67d9c1da5081e5a60ebc2a0861`

## Első implementációs scope

```text
US-0001 Admin bejelentkezés
→ US-0002 Ügyfél létrehozása
→ US-0003 Galéria létrehozása
→ US-0004 JPEG feltöltése
→ US-0005 Média megjelenítése
```

Sikerkritérium: JPEG fizikailag az NFS media storage-ra kerül, metaadata CockroachDB-be íródik, és a React admin felületen megjelenik.
