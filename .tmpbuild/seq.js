  // ---- ID card elements ----
  const idCardOverlay = document.getElementById('idCardOverlay');
  const idCardClose   = document.getElementById('idCardClose');
  const idCardName    = document.getElementById('idCardName');
  const idCardSubrole = document.getElementById('idCardSubrole');
  const idCardRole    = document.getElementById('idCardRole');
  const idCardTrack   = document.getElementById('idCardTrack');
  const idCardTicket  = document.getElementById('idCardTicket');
  const idCardRegId   = document.getElementById('idCardRegId');
  const idCardQr      = document.getElementById('idCardQr');
  const idCardBarcode = document.getElementById('idCardBarcode');
  const idCardDownload= document.getElementById('idCardDownload');
  const idCardShare   = document.getElementById('idCardShare');
  const idCardHint    = document.getElementById('idCardHint');

  const STAGES = ['stage-initiate','stage-generate','stage-reveal','stage-enhance','stage-complete'];
  let sequenceRunning = false;
  let lastFocused = null;
  let currentRegId = '';
  const stageTimers = [];

  function setStage(name) {
    idCardOverlay.classList.remove(...STAGES);
    if (name) idCardOverlay.classList.add(name);
  }
  function clearStageTimers() {
    while (stageTimers.length) clearTimeout(stageTimers.pop());
  }
  const at = (ms, fn) => stageTimers.push(setTimeout(fn, ms));

  /* Reg ID follows the printed badge format: IEEE2026VJEC####.
     Base-36 time slice + a random tail keeps it unique per submission
     without a server to allocate sequential numbers. */
  function generateRegId() {
    const t = Date.now().toString(36).toUpperCase().slice(-3);
    const r = Math.floor(Math.random() * 36).toString(36).toUpperCase();
    return 'IEEE2026VJEC' + (t + r).slice(-4);
  }

  function roleForMembership(isMember) {
    return isMember === 'Yes' ? 'IEEE Member' : 'Participant';
  }

  function populateCard(data) {
    const name = data.name.trim();
    currentRegId = generateRegId();

    idCardName.textContent    = name;
    idCardRole.textContent    = 'Event Participant';
    idCardSubrole.textContent = roleForMembership(data.is_ieee_member);
    idCardTrack.textContent   = data.track || '—';
    idCardTicket.textContent  = data.is_ieee_member === 'Yes' ? 'IEEE Member' : 'Non-Member';
    idCardRegId.textContent   = 'ID: ' + currentRegId;

    // ID + name + event, so a scan identifies the holder offline
    const payload = ['IEEE-SS26', currentRegId, name, 'IEEE Summer School 2026'].join('|');
    try {
      QR.render(idCardQr, payload);
      Code128.render(idCardBarcode, currentRegId);
    } catch (err) {
      console.error('Code generation failed', err);
    }
  }

  function closeIdCard() {
    clearStageTimers();
    sequenceRunning = false;
    idCardOverlay.classList.remove('open', ...STAGES);
    document.removeEventListener('keydown', onEsc);
    setTimeout(() => {
      idCardOverlay.hidden = true;
      // the shutter is up at this point — make sure the page is usable again
      root.classList.remove('locked');
      body.classList.remove('locked');
      body.style.overflow = 'auto';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }, 260);
  }
  function onEsc(e) { if (e.key === 'Escape') closeIdCard(); }

  /* The five-stage reveal from the design:
     INITIATE → GENERATE → REVEAL (shutter down/up) → ENHANCE → COMPLETE */
  function runIdCardSequence(data) {
    if (sequenceRunning) return;
    sequenceRunning = true;
    lastFocused = document.activeElement;
    clearStageTimers();

    populateCard(data);

    idCardOverlay.hidden = false;
    void idCardOverlay.offsetHeight;              // reflow so .open transitions
    idCardOverlay.classList.add('open');
    document.addEventListener('keydown', onEsc);

    // Reduced motion: skip straight to the finished badge.
    if (reduced) {
      setStage('stage-complete');
      at(80, () => idCardClose.focus());
      return;
    }

    setStage('stage-initiate');                   // 1 — registration confirmed
    at(1700, () => setStage('stage-generate'));   // 2 — wireframe + "generating…"

    at(3400, () => {                              // 3 — shutter down, card mounts, shutter up
      replayShutter(() => setStage('stage-reveal'));
    });

    // replayShutter ≈ close (1.9s) + beat (0.26s) + open (1.9s).
    // ENHANCE begins once the card is on screen and the shutter has cleared.
    at(7600, () => setStage('stage-enhance'));    // 4 — glow bloom + motes
    at(9000, () => {                              // 5 — actions
      setStage('stage-complete');
      idCardClose.focus();
    });
  }

  /* ---- stage 5 actions ---- */
  idCardDownload.addEventListener('click', () => window.print());

  idCardShare.addEventListener('click', async () => {
    const text = 'My IEEE Summer School 2026 badge — ' + currentRegId;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'IEEE Summer School 2026', text });
      } else {
        await navigator.clipboard.writeText(currentRegId);
        idCardHint.textContent = 'Registration ID copied to clipboard.';
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;   // user dismissed the share sheet
      idCardHint.textContent = 'Your ID is ' + currentRegId;
    }
  });
