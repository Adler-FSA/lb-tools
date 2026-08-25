const CASE_RE = /^PCA-[0-9]{8}-[A-Z0-9]{8}$/;

function reply(body, status = 200, origin = 'https://tools.liquiditybooster.de') {
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

function normalizeUrl(value) {
  const u = new URL(String(value || '').trim());
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('unsupported_protocol');
  return u.href;
}

function validatePayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid_payload');
  const caseId = String(raw.case_id || '').trim().toUpperCase();
  if (!CASE_RE.test(caseId)) throw new Error('invalid_case_id');
  const traces = Array.isArray(raw.traces) ? raw.traces.map(normalizeUrl) : [];
  const unique = [...new Set(traces)];
  if (!unique.length || unique.length > 20) throw new Error('invalid_traces');
  const claim = String(raw.claim || '').trim();
  if (claim.length > 3000) throw new Error('claim_too_long');
  const requestedOutput = raw.requested_output === 'company_check' ? 'company_check' : 'customer_check';
  return {
    case_id: caseId,
    intake: {
      contract_version: '1.0',
      submitted_at: String(raw.submitted_at || new Date().toISOString()),
      language: raw.language === 'en' ? 'en' : 'de',
      traces: unique,
      claim,
      requested_output: requestedOutput,
      source: 'projekt-check-web'
    }
  };
}

export async function handleRequest(request, env = {}) {
  const allowedOrigin = env.ALLOWED_ORIGIN || 'https://tools.liquiditybooster.de';
  const origin = request.headers.get('origin') || '';
  if (request.method === 'OPTIONS') return reply({}, 204, allowedOrigin);
  if (request.method !== 'POST') return reply({accepted:false,error:'method_not_allowed'}, 405, allowedOrigin);
  if (origin && origin !== allowedOrigin) return reply({accepted:false,error:'origin_not_allowed'}, 403, allowedOrigin);

  const githubToken = env.GITHUB_TOKEN || '';
  const repository = env.GITHUB_REPO || 'Adler-FSA/lb-tools';
  if (!githubToken) return reply({accepted:false,error:'submission_not_configured'}, 503, allowedOrigin);

  let payload;
  try { payload = validatePayload(await request.json()); }
  catch (error) { return reply({accepted:false,error:String(error?.message || 'invalid_payload')}, 400, allowedOrigin); }

  const response = await fetch(`https://api.github.com/repos/${repository}/dispatches`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${githubToken}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'FSA-Projekt-Check-Intake/1.0'
    },
    body: JSON.stringify({event_type:'projekt_check_intake_v1',client_payload:payload})
  });

  if (!response.ok) return reply({accepted:false,error:'github_intake_failed'}, 502, allowedOrigin);

  return reply({
    accepted:true,
    case_id:payload.case_id,
    state:'wartet_auf_start',
    status_url:`/data/projekt-check/cases/${payload.case_id}/status.json`
  }, 202, allowedOrigin);
}

export default { fetch(request, env) { return handleRequest(request, env); } };
