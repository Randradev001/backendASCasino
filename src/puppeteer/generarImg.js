const puppeteer = require('puppeteer-core').default;

const generarImages = async ({ url }) => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: {
      width: 876,
      height: 2000,
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false,
      isLandscape: true
    }
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#correctiva');
    await page.evaluate(() => { document.body.style.background = 'transparent'; });
    const data = await page.screenshot({ encoding: 'binary', omitBackground: true });
    // Puppeteer actual devuelve Uint8Array; los adjuntos heredados requieren Buffer.
    return Buffer.from(data);
  } finally {
    await browser.close();
  }
};

module.exports = generarImages;
