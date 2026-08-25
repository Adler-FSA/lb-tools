const CASE_RE = /^PCA-[0-9]{8}-[A-Z0-9]{6,12}$/;

function jsonResponse(body, status = 200, origin = '*') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'cache-control': 'no-store'
    }
  });
}

function makeCaseId() {
  const d = new Date();
  const stamp = d.toISOString().slice(0, 10).replaceAll('-', '');
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  const suffix = [...bytes].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 10);
  return `PCA-${stamp}-${suffix}`;
}

function normalizeUrl(value) {
  const text = String(value || '').trim();
  const u = new URL(text);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('unsupported_protocol');
  return u.href;
}

function validateIntake(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid_payload');
  const traces = Array.isArray(raw.traces) ? raw.traces.map(normalizeUrl) : [];
  const unique = [...new Set(traces)];
  if (!unique.length || unique.length > 20) throw new Error('invalid_traces');
  const claim = String(raw.claim || '').trim();
  if (claim.length > 3000) throw new Error('claim_too_long');
  const language = raw.language === 'en' ? 'en' : 'de';
  return {
    contract_version: '1.0',
    submitted_at: new Date().toISOString(),
    language,
    traces: unique,
    claim,
    source: 'projekt-check-web'
  };
}

export async function handleRequest(request, env = {}) {
  const allowedOrigin = env.ALLOWED_ORIGIN || 'https://tools.liquiditybooster.de';
  const origin = request.headers.get('origin') || '';
  const corsOrigin = origin === allowedOrigin ? allowedOrigin : allowedOrigin;

  if (request.method === 'OPTIONS') return jsonResponse({}, 204, corsOrigin);
  if (request.method !== 'POST') return jsonResponse({accepted:false,error:'method_not_allowed'}, 405, corsOrigin);
  if (origin && origin !== allowedOrigin) return jsonResponse({accepted:false,error:'origin_not_allowed'}, 403, corsOrigin);

  const token = env.GITHUB_TOKEN || '';
  const repo = env.GITHUB_REPO || 'Adler-FSA/lb-tools';
  if (!token) return jsonResponse({accepted:false,error:'gateway_not_configured'}, 503, corsOrigin);

  let intake;
  try {
    intake = validateIntake(await request.json());
  } catch (err) {
    return jsonResponse({accepted:false,error:String(err?.message || 'invalid_payload')}, 400, corsOrigin);
  }

  const caseId = makeCaseId();
  if (!CASE_RE.test(caseId)) return jsonResponse({accepted:false,error:'case_id_error'}, 500, corsOrigin);

  const gh = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      'accept': 'application/vnd.github+json',
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'FSA-Projekt-Check-Gateway/1.0'
    },
    body: JSON.stringify({
      event_type: 'projekt_check_intake_v1',
      client_payload: {case_id: caseId, intake}
    })
  });

  if (!gh.ok) {
    const detail = await gh.text().catch(() => '');
    return jsonResponse({accepted:false,error:'github_dispatch_failed',detail:detail.slice(0,500)}, 502, corsOrigin);
  }

  return jsonResponse({
    accepted: true,
    case_id: caseId,
    status_url: `/data/projekt-check/cases/${caseId}/status.json`
  }, 202, corsOrigin);
}
