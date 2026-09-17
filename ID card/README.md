# IEEE ID Card & Lanyard Physics Component

A self-contained, high-fidelity interactive ID Card modal with Verlet cloth rope physics, rigid-body badge pendulum dynamics, a 5-stage cinematic reveal sequence, live QR/barcode generation, and ticket download.

---

## 📁 Component Contents

```text
ID card/
├── assets/
│   ├── Id card bg.png            # Desktop badge background
│   └── id card bg(mobile).png    # Mobile badge background
├── id-card.css                   # Complete styling, animations, and keyframes
├── id-card.js                    # Self-contained physics, QR, barcode & sequencer engine
├── ticket.js                     # Cryptographic ticket signature & verification
├── index.html                    # Interactive standalone demo & test playground
└── README.md                     # This integration guide
```

---

## 🚀 How to Forward and Add to Your Other Website

Follow these 4 simple steps to integrate this component into any existing HTML/CSS/JS or framework website:

### Step 1: Copy Files to Your Website Project
Copy the `ID card/` folder into your website project directory, or copy:
- `id-card.css`
- `id-card.js`
- `assets/` folder (keep it in the same directory as `id-card.css`)

---

### Step 2: Include the CSS & JS in Your Page

In the `<head>` of your website's HTML:
```html
<link rel="stylesheet" href="path/to/ID card/id-card.css">
```

Before the closing `</body>` tag of your HTML:
```html
<script src="path/to/ID card/id-card.js"></script>
```

---

### Step 3: Paste the ID Card HTML Snippet into Your Page

Paste this modal structure right before `</body>`:

