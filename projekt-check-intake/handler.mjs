const CASE_RE = /^PCA-[0-9]{8}-[A-Z0-9]{8}$/;
const CASE_PREFIX = 'case:';
const TICKET_PREFIX = 'ticket:';
const MAX_TRACES = 20;
const MAX_CLAIM = 3000;
const TICKET_TTL_SECONDS = 600;

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    'cache-control': 'no-store'
  };
}

function reply(body, status = 200, origin = 'https://tools.liquiditybooster.de') {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'content-type': 'application/json; charset=utf-8'
    }
  });
}

function allowedOrigin(request, env) {
  const configured = String(env.ALLOWED_ORIGIN || 'https://tools.liquiditybooster.de').replace(/\/$/, '');
  const incoming = String(request.headers.get('origin') || '').replace(/\/$/, '');
  return { configured, incoming, ok: !incoming || incoming === configured };
}

function normalizeUrl(value) {
  const u = new URL(String(value || '').trim());
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('unsupported_protocol');
  return u.href;
}

function randomHex(bytes = 16) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function makeCaseId() {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `PCA-${stamp}-${randomHex(4)}`;
}

function validatePayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid_payload');
  const caseId = String(raw.case_id || makeCaseId()).trim().toUpperCase();
  if (!CASE_RE.test(caseId)) throw new Error('invalid_case_id');

  const traces = Array.isArray(raw.traces) ? raw.traces.map(normalizeUrl) : [];
  const unique = [...new Set(traces)];
  if (!unique.length || unique.length > MAX_TRACES) throw new Error('invalid_traces');

  const claim = String(raw.claim || '').trim();
  if (claim.length > MAX_CLAIM) throw new Error('claim_too_long');

  const requestedOutput = raw.requested_output === 'company_check' ? 'company_check' : 'customer_check';
  const language = raw.language === 'en' ? 'en' : 'de';
  const submittedAt = String(raw.submitted_at || new Date().toISOString());

  return {
    case_id: caseId,
    submitted_at: submittedAt,
    requested_output: requestedOutput,
    language,
    traces: unique,
    claim,
    source: 'projekt-check-web'
  };
}

function publicSummary(record) {
  return {
    case_id: record.case_id,
    submitted_at: record.submitted_at,
    requested_output: record.requested_output,
    trace_count: record.intake?.traces?.length || 0,
    has_claim: Boolean(record.intake?.claim),
    order_status: record.order_status || 'unbekannt',
    status: record.status || 'neu',
    updated_at: record.updated_at || record.submitted_at
  };
}

async function verifyAdmin(request, env) {
  const auth = String(request.headers.get('authorization') || '');
  if (!auth.toLowerCase().startsWith('bearer ')) return { ok: false, reason: 'missing_authorization' };

  const token = auth.slice(7).trim();
  if (!token) return { ok: false, reason: 'missing_authorization' };

  const r = await fetch('https://api.github.com/user', {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'FSA-Projekt-Check-Poststelle/1.0'
    }
  });
  if (!r.ok) return { ok: false, reason: 'github_auth_failed' };

  const user = await r.json();
  const allowed = String(env.ADMIN_GITHUB_USERS || 'Adler-FSA')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(String(user.login || '').toLowerCase())) return { ok: false, reason: 'admin_not_allowed' };
  return { ok: true, login: user.login };
}

async function loadCase(env, caseId) {
  return env.ORDERS.get(`${CASE_PREFIX}${caseId}`, 'json');
}

async function saveCase(env, record) {
  record.updated_at = new Date().toISOString();
  await env.ORDERS.put(`${CASE_PREFIX}${record.case_id}`, JSON.stringify(record));
}

async function submit(request, env, origin) {
  let intake;
  try {
    const text = await request.text();
    if (text.length > 20000) throw new Error('payload_too_large');
    intake = validatePayload(JSON.parse(text));
  } catch (error) {
    return reply({ accepted: false, error: String(error?.message || 'invalid_payload') }, 400, origin);
  }

  const existing = await loadCase(env, intake.case_id);
  if (existing) return reply({ accepted: false, error: 'case_exists' }, 409, origin);

  const now = new Date().toISOString();
  const accessKey = randomHex(18);
  const record = {
    schema_version: '1.0',
    case_id: intake.case_id,
    submitted_at: intake.submitted_at || now,
    updated_at: now,
    requested_output: intake.requested_output,
    language: intake.language,
    order_status: 'unbekannt',
    status: 'neu',
    access_key: accessKey,
    intake: {
      contract_version: '1.0',
      submitted_at: intake.submitted_at || now,
      language: intake.language,
      traces: intake.traces,
      claim: intake.claim,
      requested_output: intake.requested_output,
      source: 'projekt-check-poststelle'
    }
  };

  await saveCase(env, record);
  return reply({
    accepted: true,
    case_id: record.case_id,
    state: 'wartet_auf_start',
    access_key: accessKey,
    receipt_url: `/receipt/${record.case_id}?key=${accessKey}`
  }, 202, origin);
}

async function inbox(request, env, origin) {
  const admin = await verifyAdmin(request, env);
  if (!admin.ok) return reply({ error: admin.reason }, 401, origin);

  const listed = await env.ORDERS.list({ prefix: CASE_PREFIX, limit: 1000 });
  const records = [];
  for (const key of listed.keys) {
    const value = await env.ORDERS.get(key.name, 'json');
    if (value) records.push(publicSummary(value));
  }
  records.sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
  return reply({ requests: records, count: records.length }, 200, origin);
}

