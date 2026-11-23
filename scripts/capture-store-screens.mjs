import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('dist');
const fileTypes = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  try {
    if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) throw Error('Not found');
    response.setHeader('Content-Type', fileTypes[extname(file)] ?? 'application/octet-stream');
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));

let browser;
try {
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'networkidle' });
  const play = page.getByText(/^▶\s+JOGAR$/);
  await play.waitFor({ state: 'visible' });
  await page.screenshot({ path: 'store-home.png' });
  await play.click();
  await page.getByText('TOQUE NO SÍMBOLO', { exact: true }).waitFor({ state: 'visible' });
  await page.screenshot({ path: 'store-game.png' });
  if (pageErrors.length) throw new Error(pageErrors.join('\n'));
} finally {
  await browser?.close();
  server.close();
}
