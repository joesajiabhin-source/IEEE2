/* ==========================================================
   TICKET — signed, self-contained QR tickets (shared module).
   Used by index.html (issue, at registration) and check.html
   (verify, when the event host scans a participant's QR).

   The QR on the ID card encodes a URL of this site:
       <origin>/check.html?d=<base64url(JSON payload)>
   The payload carries the student's registration data plus a
   signature. The checker page re-computes the signature and
   shows ✓ VERIFIED only for tickets issued by a completed
   registration (the UPI payment screenshot is mandatory at
   sign-up, so a signed ticket == registered + paid).

   NOTE: the secret lives in client-side JS (static site, no
   backend) — it blocks casual QR tampering, not a determined
   forger reading the source.
   ========================================================== */
window.Ticket = (() => {
  'use strict';
  const SECRET = 'vjec-ieee-ss26-ticket-v1';
  const TRACKS = [
    'Applied Machine Learning',
    'Embedded & IoT Systems',
    'Modern Web Engineering',
    'Cybersecurity Foundations',
    'Robotics & Control'
  ];

  // base64url (UTF-8 safe)
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
  // 64-bit FNV fallback for non-secure contexts (file://) so the card
  // never fails to render; the verifier honours the algo tag.
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
  function calcSig(canonical, algo) {
    if (algo === 'h') return sha256Hex(SECRET + canonical).then(x => x.slice(0, 16));
    return Promise.resolve(fnvHex(SECRET + canonical));
  }

  /** Build the ticket URL that goes into the QR. */
  async function issue({ name, regId, track, isMember }) {
    const tIdx = Math.max(0, TRACKS.indexOf(track));
    const suffix = String(regId || '').replace(/^IEEE2026VJEC/, '');   // QR stays small
    const t = { n: String(name).slice(0, 40), r: suffix, t: tIdx, m: isMember ? 1 : 0, ts: Math.floor(Date.now() / 1000) };
    const canonical = ['IEEE-SS26', t.r, t.n, t.t, t.m, t.ts].join('|');
    const sig = await makeSig(canonical);
    const payload = b64uEnc(JSON.stringify({ ...t, ...sig }));
    return new URL('check.html', location.href).href + '?d=' + payload;
  }

  /** Verify a `d` param from a scanned URL. */
  async function verify(d) {
    try {
      const t = JSON.parse(b64uDec(d));
      if (typeof t.n !== 'string' || typeof t.r !== 'string' || typeof t.s !== 'string' || typeof t.a !== 'string')
        return { ok: false, reason: 'Ticket data is incomplete.' };
      const canonical = ['IEEE-SS26', t.r, t.n, t.t || 0, t.m ? 1 : 0, t.ts || 0].join('|');
      const expect = await calcSig(canonical, t.a);
      if (expect !== t.s) return { ok: false, reason: 'Signature mismatch — this QR was not issued by registration.' };
      return {
        ok: true,
        ticket: {
          name: t.n,
          regId: 'IEEE2026VJEC' + t.r,
          track: TRACKS[t.t] || '—',
          member: !!t.m,
          ts: (t.ts || 0) * 1000
        }
      };
    } catch (_) {
      return { ok: false, reason: 'Malformed ticket link.' };
    }
  }

  return { TRACKS, issue, verify };
})();
