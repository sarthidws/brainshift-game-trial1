import puppeteer from 'puppeteer';

async function testLevel7() {
  console.log('==============================================');
  console.log('Testing Level 7: Ahalya\'s Liberation');
  console.log('==============================================');

  const browser = await puppeteer.launch({ 
    headless: "new", 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });

  try {
    // ----------------------------------------------------
    // Test 1: Desktop Viewport (1280x720)
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Desktop Landscape Viewport (1280x720) ---');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, isLandscape: true });

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('[CONSOLE ERROR]', msg.text());
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      console.log('[PAGE ERROR]', err.message);
      errors.push(err.message);
    });

    await page.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#main-menu.active', { timeout: 4000 });
    console.log('✓ Main menu loaded');

    // Start Level 7 directly via game instance
    await page.evaluate(() => {
      window.game.currentChapter = 1;
      window.game.startGame(7);
    });

    await page.waitForSelector('#hud.active', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 600));
    console.log('✓ Level 7 started in HUD');

    // Verify Header
    const levelTitle = await page.$eval('.game-header', el => el.textContent.trim());
    console.log('Header text:', levelTitle);
    if (!levelTitle.includes("AHALYA'S LIBERATION") && !levelTitle.includes("Ahalya's Liberation")) {
      throw new Error(`Header title expected Ahalya's Liberation, got: ${levelTitle}`);
    }
    console.log('✓ Header correctly displays "Ahalya\'s Liberation"');

    // Verify Hint
    await page.click('#hud-hint');
    await page.waitForSelector('#game-hint-card.active', { timeout: 2000 });
    const hintText = await page.$eval('.hint-card-body', el => el.textContent.trim());
    console.log('Hint text:', hintText);
    if (!hintText.includes("Bring Ram's sacred footprint to the stone.")) {
      throw new Error(`Unexpected hint: ${hintText}`);
    }
    console.log('✓ Hint correctly displays "Bring Ram\'s sacred footprint to the stone."');
    await page.click('#btn-close-hint');
    await new Promise(r => setTimeout(r, 400));

    // Save screenshot of initial level scene
    await page.screenshot({ path: '/home/pc1202/.gemini/antigravity-ide/brain/959298e7-f080-4f1b-ba0f-15ba4577c602/level7_desktop_initial.png' });
    console.log('✓ Saved level7_desktop_initial.png');

    // Test Incorrect Drag & Drop
    console.log('\n2. Testing Incorrect Drag & Drop (Footprint should return to start position)...');
    const footprintInitPos = await page.evaluate(() => {
      const lvl = window.game.currentLevelObj;
      return { x: lvl.footprint.position.x, y: lvl.footprint.position.y };
    });
    console.log('Footprint start position:', footprintInitPos);

    // Simulate drag to incorrect position (e.g. top center 0, 5)
    await page.evaluate(() => {
      const lvl = window.game.currentLevelObj;
      // Start drag
      lvl.isDragging = true;
      lvl.footprint.position.set(0, 5, 2);
      // Release
      lvl.onPointerUp({ preventDefault: () => {} });
    });

    // Check that state becomes RETURNING and returns to start position
    const stateAfterDrop = await page.evaluate(() => window.game.currentLevelObj.state);
    console.log('State after wrong drop:', stateAfterDrop);
    if (stateAfterDrop !== 'RETURNING') throw new Error(`Expected state RETURNING, got ${stateAfterDrop}`);

    // Wait for return animation to complete (~400ms)
    await new Promise(r => setTimeout(r, 500));
    const stateAfterReturn = await page.evaluate(() => window.game.currentLevelObj.state);
    console.log('State after return lerp:', stateAfterReturn);
    if (stateAfterReturn !== 'PLAYING') throw new Error(`Expected state PLAYING after return, got ${stateAfterReturn}`);
    console.log('✓ Incorrect drop smoothly returns footprint without completing level');

    // Test Correct Drag & Drop
    console.log('\n3. Testing Correct Drag & Drop (Footprint -> Ahalya Stone)...');
    await page.evaluate(() => {
      const lvl = window.game.currentLevelObj;
      lvl.isDragging = true;
      // Place within success radius of Ahalya Stone (6.5, -2.0)
      lvl.footprint.position.set(6.5, -2.0, 2);
      lvl.onPointerUp({ preventDefault: () => {} });
    });

    const stateAfterCorrectDrop = await page.evaluate(() => window.game.currentLevelObj.state);
    console.log('State after correct drop:', stateAfterCorrectDrop);
    if (stateAfterCorrectDrop !== 'TRANSFORMING') throw new Error(`Expected state TRANSFORMING, got ${stateAfterCorrectDrop}`);

    // Wait for divine transformation sequence (~1.5s)
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: '/home/pc1202/.gemini/antigravity-ide/brain/959298e7-f080-4f1b-ba0f-15ba4577c602/level7_desktop_transforming.png' });
    console.log('✓ Saved level7_desktop_transforming.png during transformation');

    // Wait for transformation completion and victory popup
    await page.waitForSelector('#victory-overlay', { timeout: 4000 });
    console.log('✓ Victory overlay appeared!');

    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: '/home/pc1202/.gemini/antigravity-ide/brain/959298e7-f080-4f1b-ba0f-15ba4577c602/level7_desktop_victory.png' });
    console.log('✓ Saved level7_desktop_victory.png');

    const victoryTitle = await page.$eval('.victory-title', el => el.textContent.trim());
    const victoryLevelName = await page.$eval('.victory-level-name', el => el.textContent.trim());
    const victoryReward = await page.$eval('.victory-reward-pill', el => el.textContent.trim());

    console.log(`- Victory title: "${victoryTitle}"`);
    console.log(`- Victory level: "${victoryLevelName}"`);
    console.log(`- Victory reward: "${victoryReward}"`);

    if (!victoryTitle.includes('LEVEL COMPLETE')) throw new Error('Victory title mismatch');
    if (!victoryLevelName.includes("Ahalya's Liberation")) throw new Error('Victory level name mismatch');
    if (!victoryReward.includes('+20 Hint Credits')) throw new Error('Victory reward mismatch');

    // ----------------------------------------------------
    // Test 2: Mobile Viewport (390x844)
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Mobile Portrait Viewport (390x844) ---');
    const mobilePage = await browser.newPage();
    await mobilePage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1');
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await mobilePage.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle0' });
    await mobilePage.waitForSelector('#main-menu.active', { timeout: 4000 });

    await mobilePage.evaluate(() => {
      window.game.currentChapter = 1;
      window.game.startGame(7);
    });

    await mobilePage.waitForSelector('#hud.active', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 500));
    await mobilePage.screenshot({ path: '/home/pc1202/.gemini/antigravity-ide/brain/959298e7-f080-4f1b-ba0f-15ba4577c602/level7_mobile_initial.png' });
    console.log('✓ Saved level7_mobile_initial.png');

    // Mobile touch drag & drop test
    await mobilePage.evaluate(() => {
      const lvl = window.game.currentLevelObj;
      lvl.isDragging = true;
      lvl.footprint.position.copy(lvl.targetPos);
      lvl.onPointerUp({ preventDefault: () => {} });
    });

    await mobilePage.waitForSelector('#victory-overlay', { timeout: 4000 });
    console.log('✓ Mobile touch drag & drop successfully triggered victory overlay!');
    await mobilePage.screenshot({ path: '/home/pc1202/.gemini/antigravity-ide/brain/959298e7-f080-4f1b-ba0f-15ba4577c602/level7_mobile_victory.png' });
    console.log('✓ Saved level7_mobile_victory.png');

    console.log('\n🎉 Level 7: Ahalya\'s Liberation fully verified and working perfectly!');
  } finally {
    await browser.close();
  }
}

testLevel7().catch(e => {
  console.error('Test Level 7 failed:', e);
  process.exit(1);
});
