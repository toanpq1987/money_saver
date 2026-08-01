// Sinh toan bo icon PNG cho PWA / iOS tu 1 file SVG duy nhat.
// Chay:  npm run icons
import sharp from 'sharp'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = path.join(root, 'public', 'favicon.svg')
const iconsDir = path.join(root, 'public', 'icons')

const svg = await readFile(svgPath)
await mkdir(iconsDir, { recursive: true })

/** Icon thuong: giu nguyen bo cuc, nen bo tron do SVG tu ve. */
const plain = [192, 512]
for (const size of plain) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, `icon-${size}.png`))
}

/**
 * Icon maskable: Android co the cat theo hinh tron nen phai co "vung an toan".
 * Thu nho logo con 80% va dat giua nen mau dac.
 */
const M = 512
const inner = Math.round(M * 0.8)
const innerBuf = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer()
await sharp({
  create: { width: M, height: M, channels: 4, background: '#155adc' },
})
  .composite([{ input: innerBuf, top: (M - inner) / 2, left: (M - inner) / 2 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(iconsDir, 'icon-maskable-512.png'))

/**
 * apple-touch-icon: iOS KHONG ho tro nen trong suot va tu bo goc,
 * nen xuat 180x180 nen dac, vuong.
 */
const A = 180
const appleInner = await sharp(svg, { density: 384 }).resize(A, A).png().toBuffer()
await sharp({ create: { width: A, height: A, channels: 4, background: '#155adc' } })
  .composite([{ input: appleInner }])
  .flatten({ background: '#155adc' })
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'public', 'apple-touch-icon.png'))

// favicon.ico thay bang PNG 32px (trinh duyet hien dai deu doc duoc)
await sharp(svg, { density: 384 })
  .resize(32, 32)
  .png()
  .toFile(path.join(root, 'public', 'favicon-32.png'))

await writeFile(
  path.join(iconsDir, 'README.txt'),
  'Cac file trong thu muc nay duoc sinh tu public/favicon.svg bang "npm run icons".\nDung sua tay.\n',
)

console.log('✓ Da sinh icon PWA + apple-touch-icon')
