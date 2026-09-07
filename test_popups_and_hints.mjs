import puppeteer from 'puppeteer';

async function testPopupsAndHints() {
  console.log('==============================================');
  console.log('Testing Level Completion Popup & Hint Displays');
  console.log('==============================================');

  const browser = await puppeteer.launch({ 
    headless: "new", 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#main-menu.active', { timeout: 4000 });
  console.log('✓ Home screen loaded');

  // Navigate: Main Menu -> Chapters -> Level 1 (Sun and Hanuman)
  await page.click('#btn-play');
  await page.waitForSelector('#chapter-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));
  const chapterNodes = await page.$$('#chapter-journey-map .journey-node');
  await chapterNodes[0].click(); // Vanvas
  await page.waitForSelector('#level-select-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));
  const levelNodes = await page.$$('#levels-journey-map .journey-node');
  await levelNodes[0].click(); // Level 1
  await page.waitForSelector('#hud.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 500));
  console.log('✓ In-Game HUD and Level 1 loaded');

  // 1. Test Hint Popup Display & Interaction
  console.log('\n1. Testing Hint Popup...');
  const hintCardExists = await page.$('#game-hint-card');
  if (!hintCardExists) throw new Error('Hint card element not found in DOM');

  // Click Hint Button
  await page.click('#hud-hint');
  await page.waitForSelector('#game-hint-card.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));

  const hintTitle = await page.$eval('.hint-title-text', el => el.textContent.trim());
  const hintBody = await page.$eval('.hint-card-body', el => el.textContent.trim());
  const creditsAfterFirstHint = await page.$eval('#hud-hint-count', el => el.textContent.trim());

  console.log(`✓ Hint Popup Opened! Title: "${hintTitle}", Text: "${hintBody}"`);
  console.log(`✓ Credit deducted properly on first reveal: ${creditsAfterFirstHint} credits remaining`);

  if (hintTitle !== 'HINT') throw new Error(`Expected hint title 'HINT', got '${hintTitle}'`);
  if (!hintBody || hintBody.length === 0) throw new Error('Hint body text is empty');
  if (creditsAfterFirstHint !== '19') throw new Error(`Expected credits 19, got ${creditsAfterFirstHint}`);

  // Take screenshot of Hint Popup over level background
  await page.screenshot({ path: '/home/pc1202/.gemini/antigravity-ide/brain/978201da-84e1-4e61-a777-cb13fcacce2c/test_hint_popup_mobile.png' });
  console.log('✓ Screenshot of Hint popup saved');

  // Close hint via close button
  await page.click('#btn-close-hint');
  await new Promise(r => setTimeout(r, 350));
  const isHintActiveAfterClose = await page.$eval('#game-hint-card', el => el.classList.contains('active'));
  if (isHintActiveAfterClose) throw new Error('Hint card did not close when close button was clicked');
  console.log('✓ Hint popup closed smoothly via Close button (✕)');

  // Re-open hint - should NOT deduct credits again
  await page.click('#hud-hint');
  await page.waitForSelector('#game-hint-card.active', { timeout: 2000 });
  const creditsOnSecondOpen = await page.$eval('#hud-hint-count', el => el.textContent.trim());
  if (creditsOnSecondOpen !== '19') throw new Error(`Credits deducted again unexpectedly: ${creditsOnSecondOpen}`);
  console.log('✓ Re-opening hint does not re-deduct credits (remains 19)');

  // Close hint via toggle click
  await page.click('#hud-hint');
  await new Promise(r => setTimeout(r, 350));
  const isHintActiveAfterToggle = await page.$eval('#game-hint-card', el => el.classList.contains('active'));
  if (isHintActiveAfterToggle) throw new Error('Hint card did not close when toggled');
  console.log('✓ Hint popup closed smoothly via Hint button toggle');

  // 2. Test Level Completion Popup
  console.log('\n2. Testing Level Completion Popup...');
  // Trigger showSuccess() directly on game instance in page
  await page.evaluate(() => {
    window.game.showSuccess();
  });

  await page.waitForSelector('#victory-overlay', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 500));

  const victoryTitle = await page.$eval('.victory-title', el => el.textContent.trim());
  const victoryLevelName = await page.$eval('.victory-level-name', el => el.textContent.trim());
  const victoryReward = await page.$eval('.victory-reward-pill', el => el.textContent.trim());
  const nextBtnText = await page.$eval('#btn-victory-next', el => el.textContent.trim());

  console.log(`✓ Victory Overlay Appeared! Title: "${victoryTitle}"`);
  console.log(`✓ Level Name: "${victoryLevelName}"`);
  console.log(`✓ Reward Pill: "${victoryReward}"`);
  console.log(`✓ Next Button: "${nextBtnText}"`);

  if (!victoryTitle.includes('LEVEL COMPLETE')) throw new Error(`Unexpected title: ${victoryTitle}`);
  if (!victoryLevelName || victoryLevelName.length === 0) throw new Error('Victory level name is missing');
  if (!victoryReward.includes('Credits')) throw new Error('Victory reward pill missing credits text');

  // Screenshot Mobile Victory Overlay
  await page.screenshot({ path: '/home/pc1202/.gemini/antigravity-ide/brain/978201da-84e1-4e61-a777-cb13fcacce2c/test_victory_popup_mobile.png' });
  console.log('✓ Screenshot of Victory popup saved (Mobile)');

  // Click Next Level
  await page.click('#btn-victory-next');
  await new Promise(r => setTimeout(r, 600));

  const newLevelTitle = await page.$eval('.game-header div[style*="text-transform: uppercase"]', el => el.textContent.trim());
  console.log(`✓ Successfully advanced to next level: "${newLevelTitle}"`);

  await page.close();

  // Test Desktop Viewport in new clean page
  console.log('\n3. Testing on Desktop Viewport...');
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1280, height: 720, isMobile: false });
  await desktopPage.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle0' });
  await desktopPage.waitForSelector('#main-menu.active', { timeout: 4000 });

  await desktopPage.click('#btn-play');
  await desktopPage.waitForSelector('#chapter-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));
  const dChapterNodes = await desktopPage.$$('#chapter-journey-map .journey-node');
  await dChapterNodes[0].click();
  await desktopPage.waitForSelector('#level-select-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));
  const dLevelNodes = await desktopPage.$$('#levels-journey-map .journey-node');
  await dLevelNodes[0].click();
  await desktopPage.waitForSelector('#hud.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  
  // Click Hint on Desktop
  await desktopPage.click('#hud-hint');
  await desktopPage.waitForSelector('#game-hint-card.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));
  await desktopPage.screenshot({ path: '/home/pc1202/.gemini/antigravity-ide/brain/978201da-84e1-4e61-a777-cb13fcacce2c/test_hint_popup_desktop.png' });
  console.log('✓ Screenshot of Hint popup saved (Desktop)');
  await desktopPage.click('#btn-close-hint');

  // Trigger Victory on Desktop
  await desktopPage.evaluate(() => {
    window.game.showSuccess();
  });
  await desktopPage.waitForSelector('#victory-overlay', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  await desktopPage.screenshot({ path: '/home/pc1202/.gemini/antigravity-ide/brain/978201da-84e1-4e61-a777-cb13fcacce2c/test_victory_popup_desktop.png' });
  console.log('✓ Screenshot of Victory popup saved (Desktop)');

  await desktopPage.close();
  await browser.close();
  console.log('\n======================================================');
  console.log('🎉 ALL POPUP & HINT TESTS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

testPopupsAndHints().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
