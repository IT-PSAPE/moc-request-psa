import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const cwd = process.cwd()
const args = process.argv.slice(2)

const cacheDir = path.join(cwd, '.playwright-mcp', 'npm-cache')
const outputDir = path.join(cwd, '.playwright-mcp', 'outputs')

mkdirSync(cacheDir, { recursive: true })
mkdirSync(outputDir, { recursive: true })

const command = args.find(arg => !arg.startsWith('-'))

if (command === 'screenshot' && !args.some(arg => arg === '--filename' || arg.startsWith('--filename='))) {
    const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
    args.push(`--filename=${path.join(outputDir, `screenshot-${stamp}.png`)}`)
}

const child = spawn('npx', ['--yes', '--package', '@playwright/cli', 'playwright-cli', ...args], {
    cwd,
    stdio: 'inherit',
    env: {
        ...process.env,
        npm_config_cache: cacheDir,
    },
})

child.on('exit', code => {
    process.exit(code ?? 1)
})

child.on('error', error => {
    console.error(error)
    process.exit(1)
})
