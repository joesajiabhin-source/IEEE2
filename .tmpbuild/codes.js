  /* ==========================================================
     QR CODE — self-contained byte-mode encoder (ECC level M)
     Reed–Solomon over GF(256), primitive polynomial 0x11d.
     Supports versions 1–10 (up to 213 bytes) which is ample
     for the badge payload. Kept inline so the site stays
     dependency-free and works offline.
     ========================================================== */
  const QR = (() => {
    // ---- GF(256) log/antilog tables ----
    const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    for (let i = 0, x = 1; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

    const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

    // ---- Reed–Solomon generator polynomial of given degree ----
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

    // ---- ECC level M block structure, versions 1..10 ----
    // [ecPerBlock, blocksG1, dataG1, blocksG2, dataG2]
    const SPEC = [
      null,
      [10, 1, 16, 0,  0], [16, 1, 28, 0,  0], [26, 1, 44, 0,  0],
      [18, 2, 32, 0,  0], [24, 2, 43, 0,  0], [16, 4, 27, 0,  0],
      [18, 4, 31, 0,  0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37],
      [26, 4, 43, 1, 44],
    ];
    const ALIGN = [
      null, [], [6,18], [6,22], [6,26], [6,30],
      [6,34], [6,22,38], [6,24,42], [6,26,46], [6,28,50],
    ];
    const capacity = v => SPEC[v][1] * SPEC[v][2] + SPEC[v][3] * SPEC[v][4];

    // ---- build the codeword stream ----
    function buildCodewords(bytes, version) {
      const total = capacity(version);
      const bits  = [];
      const push  = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };

      push(0b0100, 4);                                   // byte mode
      push(bytes.length, version < 10 ? 8 : 16);         // character count
      for (const b of bytes) push(b, 8);

      // terminator + byte alignment
      for (let i = 0; i < 4 && bits.length < total * 8; i++) bits.push(0);
      while (bits.length % 8) bits.push(0);

      const cw = [];
      for (let i = 0; i < bits.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
        cw.push(byte);
      }
      // pad alternately with 0xEC / 0x11
      const PAD = [0xec, 0x11];
      for (let i = 0; cw.length < total; i++) cw.push(PAD[i % 2]);
      return cw;
    }

    // ---- interleave data + ecc across blocks ----
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

    // ---- matrix construction ----
    function buildMatrix(version, codewords) {
      const size = version * 4 + 17;
      const mod  = Array.from({length: size}, () => new Array(size).fill(null));
      const res  = Array.from({length: size}, () => new Array(size).fill(false)); // reserved

      const setF = (r, c, v) => { mod[r][c] = v; res[r][c] = true; };

      // finder patterns + separators
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

      // timing patterns
      for (let i = 8; i < size - 8; i++) {
        setF(6, i, i % 2 === 0);
        setF(i, 6, i % 2 === 0);
      }

      // alignment patterns
      const centers = ALIGN[version];
      for (const r of centers)
        for (const c of centers) {
          if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;
          for (let dr = -2; dr <= 2; dr++)
            for (let dc = -2; dc <= 2; dc++)
              setF(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }

      // dark module
      setF(size - 8, 8, true);

      // reserve format areas
      for (let i = 0; i < 9; i++) {
        if (!res[8][i])        { res[8][i] = true; mod[8][i] = false; }
        if (!res[i][8])        { res[i][8] = true; mod[i][8] = false; }
      }
      for (let i = 0; i < 8; i++) {
        if (!res[8][size - 1 - i]) { res[8][size - 1 - i] = true; mod[8][size - 1 - i] = false; }
        if (!res[size - 1 - i][8]) { res[size - 1 - i][8] = true; mod[size - 1 - i][8] = false; }
      }
      // reserve version info (v >= 7)
      if (version >= 7) {
        for (let i = 0; i < 6; i++)
          for (let j = 0; j < 3; j++) {
            res[size - 11 + j][i] = true; mod[size - 11 + j][i] = false;
            res[i][size - 11 + j] = true; mod[i][size - 11 + j] = false;
          }
      }

      // place data in the zig-zag pattern
      let bitIdx = 0, dir = -1, row = size - 1;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;                       // skip vertical timing column
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

    // format information — BCH(15,5), ECC level M = 0b00
    function formatBits(mask) {
      let data = (0b00 << 3) | mask;
      let rem  = data;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
      return ((data << 10) | rem) ^ 0x5412;
    }
    // version information — BCH(18,6)
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

      // format info, both copies
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

    // penalty scoring, so we pick the most scannable mask
    function penalty(grid, size) {
      let score = 0;
      // rule 1 — runs of 5+
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
      // rule 2 — 2x2 blocks
      for (let r = 0; r < size - 1; r++)
        for (let c = 0; c < size - 1; c++) {
          const v = grid[r][c];
          if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
        }
      // rule 3 — finder-like patterns
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
      // rule 4 — dark/light balance
      let dark = 0;
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c]) dark++;
      const pct = (dark * 100) / (size * size);
      score += Math.floor(Math.abs(pct - 50) / 5) * 10;
      return score;
    }

    /** Encode `text` and return a square boolean matrix. */
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

      // version info blocks for v >= 7
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

    /** Render the matrix into `el` as a crisp canvas. */
    function render(el, text) {
      const grid = encode(text);
      const n = grid.length;
      const quiet = 2;
      const px = 4;                                  // module size in canvas pixels
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
     CODE 128 (subset B) — real, scannable barcode
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

    /** Render `text` into `el` as a canvas barcode. */
    function render(el, text) {
      const values = [START_B];
      for (const ch of text) {
        const v = ch.charCodeAt(0) - 32;
        values.push(v >= 0 && v < 95 ? v : 0);       // fall back to space
      }
      let sum = START_B;
      for (let i = 1; i < values.length; i++) sum += values[i] * i;
      values.push(sum % 103, STOP);

      // expand to bar widths — patterns alternate bar/space
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

