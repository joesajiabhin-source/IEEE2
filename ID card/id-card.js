/**
 * IEEE ID CARD COMPONENT — COMPLETE CORE JAVASCRIPT
 *
 * Includes:
 *  1. QR Engine (Self-contained GF(256) Byte-mode QR Code generator)
 *  2. Code128 Barcode Engine (Canvas renderer)
 *  3. Ticket Engine (SHA-256 / FNV cryptographic signed ticket generator)
 *  4. Lanyard Physics Engine (Verlet cloth rope + rigid body pendulum coupling)
 *  5. IDCardController (5-Stage Cinematic Reveal Orchestrator)
 */

(function (global) {
  'use strict';

  /* ==========================================================
     1. QR CODE ENGINE — self-contained byte-mode encoder (ECC M)
     GF(256), primitive polynomial 0x11d. Versions 1-10 supported.
     ========================================================== */
  const QR = (() => {
    const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    for (let i = 0, x = 1; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

    const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

    function rsPoly(deg) {
      let poly = [1];
      for (let i = 0; i < deg; i++) {
        const next = new Array(poly.length + 1).fill(0);
        for (let j = 0; j < poly.length; j++) {
          next[j]     ^= poly[j];
          next[j + 1] ^= mul(poly[j], EXP[i]);
        }
        poly = next;
      }
      return poly;
    }

    function rsEncode(data, ecLen) {
      const gen = rsPoly(ecLen);
      const res = new Array(ecLen).fill(0);
      for (const byte of data) {
        const factor = byte ^ res[0];
        res.shift(); res.push(0);
        for (let i = 0; i < ecLen; i++) res[i] ^= mul(gen[i + 1], factor);
      }
      return res;
    }

    const SPEC = [
      null,
      [10, 1, 16, 0,  0], [16, 1, 28, 0,  0], [26, 1, 44, 0,  0],
      [18, 2, 32, 0,  0], [24, 2, 43, 0,  0], [16, 4, 27, 0,  0],
      [18, 4, 31, 0,  0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37],
      [26, 4, 43, 1, 44],
    ];
    const ALIGN = [
      null, [], [6, 18], [6, 22], [6, 26], [6, 30],
      [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
    ];
    const capacity = v => SPEC[v][1] * SPEC[v][2] + SPEC[v][3] * SPEC[v][4];

    function buildCodewords(bytes, version) {
      const total = capacity(version);
      const bits  = [];
      const push  = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };

      push(0b0100, 4);                                   // byte mode
      push(bytes.length, version < 10 ? 8 : 16);         // char count
      for (const b of bytes) push(b, 8);

      for (let i = 0; i < 4 && bits.length < total * 8; i++) bits.push(0);
      while (bits.length % 8) bits.push(0);

      const cw = [];
      for (let i = 0; i < bits.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
        cw.push(byte);
      }
      const PAD = [0xec, 0x11];
      for (let i = 0; cw.length < total; i++) cw.push(PAD[i % 2]);
      return cw;
    }

    function interleave(cw, version) {
      const [ecLen, b1, d1, b2, d2] = SPEC[version];
      const blocks = [], eccs = [];
      let pos = 0;
      for (let i = 0; i < b1 + b2; i++) {
        const len = i < b1 ? d1 : d2;
        const block = cw.slice(pos, pos + len);
        pos += len;
        blocks.push(block);
        eccs.push(rsEncode(block, ecLen));
      }
      const out = [];
      const maxData = Math.max(d1, d2);
      for (let i = 0; i < maxData; i++)
        for (const b of blocks) if (i < b.length) out.push(b[i]);
      for (let i = 0; i < ecLen; i++)
        for (const e of eccs) out.push(e[i]);
      return out;
    }

    function buildMatrix(version, codewords) {
      const size = version * 4 + 17;
      const mod  = Array.from({length: size}, () => new Array(size).fill(null));
      const res  = Array.from({length: size}, () => new Array(size).fill(false));

      const setF = (r, c, v) => { mod[r][c] = v; res[r][c] = true; };

      const finder = (row, col) => {
        for (let r = -1; r <= 7; r++)
          for (let c = -1; c <= 7; c++) {
            const rr = row + r, cc = col + c;
            if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
            const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                           (c >= 0 && c <= 6 && (r === 0 || r === 6));
            const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            setF(rr, cc, inRing || inCore);
          }
      };
      finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

      for (let i = 8; i < size - 8; i++) {
        setF(6, i, i % 2 === 0);
        setF(i, 6, i % 2 === 0);
      }

      const centers = ALIGN[version];
      for (const r of centers)
        for (const c of centers) {
          if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;
          for (let dr = -2; dr <= 2; dr++)
            for (let dc = -2; dc <= 2; dc++)
              setF(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }

      setF(size - 8, 8, true);

      for (let i = 0; i < 9; i++) {
        if (!res[8][i])        { res[8][i] = true; mod[8][i] = false; }
        if (!res[i][8])        { res[i][8] = true; mod[i][8] = false; }
      }
      for (let i = 0; i < 8; i++) {
        if (!res[8][size - 1 - i]) { res[8][size - 1 - i] = true; mod[8][size - 1 - i] = false; }
        if (!res[size - 1 - i][8]) { res[size - 1 - i][8] = true; mod[size - 1 - i][8] = false; }
      }
      if (version >= 7) {
        for (let i = 0; i < 6; i++)
          for (let j = 0; j < 3; j++) {
            res[size - 11 + j][i] = true; mod[size - 11 + j][i] = false;
            res[i][size - 11 + j] = true; mod[i][size - 11 + j] = false;
          }
      }

      let bitIdx = 0, dir = -1, row = size - 1;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        for (;;) {
          for (let i = 0; i < 2; i++) {
            const c = col - i;
            if (!res[row][c]) {
              const byte = codewords[bitIdx >> 3];
              const bit  = byte === undefined ? 0 : (byte >> (7 - (bitIdx & 7))) & 1;
              mod[row][c] = bit === 1;
              bitIdx++;
            }
          }
          row += dir;
          if (row < 0 || row >= size) { row -= dir; dir = -dir; break; }
        }
      }
      return { mod, res, size };
    }

    const MASKS = [
      (r, c) => (r + c) % 2 === 0,
      (r, c) => r % 2 === 0,
      (r, c) => c % 3 === 0,
      (r, c) => (r + c) % 3 === 0,
      (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
      (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
      (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
      (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
    ];

    function formatBits(mask) {
      let data = (0b00 << 3) | mask;
      let rem  = data;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
      return ((data << 10) | rem) ^ 0x5412;
    }
    function versionBits(v) {
      let rem = v;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
      return (v << 12) | rem;
    }

    function applyMaskAndFormat(m, maskIdx) {
      const { mod, res, size } = m;
      const grid = mod.map(r => r.slice());
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (!res[r][c] && MASKS[maskIdx](r, c)) grid[r][c] = !grid[r][c];

      const fmt = formatBits(maskIdx);
      for (let i = 0; i < 15; i++) {
        const bit = ((fmt >> i) & 1) === 1;
        if (i < 6)       grid[i][8] = bit;
        else if (i < 8)  grid[i + 1][8] = bit;
        else if (i === 8) grid[8][7] = bit;
        else              grid[8][14 - i] = bit;

        if (i < 8)       grid[8][size - 1 - i] = bit;
        else             grid[size - 15 + i][8] = bit;
      }
      return grid;
    }

    function penalty(grid, size) {
      let score = 0;
      for (let i = 0; i < size; i++) {
        for (const isRow of [true, false]) {
          let run = 1;
          for (let j = 1; j < size; j++) {
            const a = isRow ? grid[i][j]     : grid[j][i];
            const b = isRow ? grid[i][j - 1] : grid[j - 1][i];
            if (a === b) run++;
            else { if (run >= 5) score += run - 2; run = 1; }
          }
          if (run >= 5) score += run - 2;
        }
      }
      for (let r = 0; r < size - 1; r++)
        for (let c = 0; c < size - 1; c++) {
          const v = grid[r][c];
          if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
        }
      const P1 = [true,false,true,true,true,false,true,false,false,false,false];
      const P2 = [false,false,false,false,true,false,true,true,true,false,true];
      const match = (arr, pat) => pat.every((p, k) => arr[k] === p);
      for (let i = 0; i < size; i++)
        for (let j = 0; j <= size - 11; j++) {
          const rowSeg = [], colSeg = [];
          for (let k = 0; k < 11; k++) { rowSeg.push(grid[i][j + k]); colSeg.push(grid[j + k][i]); }
          if (match(rowSeg, P1) || match(rowSeg, P2)) score += 40;
          if (match(colSeg, P1) || match(colSeg, P2)) score += 40;
        }
      let dark = 0;
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c]) dark++;
      const pct = (dark * 100) / (size * size);
      score += Math.floor(Math.abs(pct - 50) / 5) * 10;
      return score;
    }

    function encode(text) {
      const bytes = Array.from(new TextEncoder().encode(text));
      let version = 0;
      for (let v = 1; v <= 10; v++) {
        const overhead = 4 + (v < 10 ? 8 : 16);
        if (bytes.length * 8 + overhead <= capacity(v) * 8) { version = v; break; }
      }
      if (!version) throw new Error('QR payload too long');

      const cw = interleave(buildCodewords(bytes, version), version);
      const m  = buildMatrix(version, cw);

      if (version >= 7) {
        const vb = versionBits(version);
        for (let i = 0; i < 18; i++) {
          const bit = ((vb >> i) & 1) === 1;
          const r = Math.floor(i / 3), c = i % 3;
          m.mod[m.size - 11 + c][r] = bit;
          m.mod[r][m.size - 11 + c] = bit;
        }
      }

      let best = null, bestScore = Infinity;
      for (let mask = 0; mask < 8; mask++) {
        const grid = applyMaskAndFormat(m, mask);
        const s = penalty(grid, m.size);
        if (s < bestScore) { bestScore = s; best = grid; }
      }
      return best;
    }

    function render(el, text) {
      const grid = encode(text);
      const n = grid.length;
      const quiet = 2;
      const px = 4;
      const dim = (n + quiet * 2) * px;

      const cv = document.createElement('canvas');
      cv.width = cv.height = dim;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, dim, dim);
      ctx.fillStyle = '#000000';
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (grid[r][c]) ctx.fillRect((c + quiet) * px, (r + quiet) * px, px, px);

      el.textContent = '';
      el.appendChild(cv);
    }

    return { encode, render };
  })();

  /* ==========================================================
     2. CODE 128 (Subset B) BARCODE ENGINE
     ========================================================== */
  const Code128 = (() => {
    const PATTERNS = [
      '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
      '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
      '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
      '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
      '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
      '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
      '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
      '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
      '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
      '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
      '114131','311141','411131','211412','211214','211232','2331112',
    ];
    const START_B = 104, STOP = 106;

    function render(el, text) {
      if (!el) return;
      const values = [START_B];
      for (const ch of text) {
        const v = ch.charCodeAt(0) - 32;
        values.push(v >= 0 && v < 95 ? v : 0);
      }
      let sum = START_B;
      for (let i = 1; i < values.length; i++) sum += values[i] * i;
      values.push(sum % 103, STOP);

      const bars = [];
      for (const v of values) {
        const pat = PATTERNS[v];
        for (let i = 0; i < pat.length; i++) bars.push({ w: +pat[i], dark: i % 2 === 0 });
      }
      const totalUnits = bars.reduce((a, b) => a + b.w, 0);

      const unit = 2, height = 80, quiet = 10;
      const cv = document.createElement('canvas');
      cv.width  = (totalUnits + quiet * 2) * unit;
      cv.height = height;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#000000';
      let x = quiet * unit;
      for (const b of bars) {
        if (b.dark) ctx.fillRect(x, 0, b.w * unit, height);
        x += b.w * unit;
      }
      el.textContent = '';
      el.appendChild(cv);
    }

    return { render };
  })();

  /* ==========================================================
     3. TICKET SIGNING & VERIFICATION ENGINE
     ========================================================== */
  const Ticket = (() => {
    const SECRET = 'vjec-ieee-ss26-ticket-v1';
    const TRACKS = [
      'Applied Machine Learning',
      'Embedded & IoT Systems',
      'Modern Web Engineering',
      'Cybersecurity Foundations',
      'Robotics & Control'
    ];

    const b64uEnc = str => btoa(String.fromCharCode(...new TextEncoder().encode(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const b64uDec = str => {
      const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
      return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
    };

    async function sha256Hex(str) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function fnvHex(str) {
      let h1 = 0x811c9dc5, h2 = 0x01000193;
      for (let i = 0; i < str.length; i++) {
        h1 ^= str.charCodeAt(i); h1 = Math.imul(h1, 16777619) >>> 0;
        h2 = Math.imul(h2 ^ str.charCodeAt(str.length - 1 - i), 2246822519) >>> 0;
      }
      return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0'));
    }

    async function makeSig(canonical) {
      if (window.crypto && crypto.subtle) return { a: 'h', s: (await sha256Hex(SECRET + canonical)).slice(0, 16) };
      return { a: 'f', s: fnvHex(SECRET + canonical) };
    }

    async function issue({ name, regId, track, isMember }) {
      const tIdx = Math.max(0, TRACKS.indexOf(track));
      const suffix = String(regId || '').replace(/^IEEE2026VJEC/, '');
      const t = { n: String(name).slice(0, 40), r: suffix, t: tIdx, m: isMember ? 1 : 0, ts: Math.floor(Date.now() / 1000) };
      const canonical = ['IEEE-SS26', t.r, t.n, t.t, t.m, t.ts].join('|');
      const sig = await makeSig(canonical);
      const payload = b64uEnc(JSON.stringify({ ...t, ...sig }));
      return new URL('check.html', location.href).href + '?d=' + payload;
    }

    return { TRACKS, issue };
  })();

  /* ==========================================================
     4. ID-CARD LANYARD PHYSICS ENGINE
     Verlet cloth rope + rigid body pendulum coupling
     ========================================================== */
  function createLanyardEngine(options = {}) {
    const PHYSICS = {
      gravity: options.gravity || 2600,
      mass: options.mass || 14,
      stiffness: options.stiffness || 30,
      damping: options.damping || 3.35,
      friction: options.friction || 0.978,
      maxAngle: options.maxAngle || 0.9,
      impulseStrength: options.impulseStrength || 420,
      hoverForce: options.hoverForce || 32,
      idleForce: options.idleForce || 1.6
    };

    const PEND_LEN = 16;
    const ITER = 5;
    const SUB = 1 / 90;
    const NPT = 6;
    const AY_OFF = -8;

    let idCardSwing = null;
    let idCardContainer = null;
    let idCardOverlay = null;
    let lySvg = null;
    let strandEls = [];

    let W = 0, H = 0;
    let axL = 0, axR = 0;
    let ptsL = [], ptsR = [];
    let segLens = { L: 0, R: 0 };
    let tip = null;
    let started = false;
    let fresh = false;
    let acc = 0, last = performance.now();
    let winDX = 0;
    let windX = 0;
    let shakeVX = 0;
    let swingAng = 0, swingVel = 0;
    let hover = null;
    let hoverVX = 0;
    let hoverDef = 0;
    let idleTime = 0;
    let tiltTarget = 0;
    let arrivalY = 0, arrivalV = 0;
    let retracted = false;
    let rest = { x: 0, top: 0, h: 0, w: 0 };
    let restX = 0, restTop = 0;

    // Real mobile phone physics state
    let phoneTiltRad = 0;      // Physical roll angle in radians (from gamma)
    let phoneTiltPitch = 0;    // Physical pitch angle in degrees (from beta - 55)
    let phoneLinearAccelX = 0; // Dynamic horizontal acceleration impulse from devicemotion
    let phoneLinearAccelY = 0; // Dynamic vertical acceleration impulse
    let hasMobileSensors = false; // Flag indicating device orientation/motion active

    const makePt = (x, y, m) => ({ x, y, px: x, py: y, m });

    function initDom(refs) {
      idCardSwing = refs.idCardSwing;
      idCardContainer = refs.idCardContainer;
      idCardOverlay = refs.idCardOverlay;
      lySvg = refs.lySvg;
      strandEls = refs.strandEls || [];
    }

    function measureRest() {
      if (!idCardSwing) return { x: innerWidth / 2, top: innerHeight / 2 - 200, w: 240, h: 320 };
      const swingCS = idCardSwing.style.transform;
      const contAnim = idCardContainer ? idCardContainer.style.animation : '';
      const contTrans = idCardContainer ? idCardContainer.style.transform : '';

      idCardSwing.style.transform = 'none';
      if (idCardContainer) {
        idCardContainer.style.animation = 'none';
        idCardContainer.style.transform = 'translateY(0)';
      }
      const rect = idCardSwing.getBoundingClientRect();
      if (idCardContainer) {
        idCardContainer.style.transform = contTrans;
        idCardContainer.style.animation = contAnim;
      }
      idCardSwing.style.transform = swingCS;
      return { x: rect.left + rect.width / 2, top: rect.top, h: rect.height, w: rect.width };
    }

    function build() {
      W = innerWidth; H = innerHeight;
      axL = W / 2 - 46; axR = W / 2 + 46;
      rest = measureRest();
      restX = rest.x;
      restTop = rest.top;
      const ty = rest.top - PEND_LEN;
      tip = makePt(W / 2 + winDX, ty, PHYSICS.mass);
      ptsL = [makePt(axL + winDX, AY_OFF, 1)];
      ptsR = [makePt(axR + winDX, AY_OFF, 1)];
      segLens.L = Math.hypot(tip.x - ptsL[0].x, tip.y - ptsL[0].y) / (NPT - 1);
      segLens.R = Math.hypot(tip.x - ptsR[0].x, tip.y - ptsR[0].y) / (NPT - 1);

      for (let i = 1; i < NPT - 1; i++) {
        const t = i / (NPT - 1);
        ptsL.push(makePt(ptsL[0].x + (tip.x - ptsL[0].x) * t, ptsL[0].y + (tip.y - ptsL[0].y) * t, 1));
        ptsR.push(makePt(ptsR[0].x + (tip.x - ptsR[0].x) * t, ptsR[0].y + (tip.y - ptsR[0].y) * t, 1));
      }
      ptsL.push(tip); ptsR.push(tip);

      if (fresh) {
        fresh = false;
        arrivalY = -(rest.top + (rest.h || 320) + 36);
        arrivalV = 0;
      }
    }

    function pushPointer(dx) {
      if (!started) return;
      windX = Math.max(-28, Math.min(28, windX + dx * 0.008));
    }

    function hoverMove(px, py, vx) {
      if (!started) return;
      hover = { px, py };
      hoverVX += (Math.max(-1200, Math.min(1200, vx || 0)) - hoverVX) * 0.055;
    }

    function hoverEnd() {
      hover = null; hoverVX = 0;
    }

    function strike(px, py, vx, vy, force = 1) {
      if (!started || !tip) return;
      const half = Math.max(80, (rest.w || 240) * 0.5);
      const hitX = Math.max(-1, Math.min(1, (px - tip.x) / half));
      const topY = tip.y + PEND_LEN;
      const lever = Math.max(0.16, Math.min(1, (py - topY) / Math.max(100, rest.h || 320)));
      const speed = Math.min(2600, Math.hypot(vx || 0, vy || 0));
      const direction = Math.abs(vx || 0) > 90 ? Math.sign(vx) : (Math.sign(hitX) || 1);
      const energy = PHYSICS.impulseStrength * force * (1 + speed / 1200);
      const kick = Math.min(1050, energy) * direction;

      tip.px -= kick * SUB * 0.9;
      tip.py += Math.min(180, Math.abs(vy || 0) * 0.11) * SUB;
      windX = Math.max(-125, Math.min(125, windX + kick * 0.12));
      swingVel = Math.max(-2.2, Math.min(2.2,
        swingVel + direction * (0.34 + lever * 0.62) * force + hitX * 0.18));
    }

    function deviceTilt(gamma, beta) {
      if (!started) return;
      hasMobileSensors = true;
      if (gamma != null) {
        // Natural, stable roll limit: +/- 26 deg (prevents card flying sideways)
        const clampedGamma = Math.max(-26, Math.min(26, gamma));
        const targetRad = (clampedGamma * Math.PI) / 180;
        // Heavy low-pass filter: 0.08 smoothing eliminates jitters and twitches
        phoneTiltRad += (targetRad - phoneTiltRad) * 0.08;
        // Gentle anchor follow-through
        tiltTarget = -clampedGamma * 0.45;
      }
      if (beta != null) {
        // Nominal hand reading pitch is ~55 deg, clamped gently
        const targetPitch = Math.max(-25, Math.min(25, beta - 55));
        phoneTiltPitch += (targetPitch - phoneTiltPitch) * 0.08;
      }
    }

    function deviceMotion(ax, ay, az) {
      if (!started) return;
      hasMobileSensors = true;
      if (ax != null) {
        // Deadband filter: ignore resting hand tremor and micro-jitters below 1.2 m/s^2
        const absAX = Math.abs(ax);
        let dynAX = 0;
        if (absAX > 1.2) {
          dynAX = Math.sign(ax) * Math.min(8, absAX - 1.2);
        }
        // Scaled to gentle, realistic impulse (12 instead of 110) with smooth damping
        phoneLinearAccelX += (-dynAX * 12 - phoneLinearAccelX) * 0.12;
        shakeVX += -dynAX * 1.2;
      }
      if (ay != null) {
        const absAY = Math.abs(ay);
        let dynAY = 0;
        if (absAY > 1.2) {
          dynAY = Math.sign(ay) * Math.min(6, absAY - 1.2);
        }
        phoneLinearAccelY += (-dynAY * 8 - phoneLinearAccelY) * 0.12;
      }
    }

    function motion(gx) {
      if (!started) return;
      const lean = Math.max(-1, Math.min(1, gx / 9.81));
      deviceTilt(lean * 45, 55);
    }

    function relax(pts, seg) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const diff = (d - seg) / d * 0.5;
        dx *= diff; dy *= diff;
        if (i === 0) {
          b.x -= dx * 2; b.y -= dy * 2;
        } else {
          const ma = a.m, mb = b.m, tot = ma + mb;
          a.x += dx * 2 * (mb / tot); a.y += dy * 2 * (mb / tot);
          b.x -= dx * 2 * (ma / tot); b.y -= dy * 2 * (ma / tot);
        }
      }
    }

    function step(dt) {
      const axLc = axL + winDX, axRc = axR + winDX;
      ptsL[0].x = axLc; ptsL[0].y = AY_OFF;
      ptsR[0].x = axRc; ptsR[0].y = AY_OFF;

      // Real gravity vector rotated by phone tilt angle + dynamic inertial acceleration
      const totalGravity = PHYSICS.gravity;
      const gx = Math.sin(phoneTiltRad) * totalGravity + phoneLinearAccelX;
      const gy = Math.cos(phoneTiltRad) * totalGravity + phoneLinearAccelY;

      phoneLinearAccelX *= Math.exp(-dt * 5.5);
      phoneLinearAccelY *= Math.exp(-dt * 5.5);

      const wind = windX * dt * dt;
      for (const pts of [ptsL, ptsR]) {
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i];
          const vx = (p.x - p.px) * PHYSICS.friction;
          const vy = (p.y - p.py) * PHYSICS.friction;
          p.px = p.x; p.py = p.y;
          p.x += vx + wind / p.m + (gx / p.m) * dt * dt;
          p.y += vy + (gy / p.m) * dt * dt;
        }
      }

      if (shakeVX) {
        const kick = shakeVX * dt;
        for (const pts of [ptsL, ptsR]) {
          for (let i = 1; i < pts.length - 1; i++) {
            pts[i].px -= kick * (0.4 + 0.6 * i / pts.length) * 0.5;
          }
        }
        tip.px -= kick * 0.5;
        shakeVX *= Math.exp(-dt * 6);
        if (Math.abs(shakeVX) < 2) shakeVX = 0;
      }

      for (let k = 0; k < ITER; k++) {
        relax(ptsL, segLens.L);
        relax(ptsR, segLens.R);
      }
      windX *= Math.exp(-dt * 2.2);
      if (Math.abs(windX) < 0.05) windX = 0;
      winDX += (tiltTarget - winDX) * (1 - Math.exp(-dt * 3.4));

      const arrivalTarget = retracted ? -(rest.top + (rest.h || 320) + 36) : 0;
      const arrivalA = (arrivalTarget - arrivalY) * 24 - arrivalV * 8;
      arrivalV += arrivalA * dt;
      arrivalY += arrivalV * dt;
      if (!retracted && arrivalY > 0) { arrivalY = 0; arrivalV *= -0.12; }

      if (hover && tip) {
        const half = Math.max(80, (rest.w || 240) * 0.5);
        const off  = Math.max(-1, Math.min(1, (hover.px - tip.x) / half));
        const topY = tip.y + PEND_LEN;
        const lev  = Math.max(0.15, Math.min(1, (hover.py - topY) / Math.max(120, rest.h || 320)));
        const velocityBoost = 1 + Math.min(0.38, Math.abs(hoverVX) / 1800);
        hoverDef += (off * PHYSICS.hoverForce * lev * velocityBoost - hoverDef) * (1 - Math.exp(-dt * 4.5));
      } else {
        hoverDef *= Math.exp(-dt * 7);
        if (Math.abs(hoverDef) < 0.02) hoverDef = 0;
      }
      if (hoverDef && tip) {
        tip.x += hoverDef * 90 * dt * dt;
      }

      idleTime += dt;
      if (!hover && Math.abs(windX) < 8 && Math.abs(shakeVX) < 8) {
        const idle = (Math.sin(idleTime * 0.73) + Math.sin(idleTime * 1.19 + 0.8) * 0.36) * PHYSICS.idleForce;
        tip.x += idle * dt * dt;
      }

      let hoverTorque = 0;
      if (hover && tip) {
        const half = Math.max(80, (rest.w || 240) * 0.5);
        const off  = Math.max(-1, Math.min(1, (hover.px - tip.x) / half));
        const topY = tip.y + PEND_LEN;
        const lev  = Math.max(0.15, Math.min(1, (hover.py - topY) / Math.max(120, rest.h || 320)));
        hoverTorque = off * 2.7 * lev * (1 + Math.min(0.20, Math.abs(hoverVX) / 1800));
      }
      // Gravitational pendulum restoring torque:
      // In the tilted reference frame, resting vertical is phoneTiltRad!
      const angularDiff = swingAng - phoneTiltRad;
      const restoringTorque = -Math.sin(angularDiff) * PHYSICS.stiffness;
      const inertialTorque = (phoneLinearAccelX / PHYSICS.mass) * 0.05;
      const a = restoringTorque - PHYSICS.damping * swingVel + hoverTorque + inertialTorque;
      swingVel += a * dt;
      swingAng += swingVel * dt;

      if (swingAng > PHYSICS.maxAngle)  { swingAng = PHYSICS.maxAngle;  if (swingVel > 0) swingVel *= -0.16; }
      if (swingAng < -PHYSICS.maxAngle) { swingAng = -PHYSICS.maxAngle; if (swingVel < 0) swingVel *= -0.16; }
    }

    function catmull(pts) {
      const P = [pts[0], ...pts, pts[pts.length - 1]];
      let d = 'M' + P[1].x.toFixed(2) + ',' + P[1].y.toFixed(2);
      for (let i = 1; i < P.length - 2; i++) {
        const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
        const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        d += 'C' + c1x.toFixed(2) + ',' + c1y.toFixed(2) + ' ' +
              c2x.toFixed(2) + ',' + c2y.toFixed(2) + ' ' +
              p2.x.toFixed(2) + ',' + p2.y.toFixed(2);
      }
      return d;
    }

    function visualPoints(pts) {
      const lastIndex = pts.length - 1;
      return pts.map((p, i) => ({ x: p.x, y: p.y + arrivalY * (i / lastIndex) }));
    }

    function paint() {
      if (!lySvg) return;
      const viewL = visualPoints(ptsL), viewR = visualPoints(ptsR);
      const dL = catmull(viewL), dR = catmull(viewR);
      const order = [dL, dR, dL, dR, dL, dR, dL, dR, dL, dR];
      for (let i = 0; i < strandEls.length; i++) {
        if (strandEls[i]) strandEls[i].setAttribute('d', order[i]);
      }

      const visualTipY = tip.y + arrivalY;
      const t = 'translate(' + tip.x.toFixed(2) + ' ' + visualTipY.toFixed(2) + ')';
      const rb = document.getElementById('lyRingBackC');
      const rf = document.getElementById('lyRingFrontC');
      if (rb) rb.setAttribute('transform', t);
      if (rf) rf.setAttribute('transform', t);

      const hg = document.getElementById('lyHookG');
      if (hg) {
        const nx = tip.x + Math.sin(swingAng) * PEND_LEN;
        const ny = visualTipY + Math.cos(swingAng) * PEND_LEN;
        hg.setAttribute('transform',
          'translate(' + nx.toFixed(2) + ' ' + ny.toFixed(2) + ') rotate(' +
          (swingAng * 180 / Math.PI).toFixed(2) + ')');
      }
    }

    function driveCard() {
      if (!idCardSwing || !tip) return;
      const dx = tip.x - restX;
      // Hole offset 35px down puts the hook clasp directly inside the punch slot
      const HOLE_OFFSET = 35;
      const dy = tip.y + arrivalY - (restTop - PEND_LEN + HOLE_OFFSET);
      const ang = swingAng * 180 / Math.PI;
      idCardSwing.style.transform =
        'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) ' +
        'rotate(' + ang.toFixed(3) + 'deg)';

      // On mobile devices, apply real-time holographic 3D perspective tilt when not actively hovered/dragged
      const cardEl = document.getElementById('idCard');
      if (cardEl && hasMobileSensors && !hover) {
        const tiltDeg = (phoneTiltRad * 180 / Math.PI);
        const rotY = Math.max(-9, Math.min(9, tiltDeg * 0.22));
        const rotX = Math.max(-7, Math.min(7, phoneTiltPitch * 0.18));
        cardEl.style.transform =
          'perspective(800px) rotateY(' + rotY.toFixed(2) + 'deg) rotateX(' + rotX.toFixed(2) + 'deg)';
      }
    }

    function frame(now) {
      if (!idCardOverlay) return;
      const stage = idCardOverlay.classList;
      const revealed = stage.contains('stage-reveal') ||
                       stage.contains('stage-enhance') ||
                       stage.contains('stage-complete');
      const active = revealed && idCardOverlay.classList.contains('open');

      let dt = (now - last) / 1000; last = now;
      dt = Math.min(Math.max(dt || 0.016, 0.001), 0.05);

      if (active) {
        if (!started) { started = true; fresh = true; build(); }
        if (Math.abs(innerWidth - W) > 2 || Math.abs(innerHeight - H) > 2) build();

        acc += dt;
        let guard = 0;
        while (acc >= SUB && guard++ < 6) { step(SUB); acc -= SUB; }
        paint();
        driveCard();
      } else if (started) {
        started = false; acc = 0;
        swingAng = 0; swingVel = 0; windX = 0; shakeVX = 0; winDX = 0;
        hover = null; hoverVX = 0; hoverDef = 0; idleTime = 0;
        if (idCardSwing) idCardSwing.style.transform = '';
      }
      requestAnimationFrame(frame);
    }

    return {
      initDom,
      startLoop() { requestAnimationFrame(frame); },
      pushPointer, hoverMove, hoverEnd, strike, motion, deviceTilt, deviceMotion,
      setRetracted(val) { retracted = !!val; },
      replayDrop() { retracted = false; arrivalY = -(rest.top + (rest.h || 320) + 36); arrivalV = 0; },
      cardGeom() {
        if (!tip || !started) return null;
        const HOLE_OFFSET = 35;
        return { cx: tip.x, top: tip.y + arrivalY + PEND_LEN - HOLE_OFFSET, w: rest.w || 300, h: rest.h || 450 };
      },
      isStarted: () => started,
      physics: PHYSICS
    };
  }

  /* ==========================================================
     5. ID CARD CONTROLLER
     Orchestrates the 5-Stage Cinematic Reveal Sequence
     ========================================================== */
  class IDCardController {
    constructor(customRefs = {}) {
      this.refs = {
        overlay: document.getElementById('idCardOverlay'),
        closeBtn: document.getElementById('idCardClose'),
        name: document.getElementById('idCardName'),
        subrole: document.getElementById('idCardSubrole'),
        role: document.getElementById('idCardRole'),
        track: document.getElementById('idCardTrack'),
        ticket: document.getElementById('idCardTicket'),
        regId: document.getElementById('idCardRegId'),
        qr: document.getElementById('idCardQr'),
        barcode: document.getElementById('idCardBarcode'),
        downloadBtn: document.getElementById('downloadQrBtn'),
        qrDlNote: document.getElementById('qrDlNote'),
        swing: document.getElementById('idCardSwing'),
        container: document.getElementById('idCardContainer'),
        svg: document.getElementById('lySvg'),
        ...customRefs
      };

      this.stages = ['stage-initiate', 'stage-generate', 'stage-reveal', 'stage-enhance', 'stage-complete'];
      this.stageTimers = [];
      this.sequenceRunning = false;
      this.lastFocused = null;
      this.currentRegId = '';
      this.currentTicketUrl = null;
      this.phoneUpsideDown = false;

      this.lanyard = createLanyardEngine();
      this.init();
    }

    init() {
      const strandIds = ['lyStrandLEdge','lyStrandREdge','lyStrandLMid','lyStrandRMid',
                         'lyStrandLCore','lyStrandRCore','lyStrandLSheen','lyStrandRSheen',
                         'lyStrandLStitch','lyStrandRStitch'];
      const strandEls = strandIds.map(id => document.getElementById(id));

      this.lanyard.initDom({
        idCardSwing: this.refs.swing,
        idCardContainer: this.refs.container,
        idCardOverlay: this.refs.overlay,
        lySvg: this.refs.svg,
        strandEls
      });
      this.lanyard.startLoop();

      this.attachInputListeners();
    }

    attachInputListeners() {
      let lastPX = null, lastPY = null, lastPT = 0, lastVX = 0, lastVY = 0;
      let hovering = false;
      let touchActive = false;
      let activePointerId = null;

      // Auto-request motion & orientation sensors on iOS Safari 13+
      const requestSensors = () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission().catch(() => {});
        }
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
          DeviceMotionEvent.requestPermission().catch(() => {});
        }
      };
      window.addEventListener('pointerdown', requestSensors, { once: true });

      const checkActive = () => {
        const overlay = this.refs.overlay;
        return overlay && (overlay.classList.contains('open') || !overlay.hidden);
      };

      document.addEventListener('pointermove', (e) => {
        const isOpen = checkActive();
        if (!isOpen && !this.sequenceRunning) {
          lastPX = null;
          if (hovering || touchActive) {
            hovering = false;
            touchActive = false;
            this.lanyard.hoverEnd();
            const cardEl = document.getElementById('idCard');
            if (cardEl) cardEl.style.transform = '';
          }
          return;
        }

        const isTouch = e.pointerType === 'touch';
        // If it's a touch move, only track if user touched the card (drag)
        if (isTouch && !touchActive) return;

        const now = performance.now();
        const dx  = lastPX !== null ? e.clientX - lastPX : 0;
        const dy  = lastPY !== null ? e.clientY - lastPY : 0;
        const dtms = now - (lastPT || (now - 16));
        lastVX = dtms > 0 ? dx * 1000 / dtms : 0;
        lastVY = dtms > 0 ? dy * 1000 / dtms : 0;

        const g = this.lanyard.cardGeom();
        if (g) {
          const overX = Math.abs(e.clientX - g.cx) <= g.w / 2 + 16;
          const overY = e.clientY >= g.top - 18 && e.clientY <= g.top + g.h + 18;

          if (touchActive || (overX && overY)) {
            hovering = true;
            this.lanyard.hoverMove(e.clientX, e.clientY, lastVX);

            // Magnetic 3D tilt
            const cardEl = document.getElementById('idCard');
            if (cardEl) {
              const relX = (e.clientX - g.cx) / (g.w / 2);
              const relY = (e.clientY - (g.top + g.h / 2)) / (g.h / 2);
              cardEl.style.transform =
                'perspective(800px) rotateY(' + (relX * 12).toFixed(2) + 'deg) rotateX(' + (-relY * 10).toFixed(2) + 'deg)';
            }
            lastPX = e.clientX; lastPY = e.clientY; lastPT = now;
            return;
          }

          if (hovering && !touchActive) {
            hovering = false;
            this.lanyard.hoverEnd();
            const cardEl = document.getElementById('idCard');
            if (cardEl) cardEl.style.transform = '';
          }

          if (lastPX !== null && !isTouch) {
            const cy = g.top + g.h / 2;
            const reach = Math.max(g.w, 320) + 130;
            if (Math.hypot(e.clientX - g.cx, e.clientY - cy) < reach) {
              this.lanyard.pushPointer(dx);
            }
          }
        }
        lastPX = e.clientX; lastPY = e.clientY; lastPT = now;
      }, { passive: true });

      document.addEventListener('pointerdown', (e) => {
        const isOpen = checkActive();
        if (!isOpen && !this.sequenceRunning) return;
        const g = this.lanyard.cardGeom();
        if (!g) return;
        const inside = Math.abs(e.clientX - g.cx) <= g.w / 2 + 14 &&
                       e.clientY >= g.top - 14 && e.clientY <= g.top + g.h + 14;
        if (!inside) return;

        touchActive = true;
        activePointerId = e.pointerId;
        hovering = true;
        lastPX = e.clientX;
        lastPY = e.clientY;
        lastPT = performance.now();
        lastVX = 0;
        lastVY = 0;
        this.lanyard.hoverMove(e.clientX, e.clientY, 0);

        const speed = Math.hypot(lastVX, lastVY);
        const force = e.pointerType === 'touch' ? 1.15 : speed > 900 ? 2.35 : speed > 380 ? 1.55 : 1;
        this.lanyard.strike(e.clientX, e.clientY, lastVX, lastVY, force);
      }, { passive: true });

      const handlePointerUp = (e) => {
        if (touchActive && (activePointerId == null || e.pointerId === activePointerId)) {
          touchActive = false;
          hovering = false;
          activePointerId = null;
          this.lanyard.hoverEnd();
          const speed = Math.hypot(lastVX, lastVY);
          if (speed > 120) {
            const force = Math.min(2.5, 1 + speed / 450);
            this.lanyard.strike(e.clientX, e.clientY, lastVX, lastVY, force);
          }
          const cardEl = document.getElementById('idCard');
          if (cardEl) cardEl.style.transform = '';
        }
      };

      document.addEventListener('pointerup', handlePointerUp, { passive: true });
      document.addEventListener('pointercancel', handlePointerUp, { passive: true });

      document.addEventListener('mouseleave', () => {
        lastPX = null; lastPY = null; lastVX = 0; lastVY = 0;
        if (hovering && !touchActive) {
          hovering = false;
          this.lanyard.hoverEnd();
          const cardEl = document.getElementById('idCard');
          if (cardEl) cardEl.style.transform = '';
        }
      });

      // Mobile Device Motion (Accelerometer & Shake)
      let lastGravX = 0, lastGravY = 0;
      window.addEventListener('devicemotion', (e) => {
        const isOpen = checkActive();
        if (!isOpen && !this.sequenceRunning) return;

        let dynX = 0, dynY = 0;
        // If pure linear acceleration is provided by device
        if (e.acceleration && (e.acceleration.x != null || e.acceleration.y != null)) {
          dynX = e.acceleration.x || 0;
          dynY = e.acceleration.y || 0;
        } else if (e.accelerationIncludingGravity) {
          // If only accelerationIncludingGravity is available, strip static gravity using high-pass filter
          const rawX = e.accelerationIncludingGravity.x || 0;
          const rawY = e.accelerationIncludingGravity.y || 0;
          lastGravX += (rawX - lastGravX) * 0.08;
          lastGravY += (rawY - lastGravY) * 0.08;
          dynX = rawX - lastGravX;
          dynY = rawY - lastGravY;
        }
        this.lanyard.deviceMotion(dynX, dynY, 0);
      }, { passive: true });

      // Mobile Device Orientation (Gyroscope / Tilt)
      window.addEventListener('deviceorientation', (e) => {
        const isOpen = checkActive();
        if (!isOpen && !this.sequenceRunning) return;

        // Turn upside down retraction
        const upsideDown = e.beta != null && Math.abs(e.beta) > 125;
        if (upsideDown !== this.phoneUpsideDown && this.sequenceRunning) {
          this.phoneUpsideDown = upsideDown;
          if (upsideDown) this.lanyard.setRetracted(true);
          else this.lanyard.replayDrop();
        }

        if (!this.phoneUpsideDown && (e.gamma != null || e.beta != null)) {
          this.lanyard.deviceTilt(e.gamma, e.beta);
        }
      }, { passive: true });

      if (this.refs.closeBtn) this.refs.closeBtn.addEventListener('click', () => this.close());
      if (this.refs.downloadBtn) this.refs.downloadBtn.addEventListener('click', () => this.downloadTicket());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.sequenceRunning) this.close();
      });
    }

    setStage(name) {
      if (!this.refs.overlay) return;
      this.refs.overlay.classList.remove(...this.stages);
      if (name) this.refs.overlay.classList.add(name);
    }

    clearTimers() {
      while (this.stageTimers.length) clearTimeout(this.stageTimers.pop());
    }

    at(ms, fn) {
      this.stageTimers.push(setTimeout(fn, ms));
    }

    generateRegId() {
      const num = String(Math.floor(100 + Math.random() * 900)).padStart(4, '0');
      return 'VYORA26-PT-' + num;
    }

    populateCard(data = {}) {
      const name = (data.name || 'Alex Morgan').trim();
      this.currentRegId = data.regId || this.generateRegId();
      const isMember = data.is_ieee_member === 'Yes' || data.isMember === true;

      if (this.refs.name) this.refs.name.textContent = name;
      if (this.refs.role) this.refs.role.textContent = 'Event Participant';
      if (this.refs.subrole) this.refs.subrole.textContent = isMember ? 'IEEE Member' : 'Participant';
      if (this.refs.track) this.refs.track.textContent = data.track || 'Applied Machine Learning';
      if (this.refs.ticket) this.refs.ticket.textContent = isMember ? 'IEEE Member' : 'Non-Member';
      if (this.refs.regId) this.refs.regId.textContent = 'ID: ' + this.currentRegId;

      if (this.refs.barcode) {
        Code128.render(this.refs.barcode, this.currentRegId);
      }

      this.currentTicketUrl = null;
      if (this.refs.downloadBtn) this.refs.downloadBtn.hidden = true;

      Ticket.issue({
        name,
        regId: this.currentRegId,
        track: data.track || 'Applied Machine Learning',
        isMember
      }).then(url => {
        this.currentTicketUrl = url;
        if (this.refs.qr) QR.render(this.refs.qr, url);
      }).catch(err => {
        console.error('Signed ticket QR failed, using plain payload', err);
        if (this.refs.qr) QR.render(this.refs.qr, ['IEEE-SS26', this.currentRegId, name].join('|'));
      }).finally(() => {
        if (this.refs.downloadBtn) this.refs.downloadBtn.hidden = false;
      });
    }

    runSequence(data = {}) {
      if (this.sequenceRunning) return;
      this.sequenceRunning = true;
      this.lastFocused = document.activeElement;
      this.clearTimers();

      this.populateCard(data);

      const overlay = this.refs.overlay;
      overlay.hidden = false;
      overlay.style.transition = 'none';
      overlay.style.opacity = '1';
      void overlay.offsetHeight;

      overlay.style.transition = '';
      overlay.style.opacity = '';
      overlay.classList.add('open');

      // STAGE 1: Initiate (Checkmark circle draw)
      this.setStage('stage-initiate');

      // STAGE 2: Generate (Wireframe & scanline pulse)
      this.at(1000, () => this.setStage('stage-generate'));

      // STAGE 3: Reveal (Drop-in rope + swinging rigid badge)
      this.at(2500, () => this.setStage('stage-reveal'));

      // STAGE 4: Enhance (Rim-glow bloom & rising golden motes)
      this.at(3500, () => this.setStage('stage-enhance'));

      // STAGE 5: Complete (Actions revealed, focus enabled)
      this.at(4500, () => {
        this.setStage('stage-complete');
        if (this.refs.closeBtn) this.refs.closeBtn.focus();
      });
    }

    downloadTicket() {
      if (!this.currentTicketUrl || !this.currentRegId) {
        if (this.refs.qrDlNote) this.refs.qrDlNote.textContent = 'Ticket not ready yet — try again in a moment.';
        return;
      }
      try {
        const grid = QR.encode(this.currentTicketUrl);
        const n = grid.length, quiet = 3, px = 10;
        const qrDim = (n + quiet * 2) * px;
        const pad = 48, captionH = 150;
        const W = qrDim + pad * 2, H = qrDim + pad * 2 + captionH;

        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');

        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#000000';
        for (let r = 0; r < n; r++)
          for (let c = 0; c < n; c++)
            if (grid[r][c]) ctx.fillRect(pad + (c + quiet) * px, pad + (r + quiet) * px, px, px);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#8a6d1f'; ctx.font = 'bold 26px Georgia, serif';
        ctx.fillText("IEEE VYORA '26 · SUMMER SCHOOL", W / 2, pad + qrDim + 44);
        ctx.fillStyle = '#111111'; ctx.font = 'bold 30px Georgia, serif';
        ctx.fillText(this.refs.name ? this.refs.name.textContent : 'PARTICIPANT', W / 2, pad + qrDim + 88);
        ctx.fillStyle = '#555555'; ctx.font = '24px monospace';
        ctx.fillText(this.currentRegId + '  ·  VERIFIED TICKET', W / 2, pad + qrDim + 124);

        cv.toBlob(blob => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'IEEE-Ticket-' + this.currentRegId + '.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        }, 'image/png');
      } catch (err) {
        console.error('QR download failed', err);
      }
    }

    close() {
      this.clearTimers();
      this.sequenceRunning = false;
      this.phoneUpsideDown = false;
      this.lanyard.setRetracted(false);

      if (this.refs.overlay) {
        this.refs.overlay.classList.remove('open', ...this.stages);
        setTimeout(() => {
          this.refs.overlay.hidden = true;
          if (this.lastFocused && this.lastFocused.focus) this.lastFocused.focus();
        }, 260);
      }
    }
  }

  // Export to global scope
  global.IDCard = {
    QR,
    Code128,
    Ticket,
    createLanyardEngine,
    Controller: IDCardController
  };

})(typeof window !== 'undefined' ? window : this);
