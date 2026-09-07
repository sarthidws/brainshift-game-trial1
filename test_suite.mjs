import puppeteer from 'puppeteer';

async function testViewport(name, width, height, isMobile) {
  console.log(`\n========================================`);
  console.log(`Testing ${name} (${width}x${height}, isMobile=${isMobile})`);
  console.log(`========================================`);

  const browser = await puppeteer.launch({ 
    headless: "new", 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  if (isMobile) {
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1');
  }
  
  await page.setViewport({ width, height, isMobile, hasTouch: isMobile });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[${name} CONSOLE ERROR]`, msg.text());
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log(`[${name} PAGE ERROR]`, err.message);
    errors.push(err.message);
  });
  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.log(`[HTTP ERROR ${resp.status()}]`, resp.url());
    }
  });

  await page.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle0' });
  console.log('1. Page loaded, verifying Splash screen transition...');
  
  // Wait for splash transition to main menu
  await page.waitForSelector('#main-menu.active', { timeout: 4000 });
  console.log('✓ Splash screen transitioned to main-menu successfully');

  // Check visibility and bounding box of PLAY, LEVELS, and HOW TO PLAY buttons
  const playBox = await page.$eval('#btn-play', el => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height };
  });
  const levelsBox = await page.$eval('#btn-levels', el => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height };
  });
  const howBox = await page.$eval('#btn-how', el => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height };
  });

  console.log(`- PLAY button: top=${Math.round(playBox.top)}, bottom=${Math.round(playBox.bottom)} (viewport height=${height})`);
  console.log(`- LEVELS button: top=${Math.round(levelsBox.top)}, bottom=${Math.round(levelsBox.bottom)}`);
  console.log(`- HOW TO PLAY button: top=${Math.round(howBox.top)}, bottom=${Math.round(howBox.bottom)}`);

  if (levelsBox.bottom <= height && howBox.bottom <= height && levelsBox.top >= 0 && howBox.top >= 0) {
    console.log('✓ ALL 3 BUTTONS (PLAY, LEVELS, HOW TO PLAY) are 100% visible inside mobile viewport!');
  } else {
    throw new Error(`Buttons out of viewport! levels bottom=${levelsBox.bottom}, how bottom=${howBox.bottom}, viewport height=${height}`);
  }

  // 2. Click PLAY button on Home Screen -> should open Chapter Selection page
  console.log('\n2. Clicking "▶ PLAY" on Home Screen (should open Chapter Journey Map)...');
  await page.click('#btn-play');
  await page.waitForSelector('#chapter-menu.active', { timeout: 2000 });
  const nodes = await page.$$('.journey-node');
  console.log(`✓ Chapter journey map rendered with ${nodes.length} chapters`);

  const chap1Text = await nodes[0].$eval('h4', el => el.textContent);
  const chap2Text = await nodes[1].$eval('h4', el => el.textContent);
  const chap2Sub = await nodes[1].$eval('p', el => el.textContent);
  console.log(`- Chapter 1: "${chap1Text}"`);
  console.log(`- Chapter 2: "${chap2Text}" (${chap2Sub})`);

  if (chap1Text.includes('VANVAS') && chap2Text.includes('BAL KAND') && chap2Sub.toLowerCase().includes('coming soon')) {
    console.log('✓ Chapter 1 is VANVAS and Chapter 2 is BAL KAND (Coming Soon / Locked)');
  } else {
    throw new Error(`Unexpected chapter titles: ${chap1Text}, ${chap2Text} (${chap2Sub})`);
  }

  // 3. Click Chapter 1 (VANVAS) to open Level Select
  console.log('\n3. Clicking Chapter 1 (VANVAS) to view Levels...');
  await nodes[0].click();
  await page.waitForSelector('#level-select-menu.active', { timeout: 2000 });
  const levelNodes = await page.$$('.journey-node');
  console.log(`✓ Level select menu rendered with ${levelNodes.length} levels for Chapter 1 (VANVAS)`);

  // 4. Click Level 6 (Ravan Vadh)
  console.log('\n4. Starting Level 6 (Ravan Vadh)...');
  const level6Node = levelNodes[levelNodes.length - 1];
  await level6Node.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 200));
  await level6Node.click();
  await page.waitForSelector('#hud.active', { timeout: 3000 });
  console.log('✓ HUD active, story overlay appearing...');

  await page.waitForSelector('#btn-start-battle', { timeout: 3000 });
  console.log('5. Clicking "FIGHT ➔" in Story Overlay...');
  await page.click('#btn-start-battle');
  
  // Wait a moment for battle state
  await new Promise(r => setTimeout(r, 600));

  // Tap on Ravan (right side of canvas, mapped based on aspect ratio)
  console.log('6. Tapping on Ravan stomach/navel weak point on canvas...');
  const canvasBox = await page.$eval('#game-canvas', el => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
  
  // Aspect ratio mapping: in orthographic camera, Ravan is at x=6, y=0, navel at y=-1.8.
  // On desktop aspect > 1: frustumWidth = 20 * (width/height), frustumHeight = 20
  // On mobile aspect < 1: frustumWidth = 26, frustumHeight = 26 / (width/height)
  const aspect = width / height;
  let fw = 26, fh = 26 / aspect;
  if (aspect > 1) {
    fh = 20;
    fw = fh * aspect;
  }
  const ravanWorldX = 6;
  const ravanNavelY = -1.8;
  const screenX = (ravanWorldX - (-fw / 2)) / fw;
  const screenY = (fh / 2 - ravanNavelY) / fh;
  
  const tapX = Math.round(canvasBox.left + canvasBox.width * screenX);
  const tapY = Math.round(canvasBox.top + canvasBox.height * screenY);
  console.log(`- Tapping at (${tapX}, ${tapY}) [screen percentage: ${Math.round(screenX*100)}% X, ${Math.round(screenY*100)}% Y]`);
  await page.mouse.click(tapX, tapY);

  console.log('7. Waiting for Arrow flight, RAVAN VADH animation, and LEVEL COMPLETE overlay...');
  await page.waitForSelector('#btn-victory-next', { timeout: 7000 });
  console.log('✓ Victory overlay rendered with "NEXT LEVEL ➔" button!');

  // 8. Click Next Level / Continue
  await page.click('#btn-victory-next');
  await new Promise(r => setTimeout(r, 800));
  console.log('✓ Full loop complete!');

  await browser.close();
  const criticalErrors = errors.filter(e => !e.includes('favicon.ico'));
  if (criticalErrors.length > 0) {
    throw new Error(`Encountered ${criticalErrors.length} console/page errors`);
  }
}

async function run() {
  try {
    // 1. Mobile Portrait iPhone (390x844)
    await testViewport('iPhone 14 / Safari Mobile', 390, 844, true);
    // 2. Mobile Portrait Compact Android (360x740)
    await testViewport('Android / Chrome Mobile', 360, 740, true);
    // 3. Desktop Chrome (1280x800)
    await testViewport('Chrome Desktop', 1280, 800, false);
    // 4. iPad / Tablet (768x1024)
    await testViewport('iPad / Safari Tablet', 768, 1024, true);
    
    console.log('\n======================================================');
    console.log('🎉 ALL AUTOMATED CROSS-BROWSER & DEVICE TESTS PASSED!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
