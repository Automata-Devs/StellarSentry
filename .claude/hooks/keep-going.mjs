import fs from 'node:fs';

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const cwd = input.cwd || process.cwd();
const progressFile = `${cwd}/PROGRESS.md`;
const counterFile = `${cwd}/.claude/keep-going.count`;
const MAX_FORCED_CONTINUES = 300; // safety cap so it can never loop forever

const count = fs.existsSync(counterFile) ? Number(fs.readFileSync(counterFile, 'utf8')) || 0 : 0;
if (count >= MAX_FORCED_CONTINUES) process.exit(0);

let reason = null;
if (!fs.existsSync(progressFile)) {
  reason = 'PROGRESS.md does not exist yet. Create it with the full checklist, then continue building.';
} else if (/^\s*[-*] \[ \]/m.test(fs.readFileSync(progressFile, 'utf8'))) {
  reason = 'PROGRESS.md still has unchecked items. Do not stop or ask questions. Read NEXT ACTION in PROGRESS.md and continue building now.';
}

if (reason) {
  fs.mkdirSync(`${cwd}/.claude`, { recursive: true });
  fs.writeFileSync(counterFile, String(count + 1));
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}
process.exit(0);