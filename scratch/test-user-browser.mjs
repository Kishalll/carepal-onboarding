import { createRequire } from 'module';
const require = createRequire('/home/gigabyte/carepal-onboarding/package.json');
const puppeteer = require('puppeteer-core');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/brave',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:3000/careers/apply...');
  await page.goto('http://localhost:3000/careers/apply', { waitUntil: 'networkidle0', timeout: 10000 });

  const rootText = await page.evaluate(() => document.body.innerText);
  console.log('Page heading snippet:\n', rootText.slice(0, 300));

  await browser.close();
}

test();
