const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// --- 1. Z-index & Room Background ---
content = content.replace(
  /position:fixed;inset:0;z-index:200;[\s\S]*?opacity:0;transition:opacity \.3s ease;/,
  `position:fixed;inset:0;z-index:60;
  display:flex;flex-direction:column;align-items:center;
  padding:max(3vh,24px) 16px 24px;
  overflow-y:auto;
  pointer-events:none;
  background: 
    radial-gradient(circle at 50% -20%, rgba(212,160,23,.15) 0%, transparent 60%),
    radial-gradient(ellipse at 50% 50%, #15161a 0%, #08090a 100%);
  perspective:1000px;
  opacity:0;transition:opacity .3s ease, transform 1s ease-out;`
);

// Add spotlight pseudo-element
content = content.replace(
  /\.id-card-overlay\.open\{opacity:1\}/,
  `.id-card-overlay.open{opacity:1}
.id-card-overlay::before {
  content: ""; position: fixed; top: 0; left: 50%; transform: translateX(-50%);
  width: 100vw; max-width: 800px; height: 100vh;
  background: radial-gradient(ellipse at top, rgba(232,194,122,0.06) 0%, transparent 70%);
  pointer-events: none; z-index: -1;
}`
);

// --- 2. Shutter Face Processing View ---
content = content.replace(
  /<div class="shutter-face">[\s\S]*?<h1 class="st-ieee">IEEE<\/h1>[\s\S]*?<p class="st-vjec">VJEC<\/p>[\s\S]*?<button class="enter-btn"[^>]*>Enter<\/button>\s*<\/div>/,
  `<div class="shutter-face">
      <div id="shutter-initial-view">
        <h1 class="st-ieee">IEEE</h1>
        <p class="st-vjec">VJEC</p>
        <button class="enter-btn" id="registerBtn" aria-label="Open shutter and enter site">Enter</button>
      </div>
      <div id="shutter-processing-view" style="display: none; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <h1 class="st-ieee" style="font-size: clamp(2.5rem, 8vw, 4rem); letter-spacing: 0.1em; line-height: 1.1; margin-bottom: 1rem;">BUILDING YOUR<br>EVENT PASS</h1>
        <div style="font-family: monospace; color: var(--gold-0); font-size: 1.5rem; letter-spacing: 2px;" id="shutter-progress">
          <span id="shutter-p-bar">□□□□□□□□□□</span> <span id="shutter-p-text" style="display:inline-block; width: 60px; text-align:right;">0%</span>
        </div>
      </div>
    </div>`
);

// --- 3. Lanyard & ID Card HTML Structure ---
// Wrap container, put lanyard inside it
content = content.replace(
  /<div class="id-card-lanyard" id="idCardLanyard" aria-hidden="true">[\s\S]*?<div class="id-card-container" id="idCardContainer">/,
  `<div id="idCardWrapper" style="transform-style: preserve-3d; perspective: 1000px;">
  <div class="id-card-container" id="idCardContainer">
    <div class="id-card-lanyard" id="idCardLanyard" aria-hidden="true">
      <div class="ly-strap ly-strap-main"></div>
      <div class="ly-ring"></div>
      <div class="ly-clip">
        <div class="ly-clip-ring"></div>
        <div class="ly-clip-body"></div>
      </div>
    </div>`
);

content = content.replace(
  /<\/article>\s*<!-- ===== STAGE 5 — actions ===== -->/,
  `</article>\n    </div>\n    <!-- ===== STAGE 5 — actions ===== -->`
);

// --- 4. Barcode removal ---
content = content.replace(
  /<div class="id-card-barcode" id="idCardBarcode" aria-hidden="true"><\/div>/,
  ``
);
content = content.replace(
  /Code128\.render\(idCardBarcode,\s*currentRegId\);/,
  ``
);

// --- 5. Lanyard CSS ---
content = content.replace(
  /\.id-card-lanyard\{[\s\S]*?animation:lanyardDrop[\s\S]*?\}/,
  `.id-card-lanyard{
  position:relative;z-index:3;
  width:60px;height:120px;
  pointer-events:none;
  margin:0 auto;
  flex-shrink:0;
  overflow:visible;
  opacity: 1; /* always visible within container */
}`
);
content = content.replace(/@keyframes lanyardDrop\{[\s\S]*?\}/, '');

content = content.replace(
  /\.ly-strap\{[\s\S]*?bottom:12px;[\s\S]*?width:26px;[\s\S]*?overflow:hidden;[\s\S]*?\}/,
  `.ly-strap{
  position:absolute;
  bottom:20px;
  left:50%;transform:translateX(-50%);
  width:44px; /* wider strap */
  height:400px;
  overflow:hidden;
}`
);

