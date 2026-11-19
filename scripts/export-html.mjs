import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const folder = new URL('../dist/', import.meta.url);
const read = (file) => readFile(new URL(file, folder), 'utf8');
let html = await read('index.html');
const script = html.match(/<script type="module"[^>]* src="([^"]+)"[^>]*><\/script>/);
const styles = html.match(/<link rel="stylesheet"[^>]* href="([^"]+)"[^>]*>/);
assert.ok(script && styles, 'Ожидается сборка HTML с одним JS и одним CSS-файлом.');
const js = await read(script[1]);
const css = await read(styles[1]);
html = html.replace(script[0], () => '<script type="module">' + js.replace(/<\/script/gi, '<\\/script') + '</script>');
html = html.replace(styles[0], () => '<style>' + css + '</style>');

const modelsFolder = new URL('models/', folder);
const names = (await readdir(modelsFolder)).filter((name) => /^[a-z0-9-]+\.glb$/.test(name));
const embedded = await Promise.all(names.map(async (name) => {
  const buffer = await readFile(new URL(name, modelsFolder));
  return '<script type="application/octet-stream" id="vet-model-' + name + '">' + buffer.toString('base64') + '</script>';
}));
await writeFile(new URL('3d-vet.html', folder), html.replace('</body>', () => embedded.join('\n') + '\n</body>'));
console.log('Автономный тренажёр сохранён в dist/3d-vet.html');
