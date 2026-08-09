const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update Navigation Links
content = content.replace(
  /<nav class="nav-links" id="navLinks" aria-label="Primary">[\s\S]*?<\/nav>/,
  `<nav class="nav-links" id="navLinks" aria-label="Primary">
    <a href="#home">Home</a>
    <a href="#about">Event Details</a>
    <a href="#events">Events</a>
    <a href="#schedule">Schedule</a>
    <a href="#pricing">Pricing</a>
    <a href="#register-section">Register</a>
    <a href="#contact">Contact</a>
  </nav>`
);

// 2. Change "About IEEE SB VJEC & the Summer School" to "Event Details"
content = content.replace(
  /<span class="eyebrow">About<\/span>\s*<h2 class="display">IEEE SB VJEC &amp; the Summer School<\/h2>/,
  `<span class="eyebrow">Event Details</span>
        <h2 class="display">IEEE SB VJEC &amp; the Summer School</h2>`
);

// 3. Remove Admin Block CSS (Lines around "6b. ADMIN BLOCK")
content = content.replace(
  /\/\* ============================================================\s*6b\. ADMIN BLOCK\s*============================================================ \*\/[\s\S]*?\/\* --- tickets --- \*\//,
  `/* --- tickets --- */`
);

// 4. Update the "Reserve a Seat" button in hero to point to #register-section
content = content.replace(
  /<a class="btn cta btn-gold" href="#register" data-target="#register">Reserve a Seat<\/a>/g,
  `<a class="btn cta btn-gold" href="#register-section" data-target="#register-section">Reserve a Seat</a>`
);

// 5. Remove Admin Block HTML
content = content.replace(
  /<!-- ============ 5\. ADMIN BLOCK ============ -->[\s\S]*?<!-- ============ 6\. REGISTRATION & CONTACT ============ -->/,
  `<!-- ============ 5. PRICING ============ -->
  <section class="section" id="pricing">
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow">Pricing</span>
        <h2 class="display">Simple, straightforward pricing</h2>
        <p class="lede">Seats are allotted per track on a first-come basis. Confirmation and payment instructions are emailed within 24 hours.</p>
      </div>

      <div class="tickets">
        <div class="card ticket reveal" style="--d:0ms">
          <h3>IEEE Member</h3>
          <div class="price">₹499<small>per participant</small></div>
          <ul class="pill-list">
            <li>Full two-day access</li><li>Kit, lunch &amp; refreshments</li><li>Digital certificate</li>
          </ul>
        </div>
        <div class="card ticket featured reveal" style="--d:110ms">
          <span class="badge">Most picked</span>
          <h3>Non-Member</h3>
          <div class="price">₹799<small>per participant</small></div>
          <ul class="pill-list">
            <li>Full two-day access</li><li>Kit, lunch &amp; refreshments</li><li>Digital certificate</li><li>Discounted IEEE sign-up on site</li>
          </ul>
        </div>
      </div>
      <div style="text-align: center; margin-top: 2rem;" class="reveal" style="--d:200ms">
         <a class="btn cta btn-gold" href="#register-section" data-target="#register-section">Reserve a Seat</a>
      </div>
    </div>
  </section>

  <div class="rule"></div>

  <!-- ============ 6. REGISTRATION & CONTACT ============ -->`
);

// Remove the old tickets block from REGISTRATION & CONTACT
content = content.replace(
  /<div class="tickets">[\s\S]*?<\/div>\s*<\/div>\s*<div class="grid g-2-1">/,
  `<div class="grid g-2-1">`
);

