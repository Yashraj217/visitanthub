const sharp = require('sharp');
const path  = require('path');

const ASSETS = path.join(__dirname, 'mobile/assets');

// Clean, bold person avatar icon that reads clearly at small sizes
// Design: large white avatar (head + shoulders) + small green checkmark badge
function makeIconSvg(size, bgColor, iconColor, transparent) {
  const s = size;
  const r = Math.round(s * 0.22);

  const bg = transparent
    ? ''
    : `<rect width="${s}" height="${s}" rx="${r}" ry="${r}" fill="${bgColor}"/>`;

  const cx = s * 0.5;
  const cy = s * 0.5;

  // Head circle — big and centered, shifted slightly up
  const headR  = s * 0.19;
  const headCy = cy - s * 0.08;

  // Shoulders / body — wide arc at bottom
  const bodyRx = s * 0.31;
  const bodyRy = s * 0.22;
  const bodyCy = cy + s * 0.30;

  // Clip the body at the bottom of the icon
  const clipBottom = s * 0.87;

  const avatar = `
    <defs>
      <clipPath id="clip">
        <rect x="0" y="0" width="${s}" height="${clipBottom}"/>
      </clipPath>
    </defs>
    <circle cx="${cx}" cy="${headCy}" r="${headR}" fill="${iconColor}"/>
    <ellipse cx="${cx}" cy="${bodyCy}" rx="${bodyRx}" ry="${bodyRy}"
      fill="${iconColor}" clip-path="url(#clip)"/>
  `;

  // Checkmark badge — bottom right, clearly visible
  const badgeR  = s * 0.175;
  const badgeCx = cx + s * 0.255;
  const badgeCy = cy + s * 0.255;
  const strokeW = badgeR * 0.28;

  const badge = `
    <circle cx="${badgeCx}" cy="${badgeCy}" r="${badgeR}"
      fill="#22c55e" stroke="${transparent ? 'transparent' : bgColor}" stroke-width="${s * 0.02}"/>
    <polyline
      points="
        ${badgeCx - badgeR*0.42},${badgeCy}
        ${badgeCx - badgeR*0.05},${badgeCy + badgeR*0.38}
        ${badgeCx + badgeR*0.48},${badgeCy - badgeR*0.38}
      "
      fill="none" stroke="white"
      stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round"/>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  ${bg}${avatar}${badge}
</svg>`;
}

// Splash icon: white on transparent (shown on indigo background)
function makeSplashSvg(size) {
  return makeIconSvg(size, 'transparent', 'white', true);
}

async function generate() {
  const iconSvg = makeIconSvg(1024, '#6366f1', '#ffffff', false);
  await sharp(Buffer.from(iconSvg)).png().toFile(path.join(ASSETS, 'icon.png'));
  console.log('✓ icon.png');

  const fgSvg = makeIconSvg(1024, 'transparent', '#ffffff', true);
  await sharp(Buffer.from(fgSvg)).png().toFile(path.join(ASSETS, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png');

  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <rect width="1024" height="1024" fill="#6366f1"/>
  </svg>`;
  await sharp(Buffer.from(bgSvg)).png().toFile(path.join(ASSETS, 'android-icon-background.png'));
  console.log('✓ android-icon-background.png');

  const splashSvg = makeSplashSvg(512);
  await sharp(Buffer.from(splashSvg)).png().toFile(path.join(ASSETS, 'splash-icon.png'));
  console.log('✓ splash-icon.png');

  const monoSvg = makeSplashSvg(1024);
  await sharp(Buffer.from(monoSvg)).png().toFile(path.join(ASSETS, 'android-icon-monochrome.png'));
  console.log('✓ android-icon-monochrome.png');

  console.log('\nAll icons generated.');
}

generate().catch(console.error);
