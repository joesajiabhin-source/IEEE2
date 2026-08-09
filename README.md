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