```html
<div class="id-card-overlay" id="idCardOverlay" role="dialog" aria-modal="true" aria-labelledby="idCardName" hidden>
  <!-- Ambient background bokeh -->
  <div class="id-card-bg" aria-hidden="true">
    <span class="bokeh b1"></span>
    <span class="bokeh b2"></span>
    <span class="bokeh b3"></span>
    <span class="bokeh b4"></span>
  </div>

  <!-- Stage 4 particle motes -->
  <div class="id-particles" aria-hidden="true">
    <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
  </div>

  <!-- Close button (×) -->
  <button class="id-card-close" id="idCardClose" aria-label="Close badge">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>

  <!-- STAGE 1 — INITIATE -->
  <div class="id-stage id-stage-initiate">
    <div class="id-check">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 12.5 10 18.5 20 6.5"/>
      </svg>
    </div>
    <h2 class="id-stage-title">Registration Confirmed</h2>
    <p class="id-stage-sub">Preparing your event ID card…</p>
  </div>

  <!-- STAGE 2 — GENERATE (Wireframe Hologram) -->
  <div class="id-stage id-stage-generate">
    <div class="id-wireframe">
      <div class="id-wire-logo">
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M16 2 30 16 16 30 2 16Z" opacity=".25"/>
          <path d="M16 2 30 16 16 30 2 16Z"/>
          <circle cx="16" cy="16" r="4"/>
        </svg>
        <span>IEEE</span>
      </div>
      <div class="id-wire-lines">
        <span class="wire-l w1"></span>
        <span class="wire-l w2"></span>
        <span class="wire-l w3"></span>
      </div>
      <div class="id-wire-beam" aria-hidden="true"></div>
      <div class="id-wire-grid" aria-hidden="true"></div>
      <div class="id-wire-corners" aria-hidden="true">
        <span class="c-tl"></span><span class="c-tr"></span>
        <span class="c-bl"></span><span class="c-br"></span>
      </div>
    </div>
    <h2 class="id-stage-title">Minting Credentials…</h2>
    <p class="id-stage-sub">Generating cryptographic barcode & ticket signature</p>
  </div>

  <!-- STAGE 3, 4, 5 — LANYARD SVG ROPE & BADGE -->
  <div id="idCardWrapper">
    <div class="id-card-lanyard" id="idCardLanyard" aria-hidden="true">
      <svg class="ly-svg" id="lySvg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="lyChrome" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stop-color="#5f6367"/>
            <stop offset="20%"  stop-color="#9aa0a5"/>
            <stop offset="40%"  stop-color="#d9dee2"/>
            <stop offset="50%"  stop-color="#f4f7f9"/>
            <stop offset="60%"  stop-color="#d9dee2"/>
            <stop offset="80%"  stop-color="#9aa0a5"/>
            <stop offset="100%" stop-color="#5f6367"/>
          </linearGradient>
          <filter id="lyMetal" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity=".5"/>
          </filter>
        </defs>
        <circle class="ly-ring-arc" id="lyRingBackC" r="9"/>
        <g id="lyStrands">
          <path class="ly-s" id="lyStrandLEdge"   stroke-width="24"/>
          <path class="ly-s" id="lyStrandREdge"   stroke-width="24"/>
          <path class="ly-s" id="lyStrandLMid"    stroke-width="19"/>
          <path class="ly-s" id="lyStrandRMid"    stroke-width="19"/>
          <path class="ly-s" id="lyStrandLCore"   stroke-width="13"/>
          <path class="ly-s" id="lyStrandRCore"   stroke-width="13"/>
          <path class="ly-s" id="lyStrandLSheen"  stroke-width="3"/>
          <path class="ly-s" id="lyStrandRSheen"  stroke-width="3"/>
          <path class="ly-s" id="lyStrandLStitch" stroke-width="1.25"/>
          <path class="ly-s" id="lyStrandRStitch" stroke-width="1.25"/>
        </g>
        <path class="ly-ring-arc" id="lyRingFrontC" d="M9,0 A9,9 0 0 1 -9,0"/>
        <g id="lyHookG">
          <line class="ly-hook" x1="0" y1="-15.5" x2="0" y2="-8" stroke-width="2.4"/>
          <rect class="ly-hook-fill" x="-3" y="-8" width="6" height="7.6" rx="1.8"/>
          <path class="ly-hook" d="M-2.1,-0.6 v4.6 a2.6,2.6 0 1 0 2.6,-2.6" stroke-width="2.2"/>
        </g>
      </svg>
    </div>

    <div class="id-card-container" id="idCardContainer">
      <div class="id-card-swing" id="idCardSwing">
        <article class="id-card" id="idCard">
          <header class="id-card-header">
            <div class="id-card-brandblock">
              <div class="id-card-logo" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                  <path d="M16 2 30 16 16 30 2 16Z" fill="currentColor" opacity=".18"/>
                  <path d="M16 2 30 16 16 30 2 16Z" stroke="currentColor" stroke-width="1.6"/>
                  <circle cx="16" cy="16" r="4" fill="currentColor"/>
                </svg>
              </div>
              <div class="id-card-brandtext">
                <span class="id-card-brand">IEEE</span>
                <span class="id-card-brandsub">VJEC</span>
              </div>
            </div>
            <div class="id-card-eventtag">
              Summer<br>School<br>2026
            </div>
          </header>
          <h2 class="id-card-tagline">
            Build. Learn.<br>Innovate.
            <span class="id-card-role" id="idCardRole">Event Participant</span>
          </h2>
          <div class="id-card-avatar" id="idCardAvatar">
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="18" r="8" fill="currentColor"/>
              <ellipse cx="24" cy="41" rx="14" ry="12" fill="currentColor"/>
            </svg>
          </div>
          <h3 class="id-card-name" id="idCardName">—</h3>
          <span class="id-card-subrole" id="idCardSubrole">Participant</span>
          <div class="id-card-meta">
            <span class="id-card-chip" id="idCardTrack">—</span>
            <span class="id-card-chip" id="idCardTicket">—</span>
          </div>
          <div class="id-card-codes">
            <div class="id-card-qr" id="idCardQr" aria-label="Participant QR code" role="img"></div>
            <div class="id-card-codestack">
              <div class="id-card-barcode" id="idCardBarcode"></div>
              <div class="id-card-id" id="idCardRegId">—</div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>

  <!-- STAGE 5 Actions -->
  <div class="id-card-actions">
    <button class="btn btn-gold" id="downloadQrBtn" type="button">⬇&nbsp; Download Ticket</button>
    <p class="id-card-hint">Show this badge at the registration desk.</p>
  </div>
</div>
```

---

### Step 4: Initialize and Trigger the Animation

In your custom JavaScript (e.g., when a registration form is submitted):

```javascript
// 1. Instantiate the controller once:
const idCardController = new IDCard.Controller();

// 2. When you want to trigger the animation:
idCardController.runSequence({
  name: "Attendee Name",
  track: "Workshop Track",
  is_ieee_member: "Yes" // or "No"
});
```

---

## 🎮 JavaScript API

| Method | Description |
|---|---|
| `controller.runSequence(participantData)` | Launches the complete 5-stage reveal animation. |
| `controller.populateCard(participantData)` | Fills in the card details, signs ticket, and generates QR & barcode without playing sequence. |
| `controller.setStage(stageName)` | Sets current reveal stage (`stage-initiate`, `stage-generate`, `stage-reveal`, `stage-enhance`, `stage-complete`). |
| `controller.close()` | Closes the modal and resets simulation state. |
| `controller.lanyard.strike(x, y, fx, fy, torque)` | Applies an impulse slap/strike to the lanyard badge physics. |

---

## 🧪 Testing Locally
Simply double-click or open `ID card/index.html` in any web browser to preview and test the complete physics and sequence!
