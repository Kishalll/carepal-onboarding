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

  // 1. Login
  console.log('Logging in to Admin Portal (http://localhost:3001)...');
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
  await page.type('#email', 'admin@thecarepal.test');
  await page.type('#password', 'test!123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]'),
  ]);

  // 2. Navigate to Board
  console.log('Navigating to Pipeline Board (/)...');
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outDir, 'pipeline-board-desktop.png') });
  console.log('Captured pipeline-board-desktop.png');

  await browser.close();
  console.log('Captured updated board screenshot.');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
