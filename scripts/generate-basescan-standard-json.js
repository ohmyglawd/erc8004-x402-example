/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

function latestBuildInfoPath(buildInfoDir) {
  const files = fs
    .readdirSync(buildInfoDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(buildInfoDir, f))

  if (files.length === 0) throw new Error(`No build-info files in ${buildInfoDir}. Run hardhat compile first.`)

  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  return files[0]
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function main() {
  const root = path.join(__dirname, '..')
  const buildInfoDir = path.join(root, 'artifacts', 'build-info')
  const buildInfoFile = latestBuildInfoPath(buildInfoDir)

  const buildInfo = JSON.parse(fs.readFileSync(buildInfoFile, 'utf8'))
  const standardJson = {
    language: buildInfo.input.language,
    sources: buildInfo.input.sources,
    settings: buildInfo.input.settings,
  }

  const outDir = path.join(root, 'verify', 'base-sepolia')
  ensureDir(outDir)

  const outFile = path.join(outDir, 'standard-json-input.json')
  fs.writeFileSync(outFile, JSON.stringify(standardJson, null, 2))

  const metaFile = path.join(outDir, 'build-info.meta.json')
  fs.writeFileSync(
    metaFile,
    JSON.stringify(
      {
        compilerVersion: buildInfo.solcLongVersion || buildInfo.solcVersion,
        buildInfoFile: path.basename(buildInfoFile),
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )

  console.log('Wrote BaseScan standard JSON input:')
  console.log('-', outFile)
  console.log('Meta:')
  console.log('-', metaFile)
  console.log('\nTip: On BaseScan, choose “Solidity (Standard-Json-Input)” and upload this file.')
}

main()
