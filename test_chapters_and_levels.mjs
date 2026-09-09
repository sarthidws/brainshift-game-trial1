import puppeteer from 'puppeteer';

async function testChaptersAndLevels() {
  console.log('========================================');
  console.log('Testing Chapters & Levels Configuration');
  console.log('========================================');

  const browser = await puppeteer.launch({ 
    headless: "new", 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#main-menu.active', { timeout: 4000 });
  console.log('✓ Home screen loaded');

  // 1. Click Play / Levels to open Chapter Selection
  console.log('\n1. Navigating to Chapter Selection...');
  await page.click('#btn-play');
  await page.waitForSelector('#chapter-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));

  const chapterNodes = await page.$$eval('#chapter-journey-map .journey-node', nodes => {
    return nodes.map(n => ({
      title: n.querySelector('h4')?.textContent.trim(),
      subtitle: n.querySelector('p')?.textContent.trim(),
      isLocked: n.querySelector('.node-content')?.classList.contains('locked'),
      dotContent: n.querySelector('.node-dot')?.textContent.trim()
    }));
  });

  console.log('Chapter nodes found:', chapterNodes);
  if (chapterNodes.length !== 2) throw new Error(`Expected 2 chapters, found ${chapterNodes.length}`);
  if (chapterNodes[0].title !== 'VANVAS' || chapterNodes[0].isLocked) throw new Error('Chapter 1 should be VANVAS and unlocked');
  if (chapterNodes[1].title !== 'BAL KAND' || chapterNodes[1].isLocked) throw new Error('Chapter 2 should be BAL KAND and unlocked for selection');
  console.log('✓ Both Chapter 1 (VANVAS) and Chapter 2 (BAL KAND) are unlocked and in correct order!');

  // 2. Open Chapter 1 (VANVAS)
  console.log('\n2. Testing Chapter 1 (VANVAS) levels...');
  const nodes = await page.$$('#chapter-journey-map .journey-node');
  await nodes[0].click();
  await page.waitForSelector('#level-select-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));

  const vanvasTitle = await page.$eval('#level-menu-title', el => el.textContent.trim());
  console.log(`✓ Chapter title: ${vanvasTitle}`);

  const vanvasLevels = await page.$$eval('#levels-journey-map .journey-node', lNodes => {
    return lNodes.map(n => ({
      levelNum: n.querySelector('h4')?.textContent.trim(),
      name: n.querySelector('p')?.textContent.trim(),
      isLocked: n.querySelector('.node-content')?.classList.contains('locked'),
      dotContent: n.querySelector('.node-dot')?.textContent.trim()
    }));
  });
  console.log('Vanvas levels:', vanvasLevels);
  if (vanvasLevels.length !== 6) throw new Error(`Expected 6 levels in Vanvas, found ${vanvasLevels.length}`);
  if (vanvasLevels[0].isLocked) throw new Error('First level in Vanvas (Sun and Hanuman) should be unlocked');
  if (!vanvasLevels[1].isLocked || !vanvasLevels[2].isLocked || !vanvasLevels[3].isLocked || !vanvasLevels[4].isLocked || !vanvasLevels[5].isLocked) {
    throw new Error('Levels 2, 3, 4, 5, 6 in Vanvas should be locked initially');
  }
  console.log('✓ Vanvas levels 1-6 are ordered correctly and initial level is playable!');

  // 3. Back to Chapters and open Chapter 2 (BAL KAND)
  console.log('\n3. Testing Chapter 2 (BAL KAND) levels...');
  await page.click('#btn-back-levels');
  await page.waitForSelector('#chapter-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));

  const updatedNodes = await page.$$('#chapter-journey-map .journey-node');
  await updatedNodes[1].click();
  await page.waitForSelector('#level-select-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));

  const balkandTitle = await page.$eval('#level-menu-title', el => el.textContent.trim());
  console.log(`✓ Chapter title: ${balkandTitle}`);

  const balkandLevels = await page.$$eval('#levels-journey-map .journey-node', lNodes => {
    return lNodes.map(n => ({
      levelNum: n.querySelector('h4')?.textContent.trim(),
      name: n.querySelector('p')?.textContent.trim(),
      isLocked: n.querySelector('.node-content')?.classList.contains('locked'),
      dotContent: n.querySelector('.node-dot')?.textContent.trim()
    }));
  });
  console.log('Bal Kand levels:', balkandLevels);
  if (balkandLevels.length !== 2) throw new Error(`Expected 2 levels in Bal Kand, found ${balkandLevels.length}`);
  if (!balkandLevels[0].isLocked || balkandLevels[0].dotContent !== '🔒') {
    throw new Error('Bal Kand Level 1 (The First Arrow) must be locked by default!');
  }
  if (!balkandLevels[1].isLocked || balkandLevels[1].dotContent !== '🔒') {
    throw new Error('Bal Kand Level 2 (The Training Target) must be locked by default!');
  }
  console.log('✓ Bal Kand Levels 1 & 2 are both locked by default with 🔒!');

  // 4. Test Reset Progress
  console.log('\n4. Testing Reset Progress...');
  await page.click('#btn-back-levels');
  await page.waitForSelector('#chapter-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  await page.click('#btn-back-chapters');
  await page.waitForSelector('#main-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));

  // Open sidebar -> settings -> reset
  await page.click('#btn-menu');
  await page.waitForSelector('#sidebar-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));
  await page.click('#nav-settings');
  await page.waitForSelector('#settings-screen.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));

  await page.waitForSelector('#btn-open-reset-modal', { timeout: 2000 });
  await page.$eval('#btn-open-reset-modal', el => el.scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 300));
  await page.click('#btn-open-reset-modal');
  await page.waitForSelector('#reset-confirm-modal.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));
  await page.click('#btn-confirm-reset');
  await page.waitForSelector('#main-menu.active', { timeout: 3000 });
  await new Promise(r => setTimeout(r, 400));
  console.log('✓ Progress reset executed');

  // Verify Bal Kand is still locked after reset
  await page.click('#btn-play');
  await page.waitForSelector('#chapter-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));
  const postResetChapterNodes = await page.$$('#chapter-journey-map .journey-node');
  await postResetChapterNodes[1].click();
  await page.waitForSelector('#level-select-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));

  const postResetBalkandLevels = await page.$$eval('#levels-journey-map .journey-node', lNodes => {
    return lNodes.map(n => ({
      levelNum: n.querySelector('h4')?.textContent.trim(),
      name: n.querySelector('p')?.textContent.trim(),
      isLocked: n.querySelector('.node-content')?.classList.contains('locked'),
      dotContent: n.querySelector('.node-dot')?.textContent.trim()
    }));
  });
  console.log('Post-reset Bal Kand levels:', postResetBalkandLevels);
  if (!postResetBalkandLevels[0].isLocked || !postResetBalkandLevels[1].isLocked) {
    throw new Error('Bal Kand levels must remain locked by default after reset!');
  }
  console.log('✓ Bal Kand levels verified locked after reset!');

  await browser.close();
  console.log('\n🎉 All tests passed successfully!');
}

testChaptersAndLevels().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