async function adminCase(request, env, origin, caseId) {
  const admin = await verifyAdmin(request, env);
  if (!admin.ok) return reply({ error: admin.reason }, 401, origin);
  const record = await loadCase(env, caseId);
  if (!record) return reply({ error: 'case_not_found' }, 404, origin);
  const safe = { ...record };
  delete safe.access_key;
  return reply(safe, 200, origin);
}

async function createStartTicket(request, env, origin, caseId) {
  const admin = await verifyAdmin(request, env);
  if (!admin.ok) return reply({ error: admin.reason }, 401, origin);
  const record = await loadCase(env, caseId);
  if (!record) return reply({ error: 'case_not_found' }, 404, origin);
  if (record.status === 'abgeschlossen') return reply({ error: 'case_completed' }, 409, origin);

  const ticket = randomHex(24);
  const expiresAt = new Date(Date.now() + TICKET_TTL_SECONDS * 1000).toISOString();
  await env.ORDERS.put(`${TICKET_PREFIX}${caseId}:${ticket}`, JSON.stringify({ case_id: caseId }), {
    expirationTtl: TICKET_TTL_SECONDS
  });
  record.status = 'start_bereit';
  await saveCase(env, record);
  return reply({ case_id: caseId, ticket, expires_at: expiresAt }, 201, origin);
}

async function consumeStartTicket(request, env, origin, caseId) {
  const url = new URL(request.url);
  const ticket = String(url.searchParams.get('ticket') || '').trim().toUpperCase();
  if (!ticket) return reply({ error: 'ticket_missing' }, 401, origin);

  const key = `${TICKET_PREFIX}${caseId}:${ticket}`;
  const grant = await env.ORDERS.get(key, 'json');
  if (!grant || grant.case_id !== caseId) return reply({ error: 'ticket_invalid_or_expired' }, 401, origin);
  await env.ORDERS.delete(key);

  const record = await loadCase(env, caseId);
  if (!record) return reply({ error: 'case_not_found' }, 404, origin);
  record.status = 'gestartet';
  await saveCase(env, record);
  return reply({ case_id: caseId, intake: record.intake }, 200, origin);
}

async function updateCaseStatus(request, env, origin, caseId) {
  const admin = await verifyAdmin(request, env);
  if (!admin.ok) return reply({ error: admin.reason }, 401, origin);
  const record = await loadCase(env, caseId);
  if (!record) return reply({ error: 'case_not_found' }, 404, origin);

  let body = {};
  try { body = await request.json(); } catch {}
  const allowed = new Set(['neu', 'start_bereit', 'gestartet', 'abgeschlossen', 'fehler', 'storniert']);
  const next = String(body.status || '').trim();
  if (!allowed.has(next)) return reply({ error: 'invalid_status' }, 400, origin);
  record.status = next;
  await saveCase(env, record);
  return reply(publicSummary(record), 200, origin);
}

async function receipt(request, env, origin, caseId) {
  const url = new URL(request.url);
  const key = String(url.searchParams.get('key') || '').trim().toUpperCase();
  const record = await loadCase(env, caseId);
  if (!record || !key || key !== String(record.access_key || '').toUpperCase()) {
    return reply({ error: 'receipt_not_found' }, 404, origin);
  }
  return reply({
    case_id: record.case_id,
    state: record.status === 'neu' || record.status === 'start_bereit' ? 'wartet_auf_start' : record.status,
    requested_output: record.requested_output,
    submitted_at: record.submitted_at,
    updated_at: record.updated_at
  }, 200, origin);
}

export async function handleRequest(request, env = {}) {
  if (!env.ORDERS) return reply({ error: 'storage_not_configured' }, 503);

  const originState = allowedOrigin(request, env);
  if (!originState.ok) return reply({ error: 'origin_not_allowed' }, 403, originState.configured);
  const origin = originState.configured;
  if (request.method === 'OPTIONS') return reply({}, 204, origin);

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'POST' && path === '/submit') return submit(request, env, origin);
  if (request.method === 'GET' && path === '/inbox') return inbox(request, env, origin);

  const caseMatch = path.match(/^\/case\/(PCA-[0-9]{8}-[A-Z0-9]{8})$/);
  if (request.method === 'GET' && caseMatch) return adminCase(request, env, origin, caseMatch[1]);
  if (request.method === 'POST' && caseMatch) return updateCaseStatus(request, env, origin, caseMatch[1]);

  const ticketMatch = path.match(/^\/case\/(PCA-[0-9]{8}-[A-Z0-9]{8})\/start-ticket$/);
  if (request.method === 'POST' && ticketMatch) return createStartTicket(request, env, origin, ticketMatch[1]);

  const startMatch = path.match(/^\/start\/(PCA-[0-9]{8}-[A-Z0-9]{8})$/);
  if (request.method === 'GET' && startMatch) return consumeStartTicket(request, env, origin, startMatch[1]);

  const receiptMatch = path.match(/^\/receipt\/(PCA-[0-9]{8}-[A-Z0-9]{8})$/);
  if (request.method === 'GET' && receiptMatch) return receipt(request, env, origin, receiptMatch[1]);

  if (request.method === 'GET' && path === '/health') {
    return reply({ ok: true, service: 'projekt-check-poststelle', version: '1.0' }, 200, origin);
  }

  return reply({ error: 'not_found' }, 404, origin);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
