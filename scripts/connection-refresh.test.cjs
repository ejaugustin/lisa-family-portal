const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
let effect, tick, focus, refreshes = 0, cleared = false, removed = false;
const router = { refresh: () => refreshes++ };
const document = { visibilityState: 'visible' };
const window = {
  setInterval(fn, ms) { assert.equal(ms, 5000); tick = fn; return 1; },
  clearInterval(id) { assert.equal(id, 1); cleared = true; },
  addEventListener(event, fn) { assert.equal(event, 'focus'); focus = fn; },
  removeEventListener(event, fn) { assert.equal(event, 'focus'); assert.equal(fn, focus); removed = true; },
};
const code = ts.transpileModule(fs.readFileSync(`${__dirname}/../src/app/_components/ConnectionRefresh.tsx`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const output = {};
new Function('require', 'exports', 'window', 'document', code)(name => {
  if (name === 'react') return { useEffect: fn => { effect = fn; }, useTransition: () => [false, fn => fn()] };
  if (name === 'next/navigation') return { useRouter: () => router };
  return require(name);
}, output, window, document);
const element = output.ConnectionRefresh();
const cleanup = effect();
tick(); assert.equal(refreshes, 1);
document.visibilityState = 'hidden'; tick(); assert.equal(refreshes, 1);
document.visibilityState = 'visible'; focus(); assert.equal(refreshes, 2);
element.props.children[1].props.onClick(); assert.equal(refreshes, 3);
cleanup(); assert.ok(cleared && removed);
console.log('Connection refresh: visible polling, focus refresh, manual check, and cleanup passed.');
