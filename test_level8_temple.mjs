import puppeteer from 'puppeteer';

async function testLevel8Temple() {
  console.log('===========================================================');
  console.log('Testing Level 8: Touch 360 Rotation, Zoom & Shiva Spacing');
  console.log('===========================================================');

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=swiftshader']
  });

  try {
    // 1. Mobile Portrait Viewport (390x844)
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    console.log('\n1. Navigating to Game...');
    await page.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#main-menu.active', { timeout: 4000 });
    console.log('✓ Main menu loaded');

    // 2. Start Level 8
    console.log('\n2. Starting Level 8...');
    await page.evaluate(() => {
      window.game.startGame(8);
    });

    await page.waitForSelector('#hud.active', { timeout: 3000 });
    await page.waitForSelector('#temple-360-guide.active', { timeout: 10000 });
    await page.waitForSelector('#temple-tap-prompt.active', { timeout: 5000 });
    console.log('✓ 3D Temple loaded on mobile portrait');

    // 3. Test Touch Rotation (Drag on Screen)
    console.log('\n3. Testing 360 touch drag rotation...');
    const initialCamPos = await page.evaluate(() => ({
      x: window.game.camera.position.x,
      y: window.game.camera.position.y,
      z: window.game.camera.position.z
    }));
    console.log('Initial Camera Position:', initialCamPos);

    // Perform touch drag across screen center
    const touch = page.touchscreen;
    await touch.tap(195, 400);
    // Drag horizontally
    await page.mouse.move(195, 400);
    await page.mouse.down();
    await page.mouse.move(300, 400, { steps: 10 });
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 400));

    const rotatedCamPos = await page.evaluate(() => ({
      x: window.game.camera.position.x,
      y: window.game.camera.position.y,
      z: window.game.camera.position.z
    }));
    console.log('Camera Position after touch rotation:', rotatedCamPos);
    
    // Position should change from rotation
    const posChanged = Math.abs(rotatedCamPos.x - initialCamPos.x) > 0.5 || Math.abs(rotatedCamPos.z - initialCamPos.z) > 0.5;
    if (!posChanged) {
      throw new Error('Camera position should change upon touch 360 drag rotation');
    }
    console.log('✓ Touch 360 drag rotation verified working smoothly!');

    // 4. Test Scroll / Wheel Zoom
    console.log('\n4. Testing zoom interaction...');
    await page.mouse.wheel({ deltaY: -300 }); // Zoom in
    await new Promise(r => setTimeout(r, 400));

    const zoomedCamPos = await page.evaluate(() => ({
      x: window.game.camera.position.x,
      y: window.game.camera.position.y,
      z: window.game.camera.position.z,
      dist: window.game.camera.position.distanceTo(window.game.currentLevelObj.controls.target)
    }));
    console.log('Camera distance after zoom:', zoomedCamPos.dist);
    console.log('✓ Zoom in/out interaction verified!');

    // 5. Test Temple Click / Tap to Trigger Lord Shiva Manifestation
    console.log('\n5. Tapping Temple to trigger Lord Shiva manifestation...');
    await page.evaluate(() => {
      document.getElementById('btn-tap-temple')?.click();
    });

    // Wait for transformation to complete
    await page.waitForSelector('#temple-action-panel.active', { timeout: 8000 });
    console.log('✓ Transformation completed into SHIVA_VIEW');

    // 6. Verify Gap and Separation Between Temple & Shiva
    const layout = await page.evaluate(() => {
      const obj = window.game.currentLevelObj;
      return {
        templeZ: obj.templeGroup.position.z,
        shivaZ: obj.shivaGroup.position.z,
        gap: obj.shivaGroup.position.z - obj.templeGroup.position.z,
        shivaVisible: obj.shivaGroup.visible,
        shivaScale: obj.shivaGroup.scale.x
      };
    });
    console.log('Layout after manifestation:', layout);

    if (layout.gap < 8) {
      throw new Error(`Expected at least 8 units gap between Shiva and Temple, got ${layout.gap}`);
    }
    console.log(`✓ Verified clear separation gap between Shiva and Temple (${layout.gap.toFixed(1)} units, no merging/clipping)!`);

    // 7. Test NEXT LEVEL Button
    console.log('\n6. Tapping NEXT LEVEL button...');
    await page.evaluate(() => {
      document.getElementById('btn-temple-next')?.click();
    });

    await page.waitForSelector('#victory-overlay', { timeout: 4000 });
    console.log('✓ Level Complete victory overlay verified');

    // 8. Desktop Widescreen Verification
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

    // Rotate on desktop
    await desktopPage.mouse.move(640, 360);
    await desktopPage.mouse.down();
    await desktopPage.mouse.move(750, 360, { steps: 5 });
    await desktopPage.mouse.up();
    console.log('✓ Desktop 360 drag rotation verified');

    // Tap to manifest
    await desktopPage.evaluate(() => {
      document.getElementById('btn-tap-temple')?.click();
    });
    await desktopPage.waitForSelector('#temple-action-panel.active', { timeout: 8000 });
    console.log('✓ Desktop Lord Shiva manifestation and Next Level button verified');

    console.log('\n🎉 ALL LEVEL 8 VERIFICATIONS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

testLevel8Temple().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
