const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, imports = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('require', 'module', 'exports', source)(name => {
    if (!(name in imports)) throw Error(`Unexpected import: ${name}`);
    return imports[name];
  }, module, module.exports);
  return module.exports;
}
async function run() {
  const { submitSettingsAction } = load('./submit-settings-action.ts');
  const previous = { contact: { smsConsent: false }, message: 'Old success' };
  const failed = await submitSettingsAction(async () => { throw Error('Unexpected HTML response'); }, previous);
  assert.equal(failed.contact, previous.contact);
  assert.equal(failed.message, undefined);
  assert.match(failed.error, /check your preferences before retrying/);
  const result = { contact: { smsConsent: true }, message: 'Saved' };
  assert.equal(await submitSettingsAction(async () => result, previous), result);
  let actor = null;
  let calls = 0;
  const session = { currentCaregiver: async () => actor };
  const safety = { safetyContactRequest: async () => { calls++; return result; } };
  const { safetyContactAction } = load('./safety-actions.ts', { '@/lib/session': session, '@/lib/safety-contacts': safety });
  const form = new FormData(); form.set('action', 'consent'); form.set('smsConsent', 'on');
  const expired = await safetyContactAction('link', previous, form);
  assert.equal(expired.signInRequired, true);
  assert.equal(calls, 0, 'Expired sessions cannot write consent or send a text.');
  actor = { sub: 'verified-caregiver' };
  assert.equal((await safetyContactAction('link', previous, form)).contact.smsConsent, true);
  assert.equal(calls, 1);
  const ui = fs.readFileSync(path.join(__dirname, 'SafetyContactForm.tsx'), 'utf8');
  assert.ok(ui.indexOf('role="status"') < ui.indexOf('Send verification text'), 'Save feedback must be beside consent, not below verification forms.');
  assert.ok(ui.includes("pending ? 'Saving...' : 'Save my consent'"));
  const response = { next: () => ({ kind: 'next' }), redirect: url => ({ kind: 'redirect', path: url.pathname }) };
  const { middleware } = load('../../middleware.ts', { 'next/server': { NextResponse: response } });
  function request(method, action, pathname = '/settings') {
    return { method, headers: new Headers(action ? { 'next-action': 'test' } : {}), cookies: { has: () => false }, nextUrl: { pathname, clone: () => new URL('https://family.lisaandme.com' + pathname) } };
  }
  assert.equal(middleware(request('POST', true)).kind, 'next', 'Use authenticated action handler, not an HTML middleware redirect.');
  assert.equal(middleware(request('GET', false)).path, '/sign-in');
  assert.equal(middleware(request('POST', false)).path, '/sign-in');
  assert.equal(middleware(request('POST', true, '/dashboard')).path, '/sign-in', 'Exception is scoped to Settings.');
  console.log('Settings save: transport failures contained, expired sessions cannot mutate, successful consent preserved, normal page auth unchanged.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
