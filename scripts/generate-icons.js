// Simple icon generator using sharp
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const icons = [
  { src: path.join(__dirname, '..', 'public', 'icon-192.svg'), out: path.join(__dirname, '..', 'public', 'icon-192.png'), size: 192 },
  { src: path.join(__dirname, '..', 'public', 'icon-512.svg'), out: path.join(__dirname, '..', 'public', 'icon-512.png'), size: 512 }
]

async function run() {
  for (const ic of icons) {
    if (!fs.existsSync(ic.src)) {
      console.error('Source SVG not found:', ic.src)
      continue
    }
    try {
      await sharp(ic.src)
        .resize(ic.size, ic.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(ic.out)
      console.log('Generated', ic.out)
    } catch (err) {
      console.error('Failed generating', ic.out, err)
    }
  }
}

run()