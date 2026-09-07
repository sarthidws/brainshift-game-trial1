import puppeteer from 'puppeteer';

async function testSidebar() {
  console.log(`\n========================================`);
  console.log(`Testing Sidebar Menu & All 5 Options`);
  console.log(`========================================`);

  const browser = await puppeteer.launch({ 
    headless: "new", 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#main-menu.active', { timeout: 4000 });
  console.log('✓ Home screen loaded');

  // 1. Open Sidebar
  console.log('\n1. Opening Sidebar via ☰ menu button...');
  await page.click('#btn-menu');
  await page.waitForSelector('#sidebar-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  console.log('✓ Sidebar drawer opened smoothly with active class');

  // 2. Test Hints & Points
  console.log('\n2. Testing "💡 Hints & Points" nav option...');
  await page.click('#nav-hints');
  await page.waitForSelector('#hints-screen.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  const creditVal = await page.$eval('#hints-page-credit-count', el => el.textContent.trim());
  console.log(`✓ Hints & Points screen opened! Available Credits: ${creditVal}`);
  await page.click('#btn-back-hints');
  await page.waitForSelector('#main-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  console.log('✓ Returned to Main Menu');

  // 3. Test Read Me
  console.log('\n3. Testing "📖 Read Me" nav option...');
  await page.click('#btn-menu');
  await page.waitForSelector('#sidebar-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  await page.click('#nav-readme');
  await page.waitForSelector('#readme-screen.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  const readmeCards = await page.$$('#readme-screen .htp-card');
  console.log(`✓ Read Me screen opened! Rendered ${readmeCards.length} guide sections`);
  await page.click('#btn-back-readme');
  await page.waitForSelector('#main-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  console.log('✓ Returned to Main Menu');

  // 4. Test Settings & Toggles
  console.log('\n4. Testing "⚙️ Settings" nav option & toggles...');
  await page.click('#btn-menu');
  await page.waitForSelector('#sidebar-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  await page.click('#nav-settings');
  await page.waitForSelector('#settings-screen.active', { timeout: 2000 });
  
  // Toggle Sound
  const soundBefore = await page.$eval('#toggle-sound', el => el.textContent.trim());
  await page.click('#toggle-sound');
  const soundAfter = await page.$eval('#toggle-sound', el => el.textContent.trim());
  console.log(`✓ Sound toggle switched: ${soundBefore} -> ${soundAfter}`);

  // Toggle Music
  const musicBefore = await page.$eval('#toggle-music', el => el.textContent.trim());
  await page.click('#toggle-music');
  const musicAfter = await page.$eval('#toggle-music', el => el.textContent.trim());
  console.log(`✓ Music toggle switched: ${musicBefore} -> ${musicAfter}`);

  // Test Reset Progress Modal
  console.log('\n5. Testing Reset Progress Modal...');
  await page.$eval('#btn-open-reset-modal', el => el.scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 200));
  await page.click('#btn-open-reset-modal');
  await page.waitForSelector('#reset-confirm-modal.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));
  console.log('✓ Reset Confirmation Modal opened');
  
  // Test Cancel Reset
  await page.click('#btn-cancel-reset');
  await new Promise(r => setTimeout(r, 300));
  const modalHidden = await page.$eval('#reset-confirm-modal', el => !el.classList.contains('active'));
  console.log(`✓ Cancel Reset closed modal: ${modalHidden}`);

  // Test Confirm Reset
  await page.click('#btn-open-reset-modal');
  await page.waitForSelector('#reset-confirm-modal.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 300));
  await page.click('#btn-confirm-reset');
  await page.waitForSelector('#main-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  console.log('✓ Reset Confirmed and returned to Main Menu');

  // 6. Test Levels from Sidebar
  console.log('\n6. Testing "🗺️ Levels" nav option from Sidebar...');
  await page.click('#btn-menu');
  await page.waitForSelector('#sidebar-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  await page.click('#nav-levels');
  await page.waitForSelector('#chapter-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  console.log('✓ Navigated to Chapter Journey Map from sidebar');
  await page.click('#btn-back-chapters');
  await page.waitForSelector('#main-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));

  // 7. Test Close button on Sidebar
  console.log('\n7. Testing Close button (✕) on Sidebar...');
  await page.click('#btn-menu');
  await page.waitForSelector('#sidebar-menu.active', { timeout: 2000 });
  await new Promise(r => setTimeout(r, 400));
  await page.click('#btn-close-sidebar');
  await new Promise(r => setTimeout(r, 400));
  const sidebarClosed = await page.$eval('#sidebar-menu', el => !el.classList.contains('active'));
  console.log(`✓ Sidebar closed via ✕ button: ${sidebarClosed}`);

  await browser.close();
  console.log('\n======================================================');
  console.log('🎉 ALL SIDEBAR & MENU TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

testSidebar().catch(err => {
  console.error('Sidebar test failed:', err);
  process.exit(1);
});
