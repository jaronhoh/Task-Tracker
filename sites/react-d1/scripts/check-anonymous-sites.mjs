// CR-024 read-only, unauthenticated production access probe.
// This does NOT authenticate as the Owner or test mutation permissions.
// Never print response bodies, cookies, redirects with query strings or data.
// A login redirect/HTML interstitial is INCONCLUSIVE, not a proved API denial.
const base = process.env.TASK_TRACKER_SITE_URL;
if (!base || !base.startsWith('https://')) throw new Error('HTTPS TASK_TRACKER_SITE_URL required');
const site = new URL(base);
const paths = [
  '/',
  '/api/health',
  '/api/tasks',
  '/api/customers',
  '/api/log-time',
  '/api/tasks/CR024-NONEXISTENT',
  '/api/tasks/CR024-NONEXISTENT/time',
  '/api/customers/CR024-NONEXISTENT',
  '/api/customers/CR024-NONEXISTENT/color',
  '/api/log-time/CR024-NONEXISTENT'
];
const findings = [];
for (const profile of ['no-credentials', 'same-origin-headers-no-credentials']) {
for (const path of paths) {
  let status = null, disposition = 'INCONCLUSIVE';
  try {
    const target = new URL(path, site);
    const response = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
      headers: profile === 'no-credentials'
        ? {'Accept':'application/json, text/html;q=0.9'}
        : {'Accept':'application/json, text/html;q=0.9', 'Origin':site.origin, 'Sec-Fetch-Site':'same-origin'},
      cache: 'no-store'
    });
    status = response.status;
    const media = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (status === 401 || status === 403) disposition = 'DENIED';
    else if (status >= 200 && status < 300 && (path === '/' || media === 'application/json')) disposition = 'EXPOSED_OR_UNGATED';
    else if (status >= 200 && status < 300) disposition = 'INCONCLUSIVE_INTERSTITIAL';
    else if (status >= 300 && status < 400) disposition = 'INCONCLUSIVE_REDIRECT';
    else disposition = 'INCONCLUSIVE';
    // Do not inspect or print private content returned unexpectedly.
    if (response.body) await response.body.cancel().catch(() => {});
  } catch (error) {
    disposition = 'INCONCLUSIVE_NETWORK';
    // Avoid logging URLs or arbitrary potentially sensitive error strings.
  }
  findings.push({profile,route:path,status,disposition});
  console.log(JSON.stringify(findings.at(-1)));
}
}
const allDenied=findings.every(result => result.disposition === 'DENIED');
console.log(allDenied
  ? 'PASS: all tested anonymous GETs explicitly denied; non-owner and write tests still required.'
  : 'BLOCKED: at least one route is accessible or has no explicit anonymous-denial evidence. Manual native Sites review required.');
if (!allDenied) process.exitCode=1;
