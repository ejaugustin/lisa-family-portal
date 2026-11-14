const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, modules, extra = {}) {
  const code = ts.transpileModule(fs.readFileSync(`${__dirname}/../${file}`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const out = {};
  new Function('require', 'exports', ...Object.keys(extra), code)(n => {
    if (!(n in modules)) throw Error(`Unexpected dependency ${n}`);
    return modules[n];
  }, out, ...Object.values(extra));
  return out;
}
let ready = true, apiStatus = 200, lookups = 0;
const next = { next: () => ({ next: true }), redirect: url => ({ redirect: url.pathname + url.search }), json: (body, init) => ({ body, status: init.status }) };
const { middleware } = load('src/middleware.ts', { 'next/server': { NextResponse: next } }, { fetch: async () => { lookups++; return new Response(JSON.stringify({ ready }), { status: apiStatus }); } });
function req(path, session = true, legacy = false) {
  const url = new URL(path, 'https://family.lisaandme.com'); url.clone = () => new URL(url);
  return { nextUrl: url, url: url.href, method: 'GET', headers: new Headers({ cookie: 'session-for-test' }), cookies: { has: key => key === 'lisa_id' ? session : legacy } };
}
let customers = [], cards = {}, failure = false, checkout;
class Stripe {
  customers = { list: () => (async function* () { if (failure) throw Error('unavailable'); yield* customers; })(), retrieve: async () => ({ email: 'owner@example.test' }) };
  paymentMethods = { list: async ({ customer }) => ({ data: cards[customer] ?? [] }) };
  checkout = { sessions: { retrieve: async () => checkout } };
}
const billing = load('src/lib/stripe.ts', { 'server-only': {}, stripe: Stripe, './env': { billingEnv: () => 'test-not-a-real-key' } });
(async () => {
  assert.deepEqual(await middleware(req('/dashboard')), { next: true }, 'New browser needs no billing cookie');
  ready = false;
  assert.equal((await middleware(req('/dashboard', true, true))).redirect, '/billing/start', 'Old account cookie cannot grant access');
  assert.equal((await middleware(req('/api/vision/link'))).status, 403);
  apiStatus = 503;
  assert.equal((await middleware(req('/dashboard'))).redirect, '/billing/start?unavailable=1');
  apiStatus = 401;
  assert.equal((await middleware(req('/dashboard'))).redirect, '/sign-in');
  const before = lookups;
  assert.deepEqual(await middleware(req('/api/billing/status')), { next: true }, 'No recursive gate');
  assert.equal(lookups, before);
  assert.equal((await middleware(req('/dashboard', false))).redirect, '/sign-in');
  assert.equal(await billing.hasSavedPaymentMethod('owner@example.test'), false);
  customers = [{ id: 'empty' }, { id: 'saved' }]; cards.saved = [{ id: 'pm-test' }];
  assert.equal(await billing.hasSavedPaymentMethod('owner@example.test'), true, 'Find card even with duplicate older customer');
  cards.saved = [];
  assert.equal(await billing.hasSavedPaymentMethod('owner@example.test'), false, 'Removed card does not retain access');
  failure = true;
  await assert.rejects(billing.hasSavedPaymentMethod('owner@example.test'));
  failure = false;
  checkout = { mode: 'setup', status: 'complete', customer: 'saved', setup_intent: { status: 'succeeded' } };
  assert.equal((await billing.confirmSetupSession('test', 'other@example.test')).ok, false);
  assert.equal((await billing.confirmSetupSession('test', 'owner@example.test')).ok, true);
  checkout.status = 'open';
  assert.equal((await billing.confirmSetupSession('test', 'owner@example.test')).ok, false);
  console.log('Account billing: fresh browser, stale cookie, API failures, account ownership, removed card and duplicate customers passed.');
})().catch(e => { console.error(e); process.exitCode = 1; });
