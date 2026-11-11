# Tiny Arcade 🎮 (Nederlands)

Eén kleine app met een menu vol eenvoudige spelletjes voor kinderen. Geen build, geen afhankelijkheden, werkt ook offline.

**Maak iets:** Tiny Band (muziek), Tiny Artist (tekenen + kleurplaten), Stickers
**Spelen:** Memory, Bellen knallen, Doolhof, Mollen meppen, Kleuren, Dierengeluiden
**Met z'n tweeën of tegen de computer:** Boter, kaas en eieren, Vier op een rij

## Online zetten (GitHub Pages)
1. Maak een nieuwe GitHub-repo en upload alles uit deze map (laat de map `games` zoals ze is).
2. Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
3. Na een minuutje staat de site op `https://<jouw-gebruikersnaam>.github.io/<repo-naam>/`.

## Op de iPhone zetten
Open de site in **Safari** → knop Delen → **Zet op beginscherm**.
Tip: Instellingen → Toegankelijkheid → Begeleide toegang houdt een kind in de app.

## Opbouw
- `index.html` – hoofdmenu
- `shared.js` / `shared.css` – geluid, kopbalk, startscherm en effecten die de spelletjes delen
- `games/*.html` – één bestand per spel
- `sw.js` – offline cache (voeg nieuwe spelbestanden toe aan de lijst als je spelletjes toevoegt)
