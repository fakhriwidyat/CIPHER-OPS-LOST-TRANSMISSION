// Keep the offline game as the source of truth; copy only public assets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..'), target = path.join(root, 'online');
fs.mkdirSync(path.join(target, 'public'), { recursive: true });
for (const name of ['assets', 'css', 'js']) fs.cpSync(path.join(root, name), path.join(target, 'public', name), { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(target, 'public', 'game.html'));
fs.cpSync(path.join(root, 'server'), path.join(target, 'server'), { recursive: true });
// The Worker imports the same curriculum as the offline game.
fs.mkdirSync(path.join(target, 'js'), { recursive: true });
fs.copyFileSync(path.join(root, 'js', 'course.js'), path.join(target, 'js', 'course.js'));
console.log('Online game assets and authoritative room rules synchronized.');
