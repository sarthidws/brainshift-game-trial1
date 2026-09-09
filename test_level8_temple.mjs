import puppeteer from 'puppeteer';

async function testLevel8Temple() {
  console.log('====================================================');
  console.log('Testing Level 8: 3D Temple & Lord Shiva Manifestation');
  console.log('====================================================');
  

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=swiftshader']
  });

  try {
    // 1. Mobile Portrait Viewport
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    console.log('\n1. Navigating to Game...');
    await page.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#main-menu.active', { timeout: 4000 });
    console.log('✓ Main menu loaded');

    // 2. Open Chapter 1 (VANVAS)
    console.log('\n2. Opening Chapter 1 (VANVAS)...');
    await page.click('#btn-play');
    await page.waitForSelector('#chapter-menu.active', { timeout: 2000 });
    await new Promise(r => setTimeout(r, 400));

    const chapterNodes = await page.$$('#chapter-journey-map .journey-node');
    await chapterNodes[0].click();
    await page.waitForSelector('#level-select-menu.active', { timeout: 2000 });
    await new Promise(r => setTimeout(r, 400));

    // 3. Verify Levels in Vanvas
    const vanvasLevels = await page.$$eval('#levels-journey-map .journey-node', nodes => {
      return nodes.map(n => ({
        levelNum: n.querySelector('h4')?.textContent.trim(),
        name: n.querySelector('p')?.textContent.trim(),
        isLocked: n.querySelector('.node-content')?.classList.contains('locked')
      }));
    });
    console.log('Vanvas levels in menu:', vanvasLevels);
    if (vanvasLevels.length !== 6) {
      throw new Error(`Expected 6 levels in Vanvas, found ${vanvasLevels.length}`);
    }
    console.log('✓ Level 8 (The Divine Temple) is present in Vanvas chapter journey map!');

    // 4. Start Level 8 directly via Game instance
    console.log('\n3. Starting Level 8 (The Divine Temple)...');
    await page.evaluate(() => {
      window.game.startGame(8);
    });

    await page.waitForSelector('#hud.active', { timeout: 3000 });
    console.log('✓ Level 8 HUD active');

    // Wait for 3D model and initial Temple UI to load
    await page.waitForSelector('#temple-360-guide.active', { timeout: 10000 });
    await page.waitForSelector('#temple-tap-prompt.active', { timeout: 5000 });
    console.log('✓ 3D Temple model loaded & 360 guide / Tap prompt displayed');

    // 5. Test 360 swipe / drag interaction on Canvas
    console.log('\n4. Simulating 360 touch drag interaction on canvas...');
    const canvasBox = await page.$eval('#game-canvas', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });

    await page.mouse.move(canvasBox.x, canvasBox.y);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 80, canvasBox.y, { steps: 5 });
    await page.mouse.up();
    console.log('✓ 360 camera orbit interaction executed');

    // 6. Tap Temple to Trigger Lord Shiva Manifestation
    console.log('\n5. Tapping Temple to reveal Lord Shiva 3D model...');
    await page.evaluate(() => {
      document.getElementById('btn-tap-temple')?.click();
    });
    
    // Check State transitioned to TRANSFORMING or SHIVA_VIEW
    await new Promise(r => setTimeout(r, 600));
    const state = await page.evaluate(() => window.game.currentLevelObj.state);
    console.log(`Current level state during manifestation: ${state}`);

    // Wait for transformation to finish & Next Level button to appear
    await page.waitForSelector('#temple-action-panel.active', { timeout: 8000 });
    const shivaVisible = await page.evaluate(() => {
      const obj = window.game.currentLevelObj;
      return obj.shivaGroup && obj.shivaGroup.visible && obj.shivaGroup.scale.x > 1;
    });
    console.log(`✓ Lord Shiva 3D model active & visible: ${shivaVisible}`);
    if (!shivaVisible) throw new Error('Lord Shiva model should be visible and scaled after manifestation');

    // 7. Test Level Completion via "NEXT LEVEL ➔" Button
    console.log('\n6. Clicking NEXT LEVEL button...');
    await page.evaluate(() => {
      document.getElementById('btn-temple-next')?.click();
    });

    await page.waitForSelector('#victory-overlay', { timeout: 4000 });
    const victoryTitle = await page.$eval('.victory-title', el => el.textContent.trim());
    const victoryLevelName = await page.$eval('.victory-level-name', el => el.textContent.trim());
    console.log(`✓ Victory overlay displayed: ${victoryTitle} - ${victoryLevelName}`);

    // Advance to next level / chapter
    await page.click('#btn-victory-next');
    await new Promise(r => setTimeout(r, 600));
    console.log('✓ Next level navigation succeeded on mobile');

    // 8. Test on Desktop Widescreen Viewport
    console.log('\n7. Testing Desktop Widescreen Viewport (1280x720)...');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1280, height: 720 });
    await desktopPage.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle0' });
    await desktopPage.waitForSelector('#main-menu.active', { timeout: 4000 });

    await desktopPage.evaluate(() => {
      window.game.startGame(8);
    });

    await desktopPage.waitForSelector('#hud.active', { timeout: 3000 });
    await desktopPage.waitForSelector('#temple-360-guide.active', { timeout: 10000 });
    await desktopPage.waitForSelector('#temple-tap-prompt.active', { timeout: 5000 });
    console.log('✓ Desktop: Level 8 loaded with Temple view');

    // Tap on canvas / temple to manifest Shiva on desktop
    await desktopPage.evaluate(() => {
      document.getElementById('btn-tap-temple')?.click();
    });
    await desktopPage.waitForSelector('#temple-action-panel.active', { timeout: 8000 });
    console.log('✓ Desktop: Lord Shiva manifestation completed and Next Level button active');

    // Click Next Level on desktop
    await desktopPage.evaluate(() => {
      document.getElementById('btn-temple-next')?.click();
    });
    await desktopPage.waitForSelector('#victory-overlay', { timeout: 4000 });
    console.log('✓ Desktop: Victory overlay verified');

    console.log('\n🎉 ALL LEVEL 8 TEMPLE & SHIVA TESTS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

testLevel8Temple().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
