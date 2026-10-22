const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'pdf', 'Patrik_Hildenborg_CV.pdf');
const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml', '.txt':'text/plain' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    await page.addStyleTag({ path: path.join(root, 'css', 'pdf.css') });
    await page.evaluate(async () => {
      await window.cvReady;
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    });
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await page.pdf({ path: output, format: 'A4', printBackground: true, preferCSSPageSize: true });
    const pdf = fs.readFileSync(output);
    if (pdf.subarray(0, 5).toString() !== '%PDF-' || pdf.length < 1000) throw new Error('Invalid PDF output');
    console.log('Generated:', output, '(' + pdf.length + ' bytes)');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