// 6. Replace the Registration Form HTML
const newFormHtml = `<form class="card static reveal" id="regForm" novalidate style="--d:0ms">
          <h3 style="margin-bottom:1.1rem" id="register-section">Reserve your seat</h3>
          <div class="form-grid">
            <div class="field">
              <label for="f-name">Full name</label>
              <input id="f-name" name="name" type="text" autocomplete="name" required>
              <span class="err" data-err-for="f-name"></span>
            </div>
            <div class="field">
              <label for="f-phone">Phone</label>
              <input id="f-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" required>
              <span class="err" data-err-for="f-phone"></span>
            </div>
            <div class="field full">
              <label for="f-email">Email</label>
              <input id="f-email" name="email" type="email" autocomplete="email" required>
              <span class="err" data-err-for="f-email"></span>
            </div>
            <div class="field full">
              <label for="f-track">Track</label>
              <select id="f-track" name="track" required>
                <option value="">Select a track…</option>
                <option>Applied Machine Learning</option>
                <option>Embedded &amp; IoT Systems</option>
                <option>Modern Web Engineering</option>
                <option>Cybersecurity Foundations</option>
                <option>Robotics &amp; Control</option>
              </select>
              <span class="err" data-err-for="f-track"></span>
            </div>
            
            <div class="field full" style="display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem;">
              <label style="margin:0;">Are you an IEEE Member?</label>
              <label style="display:flex; align-items:center; gap:0.3rem; font-size:0.8rem; cursor:pointer; color:var(--fg);">
                <input type="radio" name="is_ieee_member" value="Yes" onchange="toggleIeeeId(true)"> Yes
              </label>
              <label style="display:flex; align-items:center; gap:0.3rem; font-size:0.8rem; cursor:pointer; color:var(--fg);">
                <input type="radio" name="is_ieee_member" value="No" onchange="toggleIeeeId(false)" checked> No
              </label>
            </div>
            
            <div class="field full conditional-field" id="ieee-id-field" style="display:none;">
              <label for="f-ieee-id">IEEE Membership ID</label>
              <input id="f-ieee-id" name="ieee_id" type="text">
              <span class="err" data-err-for="f-ieee-id"></span>
            </div>
            
            <div class="field full">
              <label for="f-payment-method">Payment Method</label>
              <select id="f-payment-method" name="payment_method" required onchange="toggleUpiScreenshot()">
                <option value="">Select payment method…</option>
                <option value="upi">UPI Payment</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
              </select>
              <span class="err" data-err-for="f-payment-method"></span>
            </div>
            
            <div class="field full conditional-field" id="upi-screenshot-field" style="display:none;">
              <label>Upload UPI Payment Screenshot</label>
              <div class="upload-area" id="uploadArea" onclick="document.getElementById('f-screenshot').click()">
                <div id="uploadPlaceholder">
                  <span style="font-size: 1.5rem; display:block; margin-bottom: 0.5rem; color: var(--gold-1);">↑</span>
                  Click to upload screenshot
                </div>
                <img id="uploadPreview" src="" alt="Screenshot Preview" style="display:none; max-width: 100%; max-height: 200px; border-radius: 8px; margin: 0 auto;">
              </div>
              <input id="f-screenshot" name="screenshot" type="file" accept="image/*" style="display:none;" onchange="previewImage(this)">
              <span class="err" data-err-for="f-screenshot"></span>
            </div>

            <div class="field full">
              <label for="f-note">Anything we should know? (optional)</label>
              <textarea id="f-note" name="note" rows="3"></textarea>
            </div>
          </div>
          <button class="btn btn-gold" type="submit" style="margin-top:1.2rem; width:100%;">Submit Registration</button>
          <p class="form-status" id="formStatus" role="status" hidden></p>
        </form>`;

content = content.replace(
  /<form class="card static reveal" id="regForm" novalidate style="--d:0ms">[\s\S]*?<\/form>/,
  newFormHtml
);

// 7. Inject specific CSS for new form elements
const extraCss = `
/* --- New Form & Pricing Styles --- */
.upload-area {
  border: 2px dashed var(--line);
  border-radius: 11px;
  background: rgba(0,0,0,.2);
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: all .3s ease;
  color: var(--fg-dim);
  font-size: 0.85rem;
}
.upload-area:hover {
  border-color: var(--gold-1);
  background: rgba(0,0,0,.4);
}
.conditional-field {
  transition: all 0.3s ease;
}
input[type="radio"] {
  accent-color: var(--gold-1);
  width: 16px;
  height: 16px;
}
`;