// Remove the old strap rules
content = content.replace(/\.ly-strap-l\{[\s\S]*?\}/, '');
content = content.replace(/\.ly-strap-r\{[\s\S]*?\}/, '');
content = content.replace(/\.ly-breakaway\{[\s\S]*?\}/, '');
content = content.replace(/\.ly-strap-l::after,\.ly-strap-r::after\{[\s\S]*?\}/, '');

// Redefine background with texture
content = content.replace(
  /\.ly-strap\{([\s\S]*?)\}/,
  `.ly-strap{$1
  background: 
    repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 1.5px, transparent 1.5px, transparent 3px),
    linear-gradient(90deg, #0b5c52 0%, #12897a 22%, #16a394 50%, #12897a 78%, #0b5c52 100%) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}`
);

content = content.replace(
  /\.ly-ring\{[\s\S]*?width:36px;height:12px;[\s\S]*?border-radius:18px;[\s\S]*?\}/,
  `.ly-ring{
  position:absolute;bottom:6px;left:50%;transform:translateX(-50%);
  width:36px;height:22px;
  border:4px solid #b8b3a7;border-radius:12px;
  box-shadow:0 2px 4px rgba(0,0,0,.5);
}`
);

// Remove .ly-label
content = content.replace(/<span class="ly-label">[\s\S]*?<\/span>/g, '');
content = content.replace(/\.ly-label\{[\s\S]*?\}/, '');

// --- 6. Card Container Drop & Swing Animation ---
// The container starts above screen, drops, and swings.
content = content.replace(
  /\.id-card-container\{[\s\S]*?perspective:1200px;[\s\S]*?\}/,
  `.id-card-container{
  display:flex;flex-direction:column;
  width:var(--card-w);max-width:440px;
  margin:0 auto;position:relative;z-index:2;
  transform:translateY(-150vh);
  transform-style:preserve-3d;
  opacity: 1; /* always opaque, position hides it */
}`
);

content = content.replace(
  /\.stage-reveal \.id-card-container,\s*\.stage-enhance \.id-card-container,\s*\.stage-complete \.id-card-container\{[\s\S]*?\}/,
  `.stage-reveal .id-card-container, .stage-enhance .id-card-container, .stage-complete .id-card-container {
  animation: cardDrop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, cardSwing 4s ease-in-out 0.8s infinite alternate;
}`
);
content = content.replace(/@keyframes idContainerUp\{[\s\S]*?\}/, 
`@keyframes cardDrop {
  0% { transform: translateY(-150vh); }
  100% { transform: translateY(0); }
}
@keyframes cardSwing {
  0% { transform: translateY(0) rotateZ(-1.5deg) rotateX(2deg); }
  100% { transform: translateY(0) rotateZ(1.5deg) rotateX(-2deg); }
}`);

