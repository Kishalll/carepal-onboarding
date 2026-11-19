import { createRequire } from 'module';
import path from 'path';

const require = createRequire('/home/gigabyte/carepal-onboarding/package.json');
const puppeteer = require('puppeteer-core');

const outDir = '/home/gigabyte/.gemini/antigravity-cli/brain/fad4ec9b-3007-4e26-9c72-ae90fae55b82/screenshots';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/brave',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Login to Admin Portal
  console.log('Logging in to Admin Portal (http://localhost:3001)...');
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
  await page.type('#email', 'admin@thecarepal.test');
  await page.type('#password', 'test!123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]'),
  ]);

  // 2. Search for Aarav Patel
  console.log('Navigating to candidates list with search=Aarav...');
  await page.goto('http://localhost:3001/candidates?search=Aarav', { waitUntil: 'networkidle0' });
  await page.waitForSelector('tbody tr', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 1000));

  // 3. Click candidate row
  console.log('Clicking Aarav Patel row...');
  await page.evaluate(() => {
    const row = document.querySelector('tbody tr');
    if (row) row.click();
  });

  // 4. Wait for drawer and switch to Emails tab
  console.log('Switching to Emails tab...');
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const emailsBtn = btns.find((b) => b.textContent && b.textContent.includes('Emails'));
    if (emailsBtn) emailsBtn.click();
  });

  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outDir, 'candidate-emails-drawer.png') });
  console.log('Captured candidate-emails-drawer.png for Aarav Patel');

  await browser.close();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
