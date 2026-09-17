# IEEE Summer School 2026 — Landing Page

Single-file landing page for IEEE Summer School 2026, IEEE Student Branch, Vimal Jyothi
Engineering College. No build step, no dependencies — open `index.html` in a browser.

## What it does

A rolling **shutter** covers the viewport on load and page scrolling is locked. Clicking the
green **REGISTER** button lifts the shutter (`translateY(-100%)`, 1.8s
`cubic-bezier(.22, 1, .36, 1)`), removes the manual `#ctrl` toggle from the DOM, and unlocks
vertical scrolling once the transition completes.

Below the revealed stage are five sections, each fading and sliding up into view as it enters
the viewport via `IntersectionObserver`:

1. **Stage** — event overview and key numbers
2. **About** — IEEE SB VJEC, vision and objectives
3. **Tracks** — five workshop tracks with mentors
4. **Schedule** — tabbed Day 1 / Day 2 timeline
5. **Register** — ticket tiers, validated sign-up form, venue and contact

## Implementation notes

- **Theme** is driven by CSS custom properties — gold ramp (`--gold-0`…`--gold-3`), ink ramp
  (`--ink-0`…`--ink-4`), and glass surfaces (`--glass`, `--line`). Change the palette in one
  place at the top of the stylesheet.
- **Shutter slats** are a `repeating-linear-gradient` on `.shutter::before`, with a metallic
  sheen overlay on `::after`. The fixed `.housing` panel renders the roller drum they retract into.
- **Scroll unlock** listens for `transitionend` on `transform`, with a 1.9s `setTimeout`
  fallback in case the tab is backgrounded and the event never fires.
- **Reveals** use `threshold: 0.15` and `unobserve` after firing, so nothing re-animates on
  scroll-back. Per-element stagger comes from an inline `--d` delay.
- **Reduced motion** is respected — `prefers-reduced-motion: reduce` shortens the shutter,
  disables the reveal transforms, and turns off the decorative pulse and sheen.

## Before going live

- Replace the placeholder content: speaker names, phone numbers, ticket prices and dates are
  invented and need the real SB VJEC details.
- The registration form validates client-side and logs its payload to the console. Wire the
  `submit` handler in the script block to your backend or Google Form endpoint.

## Deploying

The page is static, so GitHub Pages works directly: repository **Settings → Pages → Deploy from
a branch → `main` / root**.

---

## 🚨 EMERGENCY RECOVERY GUIDE (Golden Backup & Restoration)

### Where the Files Were Recovered From
If another agent or command ever accidentally wipes, replaces, or rolls back `index.html`:

1. **Golden Local Backup File**:
   - Location: `backups/index.golden-backup.html`
   - This is an exact frozen copy of the complete website containing the custom retro-arcade landing page and all animations.

2. **Original Archive Source**:
   - Path: `C:\Users\abhin\Downloads\ieee-summer-school-lanyard-fixed\ieee-summer-school-main.zip`
   - Inner file: `ieee-summer-school-main/index.html` (timestamped 2026-09-17 14:56)
   - Temporary extraction cache: `.tmpbuild/zip_index.html`

### What Happened & How It Was Recovered
- **Incident**: An earlier agent attempted to fix the ID card by running a rollback/reset. This reverted `index.html` to an old state that lacked the custom landing page and injected a placeholder `warehouse-bg.png`.
- **Root-Cause Analysis**: All the custom code, the `Landingpageframe.png` / `landingpagephoneframe.png` frame bindings, the yellow CRT pixel theme, and the scroll-based `O` iris animation had been saved in the `ieee-summer-school-main.zip` archive right before the rollback.
- **Recovery Action**:
  1. Extracted `ieee-summer-school-main/index.html` from `ieee-summer-school-main.zip` into `.tmpbuild/zip_index.html`.
  2. Verified all assets, animations (`--hole-scale`), pixel fonts, and ID card components were present and intact.
  3. Overwrote the corrupted `index.html` with the recovered file.
  4. Stored a permanent copy at `backups/index.golden-backup.html`.

### How to Restore if Anything Breaks Again

#### Instant One-Line Restore (PowerShell):
```powershell
Copy-Item "backups/index.golden-backup.html" "index.html" -Force
```

#### Restore From the Original Zip Archive (PowerShell):
```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('..\ieee-summer-school-main.zip')
$entry = $zip.GetEntry('ieee-summer-school-main/index.html')
[System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, 'index.html', $true)
$zip.Dispose()
```

### Components Protected in This Golden Build
- **Arcade Cabinet Frames**: `Landingpageframe.png` (Desktop) & `landingpagephoneframe.png` (Mobile).
- **Pixel / CRT Theme**: Google Font `Press Start 2P`, scanline overlay, and yellow-black CRT screen palette.
- **VYORA '26 Title & Circular Hole**: Bold stylized `VYORA` with `26` behind and solid circular `O` hole (`.figma-hole`).
- **Scroll-Driven "O" Hole Zoom Animation**: `paintVyoraStory()` dynamically scales `--hole-scale` up to `(1 + eased * 30)` on scroll.
- **All Typography & Metadata**: Header (`IEEE VJEC SB`, `HOME ABOUT EVENTS CONTACT`, `REGISTER`), side notes (`IDEAS PEOPLE TECH A BIGGER TOMORROW`, `NOT JUST AN EVENT A MOVEMENT`), and tagline.
- **Complete ID Card & Shutter Sequence**: 3D physics-based lanyard badge, tilt, swivel snap-hook, and registration pass generation view.

