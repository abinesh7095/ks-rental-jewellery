import fs from 'fs';
import path from 'path';

const src = String.raw`C:\Users\kinga\.gemini\antigravity\brain\cbdd9cd3-7813-4cfd-b4c0-8e2f59f7e127\media__1778144263587.jpg`;
const dest1 = path.join(import.meta.dirname, 'public', 'logo.jpg');
const dest2 = path.join(import.meta.dirname, 'src', 'components', 'logo.jpeg');

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest1);
    console.log('✅ Logo copied to public/logo.jpg');
    fs.copyFileSync(src, dest2);
    console.log('✅ Logo copied to src/components/logo.jpeg');
  } else {
    console.log('⚠️ Source logo not found, skipping');
  }
} catch (e) {
  console.log('⚠️ Could not copy logo:', e.message);
}
