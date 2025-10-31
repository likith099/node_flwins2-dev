// EFSMOD (Tenant B) provisioning helper
// Creates a cross-tenant invitation for the user and returns a deep link

const querystring = require('querystring');

const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args)));

function getEfmodConfig() {
  const tenantId = process.env.EFSMOD_TENANT_ID || process.env.B_TENANT_ID;
  const clientId = process.env.EFSMOD_CLIENT_ID || process.env.B_GRAPH_CLIENT_ID;
  const clientSecret = process.env.EFSMOD_CLIENT_SECRET || process.env.B_GRAPH_CLIENT_SECRET;
  const baseUrl = process.env.EFSMOD_BASE_URL || process.env.B_BASE_URL; // e.g., https://efmod.azurewebsites.net
  const redirectPath = process.env.EFSMOD_REDIRECT_PATH || '/school-readiness'; // e.g., /srapp.html

  if (!tenantId || !clientId || !clientSecret || !baseUrl) {
    const err = new Error('Missing EFSMOD config (EFSMOD_TENANT_ID, EFSMOD_CLIENT_ID, EFSMOD_CLIENT_SECRET, EFSMOD_BASE_URL).');
    err.details = {
      EFSMOD_TENANT_ID: !!tenantId,
      EFSMOD_CLIENT_ID: !!clientId,
      EFSMOD_CLIENT_SECRET: !!clientSecret,
      EFSMOD_BASE_URL: !!baseUrl
    };
    throw err;
  }

  return { tenantId, clientId, clientSecret, baseUrl, redirectPath };
}

async function getAppTokenEfmod() {
  const { tenantId, clientId, clientSecret } = getEfmodConfig();
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  const body = querystring.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`EFSMOD token error (${resp.status}): ${text}`);
  }
  const json = await resp.json();
  if (!json.access_token) throw new Error('EFSMOD token missing access_token');
  return json.access_token;
}

function makeDisplayName(intake) {
  const first = (intake.firstName || '').trim();
  const last = (intake.lastName || '').trim();
  return [first, last].filter(Boolean).join(' ') || intake.displayName || 'FLWINS User';
}

async function inviteExternalUserToEfmod(intake) {
  const token = await getAppTokenEfmod();
  const { baseUrl, redirectPath } = getEfmodConfig();

  const email = String(intake.email || '').trim();
  if (!email || !email.includes('@')) {
    throw new Error('EFSMOD invite requires a valid email address.');
  }

  const payload = {
    invitedUserEmailAddress: email,
    invitedUserDisplayName: makeDisplayName(intake),
    sendInvitationMessage: false,
    inviteRedirectUrl: `${baseUrl}${redirectPath.startsWith('/') ? '' : '/'}${redirectPath}`
  };

  const resp = await fetch('https://graph.microsoft.com/v1.0/invitations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const err = new Error(`EFSMOD invite failed (${resp.status}): ${text}`);
    err.status = resp.status;
    throw err;
  }

  const json = await resp.json();
  // Prefer Graph-provided redeem link (ensures invite acceptance),
  // fallback to front-channel login link with redirect to the desired path
  const postLogin = encodeURIComponent(`${redirectPath.startsWith('/') ? '' : '/'}${redirectPath}`);
  const loginLink = `${baseUrl}/.auth/login/aad?post_login_redirect_uri=${postLogin}&login_hint=${encodeURIComponent(email)}`;
  const deepLink = json.inviteRedeemUrl || loginLink;

  return {
    invitedUserId: json?.invitedUser?.id,
    invitedUserPrincipalName: json?.invitedUser?.userPrincipalName,
    inviteRedeemUrl: json?.inviteRedeemUrl,
    deepLink,
    loginLink,
    email
  };
}

module.exports = {
  getEfmodConfig,
  getAppTokenEfmod,
  inviteExternalUserToEfmod
};