content = content.replace('/* ============================================================\n   ID CARD — PREMIUM EVENT BADGE', extraCss + '\n/* ============================================================\n   ID CARD — PREMIUM EVENT BADGE');

// 8. Remove Admin block JS
content = content.replace(
  /\/\* ----------------------------------------------------------\s*5\. ADMIN BLOCK\s*---------------------------------------------------------- \*\/[\s\S]*?\/\* ----------------------------------------------------------\s*6\. REGISTRATION FORM \(client-side validation only\)\s*---------------------------------------------------------- \*\//,
  `/* ----------------------------------------------------------
     6. REGISTRATION FORM (client-side validation only)
     ---------------------------------------------------------- */`
);

// 9. Inject Form Logic (toggle fields, preview image)
const extraJs = `
  window.toggleIeeeId = function(isMember) {
    const field = document.getElementById('ieee-id-field');
    const input = document.getElementById('f-ieee-id');
    if(isMember) {
      field.style.display = 'block';
      input.setAttribute('required', 'true');
    } else {
      field.style.display = 'none';
      input.removeAttribute('required');
      input.value = '';
    }
  };

  window.toggleUpiScreenshot = function() {
    const method = document.getElementById('f-payment-method').value;
    const field = document.getElementById('upi-screenshot-field');
    const input = document.getElementById('f-screenshot');
    if(method === 'upi') {
      field.style.display = 'block';
      input.setAttribute('required', 'true');
    } else {
      field.style.display = 'none';
      input.removeAttribute('required');
      input.value = '';
      document.getElementById('uploadPreview').style.display = 'none';
      document.getElementById('uploadPlaceholder').style.display = 'block';
    }
  };

  window.previewImage = function(input) {
    if (input.files && input.files[0]) {
      var reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('uploadPlaceholder').style.display = 'none';
        const preview = document.getElementById('uploadPreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
      reader.readAsDataURL(input.files[0]);
    }
  };
`;

content = content.replace(
  /const form\s*=\s*document\.getElementById\('regForm'\);/,
  extraJs + '\n  const form   = document.getElementById(\'regForm\');'
);

// Update validation rules to match new form fields
content = content.replace(
  /const rules = \{[\s\S]*?\};/,
  `const rules = {
    'f-name'   : v => v.trim().length >= 3 || 'Please enter your full name.',
    'f-phone'  : v => /^[0-9+\\-\\s]{10,15}$/.test(v.trim()) || 'Enter a valid phone number.',
    'f-email'  : v => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v.trim()) || 'Enter a valid email address.',
    'f-track'  : v => !!v || 'Choose a track.',
    'f-payment-method': v => !!v || 'Choose a payment method.',
    'f-ieee-id': v => {
      const radio = document.querySelector('input[name="is_ieee_member"]:checked');
      if(radio && radio.value === 'Yes') {
         return v.trim().length > 0 || 'IEEE Membership ID is required.';
      }
      return true;
    },
    'f-screenshot': v => {
      if(document.getElementById('f-payment-method').value === 'upi') {
         const input = document.getElementById('f-screenshot');
         return (input.files && input.files.length > 0) || 'Screenshot is required for UPI payment.';
      }
      return true;
    }
  };`
);

// Fix ID card bindings since college is gone (if it's gone... wait, I kept it removed from form)
// The user didn't ask to remove college, but they only listed "name of student, phone number, payment method, membership". 
// I should probably keep college or map it carefully. 
// Actually, let me remove college mapping or add it back to the form? I'll remove the college mapping from JS.
content = content.replace(
  /idCardCollege\.textContent = data\.college\.trim\(\);/,
  `// idCardCollege.textContent = data.college.trim(); // Removed`
);

content = content.replace(
  /idCardTicket\.textContent  = data\.ticket;/,
  `idCardTicket.textContent  = data.is_ieee_member === 'Yes' ? 'IEEE Member' : 'Non-Member';`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated index.html');
