const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove Highlights Section
// It starts with <!-- event highlights — first section AFTER the room, on the plain dark bg -->
// and ends with <div class="rule"></div> just before ABOUT
content = content.replace(
  /<!-- event highlights[\s\S]*?<\/section>\s*<div class="rule"><\/div>\s*/,
  ''
);

// 2. Remove Tracks Section
// It starts with <!-- ============ 3. EVENT TRACKS, KEYNOTES & WORKSHOPS ============ -->
// and ends with <div class="rule"></div> just before TIMELINE
content = content.replace(
  /<!-- ============ 3\. EVENT TRACKS, KEYNOTES & WORKSHOPS ============ -->[\s\S]*?<\/section>\s*<div class="rule"><\/div>\s*/,
  ''
);

// 3. Add Dummy Pricing Details
// Let's add some dummy text to the pricing section.
// Or maybe a dummy pricing package.
// User said "add a demi pricing details in the site".
// Let's replace the pricing section text with some dummy text, or add dummy feature details.
content = content.replace(
  /<p class="lede">Seats are allotted per track on a first-come basis\. Confirmation and payment instructions are emailed within 24 hours\.<\/p>/,
  `<p class="lede">Seats are allotted per track on a first-come basis. Confirmation and payment instructions are emailed within 24 hours.</p>
        <p class="lede" style="color: var(--fg-dim); font-size: 0.9rem; margin-top: 1rem;">
          Dummy pricing details: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
          This is a placeholder for any additional demi/dummy pricing details required for the event.
        </p>`
);

// We should also remove 'Events' from navlinks since we removed the events track section
content = content.replace(
  /<a href="#events">Events<\/a>\s*/,
  ''
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated index.html');
