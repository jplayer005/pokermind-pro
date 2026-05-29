const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const svgPath = path.join(__dirname, '../resources/icon.svg')
const androidRes = path.join(__dirname, '../android/app/src/main/res')

// Standard Android launcher icon sizes
const SIZES = [
  { dir: 'mipmap-mdpi',    size: 48,  foreground: 108 },
  { dir: 'mipmap-hdpi',    size: 72,  foreground: 162 },
  { dir: 'mipmap-xhdpi',   size: 96,  foreground: 216 },
  { dir: 'mipmap-xxhdpi',  size: 144, foreground: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, foreground: 432 },
]

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath)
  console.log('Generating Android launcher icons from', svgPath)

  for (const { dir, size, foreground } of SIZES) {
    const destDir = path.join(androidRes, dir)

    // ic_launcher.png
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(destDir, 'ic_launcher.png'))
    console.log(`  ${dir}/ic_launcher.png (${size}x${size})`)

    // ic_launcher_round.png
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(destDir, 'ic_launcher_round.png'))
    console.log(`  ${dir}/ic_launcher_round.png (${size}x${size})`)

    // ic_launcher_foreground.png (larger, for adaptive icon foreground)
    await sharp(svgBuffer).resize(foreground, foreground).png().toFile(path.join(destDir, 'ic_launcher_foreground.png'))
    console.log(`  ${dir}/ic_launcher_foreground.png (${foreground}x${foreground})`)
  }

  console.log('\nDone! All icons generated.')
}

generateIcons().catch(console.error)
