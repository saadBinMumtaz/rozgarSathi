// Color migration script — replaces hardcoded Tailwind colors with design tokens
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('src');

// Ordered replacement pairs — more specific patterns first to avoid partial matches
const REPLACEMENTS = [
  // Backgrounds
  ['bg-slate-950', 'bg-bg-primary'],
  ['bg-slate-900/80', 'bg-surface/90'],
  ['bg-slate-900/50', 'bg-surface/80'],
  ['bg-slate-900', 'bg-surface'],
  ['bg-slate-800/80', 'bg-surface-hover/80'],
  ['bg-slate-800/60', 'bg-surface-hover/60'],
  ['bg-slate-800/50', 'bg-surface-hover/50'],
  ['bg-slate-800', 'bg-surface-hover'],
  ['bg-slate-700', 'bg-bg-hover'],

  // Text
  ['text-slate-100', 'text-text-primary'],
  ['text-slate-200', 'text-text-primary'],
  ['text-slate-300', 'text-text-muted'],
  ['text-slate-400', 'text-text-muted'],
  ['text-slate-500', 'text-text-muted'],
  ['text-slate-600', 'text-text-muted'],

  // Borders
  ['border-slate-800/80', 'border-border-theme'],
  ['border-slate-800/60', 'border-border-theme/60'],
  ['border-slate-800', 'border-border-theme'],
  ['border-slate-700', 'border-border-theme'],
  ['border-slate-600', 'border-border-theme'],

  // Indigo → token
  ['text-indigo-200', 'text-text-primary'],
  ['text-indigo-300', 'text-text-primary'],
  ['text-indigo-400', 'text-icon-active'],
  ['text-indigo-500', 'text-icon-active'],
  ['bg-indigo-500/15', 'bg-text-primary/10'],
  ['bg-indigo-500/10', 'bg-text-primary/10'],
  ['bg-indigo-600', 'bg-text-primary'],
  ['bg-indigo-950/20', 'bg-surface-hover'],
  ['bg-indigo-900/90', 'bg-surface'],
  ['bg-indigo-900/20', 'bg-surface-hover'],
  ['border-indigo-500/50', 'border-border-strong'],
  ['border-indigo-500/30', 'border-border-theme'],
  ['border-indigo-700/30', 'border-border-theme'],
  ['border-indigo-500', 'border-border-strong'],
  ['ring-indigo-500/50', 'ring-border-strong'],
  ['hover:bg-indigo-700', 'hover:opacity-90'],
  ['hover:bg-indigo-500', 'hover:opacity-90'],
  ['hover:border-indigo-500', 'hover:border-border-strong'],
  ['focus:border-indigo-500', 'focus:border-border-strong'],
  ['focus:ring-indigo-500/50', 'focus:ring-border-strong'],
  ['focus:ring-indigo-500', 'focus:ring-border-strong'],
  ['shadow-indigo-600/30', 'shadow-sm'],
  ['shadow-indigo-500/30', 'shadow-sm'],

  // Emerald → success
  ['text-emerald-200', 'text-success'],
  ['text-emerald-300', 'text-success'],
  ['text-emerald-400', 'text-success'],
  ['text-emerald-500', 'text-success'],
  ['bg-emerald-500/15', 'bg-success/15'],
  ['bg-emerald-500/10', 'bg-success/10'],
  ['bg-emerald-900/90', 'bg-surface'],
  ['bg-emerald-900/20', 'bg-success/10'],
  ['bg-emerald-500', 'bg-success'],
  ['border-emerald-500/30', 'border-success/30'],
  ['border-emerald-700/30', 'border-success/30'],
  ['border-emerald-500', 'border-success/30'],

  // Amber → warning
  ['text-amber-200', 'text-warning'],
  ['text-amber-300', 'text-warning'],
  ['text-amber-400', 'text-warning'],
  ['text-amber-500', 'text-warning'],
  ['bg-amber-500/15', 'bg-warning/15'],
  ['bg-amber-500/10', 'bg-warning/10'],
  ['bg-amber-900/90', 'bg-surface'],
  ['bg-amber-900/20', 'bg-warning/10'],
  ['bg-amber-500', 'bg-warning'],
  ['border-amber-500/30', 'border-warning/30'],
  ['border-amber-700/30', 'border-warning/30'],
  ['border-amber-500', 'border-warning/30'],

  // Rose → danger
  ['text-rose-200', 'text-danger'],
  ['text-rose-300', 'text-danger'],
  ['text-rose-400', 'text-danger'],
  ['text-rose-500', 'text-danger'],
  ['bg-rose-500/15', 'bg-danger/15'],
  ['bg-rose-500/10', 'bg-danger/10'],
  ['bg-rose-900/90', 'bg-surface'],
  ['bg-rose-900/20', 'bg-danger/10'],
  ['bg-rose-600', 'bg-danger'],
  ['bg-rose-500', 'bg-danger'],
  ['border-rose-500/30', 'border-danger/30'],
  ['border-rose-700/30', 'border-danger/30'],
  ['border-rose-500/20', 'border-danger/20'],
  ['border-rose-500', 'border-danger/30'],
  ['shadow-rose-600/30', 'shadow-sm'],

  // Cyan → muted (decorative)
  ['text-cyan-400', 'text-text-muted'],
  ['text-cyan-500', 'text-text-muted'],
  ['bg-cyan-500/15', 'bg-surface-hover'],
  ['border-cyan-500/30', 'border-border-theme'],

  // Violet → muted (decorative)
  ['text-violet-400', 'text-text-muted'],
  ['bg-violet-500', 'bg-text-muted'],

  // White → token
  ['text-white', 'text-text-primary'],

  // Fill (SVG)
  ['fill-slate-600', 'fill-text-muted'],
  ['fill-slate-500', 'fill-text-muted'],
  ['fill-slate-300', 'fill-text-primary'],

  // Gradient cleanup (remove decorative gradients)
  ['bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent', 'text-text-primary'],
  ['bg-gradient-to-tr from-indigo-600 to-cyan-400', 'bg-text-primary'],
  ['bg-gradient-to-br from-slate-900 to-slate-950', 'bg-surface'],
  ['bg-gradient-to-r from-indigo-500 to-cyan-400', 'bg-text-primary'],
];

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [from, to] of REPLACEMENTS) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let migrated = 0;
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === 'dist') continue;
      migrated += walkDir(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx')) {
      if (migrateFile(fullPath)) {
        console.log(`  Migrated: ${fullPath}`);
        migrated++;
      }
    }
  }
  return migrated;
}

console.log('Starting color migration...');
const count = walkDir(SRC_DIR);
console.log(`\nDone! Migrated ${count} files.`);
