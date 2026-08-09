const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Shutter HTML replacement
content = content.replace(
  /<div class="shutter-face">[\s\S]*?<h1 class="st-ieee">IEEE<\/h1>[\s\S]*?<p class="st-vjec">VJEC<\/p>[\s\S]*?<button class="enter-btn" id="registerBtn"[^>]*>Enter<\/button>[\s\S]*?<\/div>/,
  `<div class="shutter-face">
      <div id="shutter-initial-view">
        <h1 class="st-ieee">IEEE</h1>
        <p class="st-vjec">VJEC</p>
        <button class="enter-btn" id="registerBtn" aria-label="Open shutter and enter site">Enter</button>
      </div>
      <div id="shutter-thankyou-view" style="display: none; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <h1 class="st-ieee" style="font-size: clamp(3rem, 15vw, 10rem);">THANK<br>YOU</h1>
        <p class="st-vjec" style="font-size: clamp(1rem, 4vw, 2rem); margin-top: 2rem;">PROCESSING...</p>
      </div>
    </div>`
);

// 2. ID Card Overlay CSS Replacement (make it solid background)
content = content.replace(
  /background:rgba\(10,11,15,\.9\);\s*backdrop-filter:blur\(10px\);-webkit-backdrop-filter:blur\(10px\);/,
  `background:var(--bg); /* Solid background for modal */`
);

// 3. Lanyard HTML replacement
content = content.replace(
  /<div class="id-card-lanyard" id="idCardLanyard" aria-hidden="true">[\s\S]*?<div class="ly-clip">/,
  `<div class="id-card-lanyard" id="idCardLanyard" aria-hidden="true">
    <div class="ly-strap ly-strap-main"></div>
    <div class="ly-ring"></div>
    <div class="ly-clip">`
);

// 4. Barcode HTML removal
content = content.replace(
  /<div class="id-card-barcode" id="idCardBarcode" aria-hidden="true"><\/div>/,
  ``
);

// 5. Barcode JS removal
content = content.replace(
  /Code128\.render\(idCardBarcode,\s*currentRegId\);/,
  `// Barcode removed`
);

// 6. Lanyard CSS Replacement
content = content.replace(
  /width:300px;height:80px;/,
  `width:60px;height:120px;`
);

content = content.replace(
  /\.ly-strap\{[\s\S]*?bottom:12px;[\s\S]*?width:26px;[\s\S]*?overflow:hidden;[\s\S]*?\}/,
  `.ly-strap{
  position:absolute;
  bottom:20px;
  left:50%;transform:translateX(-50%);
  width:32px;
  overflow:hidden;
}`
);

// Remove the old strap rules
content = content.replace(/\.ly-strap-l\{[\s\S]*?\}/, '');
content = content.replace(/\.ly-strap-r\{[\s\S]*?\}/, '');
content = content.replace(/\.ly-breakaway\{[\s\S]*?\}/, '');
content = content.replace(/\.ly-strap-l::after,\.ly-strap-r::after\{[\s\S]*?\}/, '');

// Redefine strap height properly
content = content.replace(
  /\.ly-strap\{([\s\S]*?)\}/,
  `.ly-strap{$1 height:400px;}`
);

// Make ly-ring a D-ring at the bottom of the straight strap
content = content.replace(
  /\.ly-ring\{[\s\S]*?width:36px;height:12px;[\s\S]*?border-radius:18px;[\s\S]*?\}/,
  `.ly-ring{
  position:absolute;bottom:6px;left:50%;transform:translateX(-50%);
  width:32px;height:20px;
  border:3px solid #b8b3a7;border-radius:12px;
  box-shadow:0 2px 4px rgba(0,0,0,.4);
}`
);

// 7. Animation Sequence JS Replacement
const newSequence = `
  function runIdCardSequence(data) {
    if (sequenceRunning) return;
    sequenceRunning = true;
    lastFocused = document.activeElement;
    clearStageTimers();

    populateCard(data);

    // Swap text to "Thank You" right before closing
    document.getElementById('shutter-initial-view').style.display = 'none';
    document.getElementById('shutter-thankyou-view').style.display = 'flex';
    
    // Close shutter first to hide page
    closeShutter(() => {
        // While closed, set up the new solid background
        idCardOverlay.hidden = false;
        void idCardOverlay.offsetHeight;
        idCardOverlay.classList.add('open');
        document.addEventListener('keydown', onEsc);
        
        // Wait a bit to simulate processing
        setTimeout(() => {
            // Open the shutter to reveal the new background and ID card
            openShutter();
            
            // Now start the generation animation ON the new background
            setStage('stage-initiate');
            at(1000, () => setStage('stage-generate'));
            at(2500, () => setStage('stage-reveal'));
            at(3500, () => setStage('stage-enhance'));
            at(4500, () => {
                setStage('stage-complete');
                idCardClose.focus();
            });
        }, 1500); // 1.5s delay showing the "Thank You" message
    });
  }
`;

content = content.replace(
  /function runIdCardSequence\(data\) \{[\s\S]*?idCardClose\.focus\(\);\s*\}\);\s*\}/,
  newSequence
);

// Update closeIdCard to reset the shutter text
const closeReset = `  function closeIdCard() {
    clearStageTimers();
    sequenceRunning = false;
    idCardOverlay.classList.remove('open', ...STAGES);
    document.removeEventListener('keydown', onEsc);
    
    const initView = document.getElementById('shutter-initial-view');
    const tyView = document.getElementById('shutter-thankyou-view');
    if(initView) initView.style.display = 'block';
    if(tyView) tyView.style.display = 'none';
`;

content = content.replace(
  /function closeIdCard\(\) \{[\s\S]*?document\.removeEventListener\('keydown', onEsc\);/,
  closeReset
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated index.html');
