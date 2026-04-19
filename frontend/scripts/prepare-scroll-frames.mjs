import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const sourceDir = path.join(repoRoot, 'frames')
const cleanedDir = path.join(repoRoot, 'frames-clean')
const publicFramesDir = path.join(frontendRoot, 'public', 'frames-clean')
const manifestPath = path.join(frontendRoot, 'src', 'data', 'landing', 'generated', 'scrollFrames.js')
const cropBottomPixels = 60
const targetAspectRatio = 2.39
const supportedExtensions = /\.(avif|jpe?g|png|webp)$/i

function byFrameOrder(left, right) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
}

async function ensureDirectory(directory) {
  await fs.mkdir(directory, { recursive: true })
}

async function safeStat(filePath) {
  try {
    return await fs.stat(filePath)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

async function removeStaleOutputs(directory, frameNames) {
  const allowed = new Set(frameNames)
  const entries = await fs.readdir(directory, { withFileTypes: true })

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile() || allowed.has(entry.name)) {
        return
      }

      await fs.unlink(path.join(directory, entry.name))
    })
  )
}

async function listSourceFrames() {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && supportedExtensions.test(entry.name))
    .map((entry) => entry.name)
    .sort(byFrameOrder)
}

async function shouldRebuildFrame(frameName) {
  const sourcePath = path.join(sourceDir, frameName)
  const cleanedPath = path.join(cleanedDir, frameName)
  const publicPath = path.join(publicFramesDir, frameName)
  const [sourceStat, cleanedStat, publicStat] = await Promise.all([
    safeStat(sourcePath),
    safeStat(cleanedPath),
    safeStat(publicPath),
  ])

  if (!sourceStat) {
    throw new Error(`Missing source frame: ${sourcePath}`)
  }

  if (!cleanedStat || !publicStat) {
    return true
  }

  return cleanedStat.mtimeMs < sourceStat.mtimeMs || publicStat.mtimeMs < sourceStat.mtimeMs
}

async function buildFrame(frameName) {
  const sourcePath = path.join(sourceDir, frameName)
  const cleanedPath = path.join(cleanedDir, frameName)
  const publicPath = path.join(publicFramesDir, frameName)
  const image = sharp(sourcePath)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read dimensions for ${frameName}`)
  }

  if (metadata.height <= cropBottomPixels) {
    throw new Error(`Frame ${frameName} is shorter than the ${cropBottomPixels}px crop`)
  }

  const output = await image
    .extract({
      left: 0,
      top: 0,
      width: metadata.width,
      height: metadata.height - cropBottomPixels,
    })
    .toBuffer()

  await Promise.all([fs.writeFile(cleanedPath, output), fs.writeFile(publicPath, output)])
}

async function writeManifest(frameNames) {
  await ensureDirectory(path.dirname(manifestPath))

  const manifest = [
    `export const scrollFrameAspectRatio = ${targetAspectRatio}`,
    'export const scrollFrameUrls = [',
    ...frameNames.map((frameName) => `  '/frames-clean/${frameName}',`),
    ']',
    'export const scrollFrameCount = scrollFrameUrls.length',
    '',
  ].join('\n')

  await fs.writeFile(manifestPath, manifest)
}

async function prepareScrollFrames() {
  await Promise.all([ensureDirectory(cleanedDir), ensureDirectory(publicFramesDir)])

  const frameNames = await listSourceFrames()

  if (!frameNames.length) {
    throw new Error(`No frames found in ${sourceDir}`)
  }

  await Promise.all([removeStaleOutputs(cleanedDir, frameNames), removeStaleOutputs(publicFramesDir, frameNames)])

  let processedCount = 0

  for (const frameName of frameNames) {
    if (!(await shouldRebuildFrame(frameName))) {
      continue
    }

    await buildFrame(frameName)
    processedCount += 1
  }

  await writeManifest(frameNames)

  console.log(
    `Prepared ${frameNames.length} cleaned frames (${processedCount} rebuilt) in ${path.relative(
      repoRoot,
      cleanedDir
    )} and ${path.relative(frontendRoot, publicFramesDir)}`
  )
}

prepareScrollFrames().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
