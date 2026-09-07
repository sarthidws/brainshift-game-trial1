import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404 URL:', response.url());
    }
  });

  try {
    await page.goto('http://localhost:5173/brainshift-game-trial1/', { waitUntil: 'networkidle2' });
  } catch (e) {
    console.log("Navigation error:", e);
  }
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