// Since they drop together, no inner fade up
content = content.replace(/\.stage-reveal \.id-card-header[^\{]*\{[\s\S]*?animation:idFadeUp[\s\S]*?\}/, '');
content = content.replace(/@keyframes idFadeUp\{[\s\S]*?\}/, '');
content = content.replace(/\.id-card-header,\.id-card-tagline,\.id-card-avatar,\s*\.id-card-name,\.id-card-subrole,\.id-card-meta,\.id-card-codes\{opacity:0\}/, 
  `.id-card-header,.id-card-tagline,.id-card-avatar,.id-card-name,.id-card-subrole,.id-card-meta,.id-card-codes{opacity:1;}`);

// --- 7. CTAs ---
content = content.replace(
  /<div class="id-card-actions">[\s\S]*?<\/div>/,
  `<div class="id-card-actions" style="flex-direction:column; gap:8px;">
      <button class="btn btn-gold" type="button" id="idCardDownload" style="width:100%">Download ID</button>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" type="button" style="flex:1">Apple Wallet</button>
        <button class="btn btn-ghost" type="button" style="flex:1">Google Wallet</button>
      </div>
      <button class="btn btn-ghost" type="button" id="idCardShare" style="width:100%">Share</button>
      <p class="id-card-hint" id="idCardHint">Show this badge at the registration desk.</p>
    </div>`
);

// --- 8. JS Animation Sequence ---
const newSequence = `
  const idCardWrapper = document.getElementById('idCardWrapper');
  let rotX = 0, rotY = 0;
  let targetRotX = 0, targetRotY = 0;
  
  function updateCardRotation() {
    rotX += (targetRotX - rotX) * 0.1;
    rotY += (targetRotY - rotY) * 0.1;
    if(idCardWrapper) {
       idCardWrapper.style.transform = \`perspective(1000px) rotateX(\${rotX}deg) rotateY(\${rotY}deg)\`;
    }
    requestAnimationFrame(updateCardRotation);
  }
  updateCardRotation();
  
  document.addEventListener('mousemove', (e) => {
    if(!sequenceRunning) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 20; // max 10 deg
    const y = -(e.clientY / window.innerHeight - 0.5) * 20;
    targetRotX = y;
    targetRotY = x;
  });

  function runIdCardSequence(data) {
    if (sequenceRunning) return;
    sequenceRunning = true;
    lastFocused = document.activeElement;
    clearStageTimers();

    populateCard(data);

    // 1. Registration Success -> Dim background
    setStage('stage-initiate');
    idCardOverlay.hidden = false;
    void idCardOverlay.offsetHeight;
    idCardOverlay.classList.add('open');
    document.addEventListener('keydown', onEsc);

    // Wait 0.5s before shutter closes
    at(500, () => {
      // 2. Industrial Shutter Closes
      document.getElementById('shutter-initial-view').style.display = 'none';
      document.getElementById('shutter-processing-view').style.display = 'flex';
      
      closeShutter(() => {
        // 3. Processing Happens Behind Shutter (2 sec)
        let progress = 0;
        const pBar = document.getElementById('shutter-p-bar');
        const pText = document.getElementById('shutter-p-text');
        const interval = setInterval(() => {
           progress += Math.floor(Math.random() * 15) + 5;
           if(progress > 100) progress = 100;
           const filled = Math.floor(progress / 10);
           pBar.textContent = '■'.repeat(filled) + '□'.repeat(10 - filled);
           pText.textContent = progress + '%';
           if(progress >= 100) {
              clearInterval(interval);
           }
        }, 200);

        at(2000, () => {
          clearInterval(interval);
          pBar.textContent = '■'.repeat(10);
          pText.textContent = '100%';
          
          // 4. Shutter Opens
          // The overlay acts as the industrial display room. We slightly zoom it in.
          idCardOverlay.style.transform = 'scale(1)';
          idCardOverlay.style.transition = 'transform 1.8s ease-out';
          
          openShutter();
          
          at(100, () => {
             idCardOverlay.style.transform = 'scale(1.05)';
          });
          
          // 5. ID Card Drops
          at(1000, () => {
             setStage('stage-reveal');
             
             // 6. Final Hero Shot & 7. CTA
             at(800, () => {
                setStage('stage-complete');
                idCardClose.focus();
             });
          });
        });
      });
    });
  }`;

content = content.replace(
  /function runIdCardSequence\(data\) \{[\s\S]*?idCardClose\.focus\(\);\s*\}\s*\)/,
  newSequence
);

// Actually, in the old runIdCardSequence there were no parenthesis after '});' to match the regex correctly.
// Let's do a more robust replace for runIdCardSequence.
content = content.replace(
  /function runIdCardSequence\(data\) \{[\s\S]*?idCardClose\.focus\(\);\s*\}\);\s*\}/,
  newSequence
);

// Reset overlay scale and rotation in closeIdCard
const closeReset = `  function closeIdCard() {
    clearStageTimers();
    sequenceRunning = false;
    idCardOverlay.classList.remove('open', ...STAGES);
    document.removeEventListener('keydown', onEsc);
    
    targetRotX = 0; targetRotY = 0; rotX = 0; rotY = 0;
    idCardOverlay.style.transform = 'scale(1)';
    
    const initView = document.getElementById('shutter-initial-view');
    const tyView = document.getElementById('shutter-processing-view');
    if(initView) initView.style.display = 'block';
    if(tyView) tyView.style.display = 'none';
    
    // reset progress bar
    const pBar = document.getElementById('shutter-p-bar');
    const pText = document.getElementById('shutter-p-text');
    if(pBar) pBar.textContent = '□□□□□□□□□□';
    if(pText) pText.textContent = '0%';
`;

content = content.replace(
  /function closeIdCard\(\) \{[\s\S]*?document\.removeEventListener\('keydown', onEsc\);[\s\S]*?if\(tyView\) tyView\.style\.display = 'none';/,
  closeReset
);
// In case the previous replace didn't find tyView (because it wasn't there before my last edit), let's just use the start.
content = content.replace(
  /function closeIdCard\(\) \{[\s\S]*?document\.removeEventListener\('keydown', onEsc\);/,
  closeReset
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated index.html');
