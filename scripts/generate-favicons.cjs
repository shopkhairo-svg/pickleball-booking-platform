// Rebuild the ICO fallback and the Swagger copy after editing frontend/public/favicon.svg.
// Run from the repository root: node scripts/generate-favicons.cjs
const { chromium } = require('@playwright/test');
const { existsSync } = require('node:fs');
const { readFile, writeFile, mkdir, copyFile } = require('node:fs/promises');
const path = require('node:path');

async function main() {
    const root = path.resolve(__dirname, '..');
    const publicDir = path.join(root, 'frontend', 'public');
    const svg = await readFile(path.join(publicDir, 'favicon.svg'), 'utf8');
    const browser = await chromium.launch(existsSync(chromium.executablePath())
        ? { headless: true } : { channel: 'msedge', headless: true });
    const sizes = [16, 32, 48];
    const images = [];
    try {
        const page = await browser.newPage();
        for (const size of sizes) {
            // Rasterize the source vector at each native icon size, without enlarging a screenshot.
            const png = await page.evaluate(async ({ svg, size }) => {
                const source = new Image();
                source.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
                await source.decode();
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = size;
                canvas.getContext('2d').drawImage(source, 0, 0, size, size);
                return canvas.toDataURL('image/png').split(',')[1];
            }, { svg, size });
            images.push(Buffer.from(png, 'base64'));
        }
    } finally {
        await browser.close();
    }
    // ICO supports PNG frames. Each directory entry points to a native-size frame.
    const directory = Buffer.alloc(6 + sizes.length * 16);
    directory.writeUInt16LE(1, 2);
    directory.writeUInt16LE(sizes.length, 4);
    let offset = directory.length;
    images.forEach((png, index) => {
        const entry = 6 + index * 16;
        directory[entry] = directory[entry + 1] = sizes[index];
        directory.writeUInt16LE(1, entry + 4);
        directory.writeUInt16LE(32, entry + 6);
        directory.writeUInt32LE(png.length, entry + 8);
        directory.writeUInt32LE(offset, entry + 12);
        offset += png.length;
    });
    await writeFile(path.join(publicDir, 'favicon.ico'), Buffer.concat([directory, ...images]));
    const docsDir = path.join(root, 'backend', 'src', 'docs', 'assets');
    await mkdir(docsDir, { recursive: true });
    for (const file of ['favicon.svg', 'favicon.LICENSE.txt']) {
        await copyFile(path.join(publicDir, file), path.join(docsDir, file));
    }
    console.log('Generated 16/32/48px favicon.ico and synchronized the Swagger vector icon.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
