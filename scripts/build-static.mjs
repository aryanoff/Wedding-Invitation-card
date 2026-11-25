import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'styles'), { recursive: true });
fs.mkdirSync(path.join(dist, 'scripts'), { recursive: true });

for (const file of ['index.html', 'main.js', 'config.js', 'styles.css']) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

for (const file of fs.readdirSync(path.join(root, 'styles')).filter(name => name.endsWith('.css'))) {
  fs.copyFileSync(path.join(root, 'styles', file), path.join(dist, 'styles', file));
}

for (const file of ['silk-scroll-delay-bounce.js', 'date-gold-rain.js', 'hero-atmosphere.js']) {
  fs.copyFileSync(path.join(root, 'scripts', file), path.join(dist, 'scripts', file));
}

fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), {
  recursive: true,
  filter: src => !src.toLowerCase().endsWith('.md'),
});
