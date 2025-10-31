// Minimal Microsoft Graph helper to create users from intake data
// Uses client credentials loaded from `public/client-variables`

const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args)));

// Avoid reading secrets from publicly served directories.
// DEV ONLY fallback: if you really must keep a file, place it outside /public.
const CLIENT_VARS_PATH = path.join(__dirname, 'client-variables');

function parseClientVariablesFile(filePath = CLIENT_VARS_PATH) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const vars = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key) vars[key] = value;
  }
  return vars;
}

function loadClientCredentials() {
  const vars = (process.env.NODE_ENV === 'production') ? {} : parseClientVariablesFile();

  // Support multiple key spellings; prefer environment variables always
  const tenantId = process.env.AZ_TENANT_ID || process.env.tenantId || process.env.TENANT_ID || vars.tenantId || vars.tennentid || vars.AZ_TENANT_ID;
  const clientId = process.env.AZ_CLIENT_ID || process.env.clientId || process.env.CLIENT_ID || vars.clientId || vars.clientid || vars.AZ_CLIENT_ID;
  const clientSecret = process.env.AZ_CLIENT_SECRET || process.env.secret || process.env.CLIENT_SECRET || vars.secret || vars.AZ_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    const err = new Error('Missing Microsoft Graph client credentials (tenantId/clientId/secret).');
    err.details = { tenantId: !!tenantId, clientId: !!clientId, clientSecret: !!clientSecret };
    throw err;
  }
  return { tenantId, clientId, clientSecret };
}

async function getAppToken() {
  const { tenantId, clientId, clientSecret } = loadClientCredentials();

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  const body = querystring.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Failed to acquire Graph token (${resp.status}): ${text}`);
  }

  const json = await resp.json();
  if (!json.access_token) {
    throw new Error('Graph token response missing access_token');
  }
  return json.access_token;
}

function sanitize(str, { max = 64, fallback = 'user' } = {}) {
  if (typeof str !== 'string') return fallback;
  let s = str.normalize('NFKD').replace(/[^\p{L}\p{N}._-]/gu, '');
  if (!s) s = fallback;
  return s.slice(0, max);
}

function makeMailNickname({ firstName, lastName, email }) {
  if (email && typeof email === 'string' && email.includes('@')) {
    return sanitize(email.split('@')[0], { max: 64, fallback: 'user' });
  }
  const base = [firstName, lastName].filter(Boolean).join('.');
  return sanitize(base || 'user');
}

function pickUpn({ email }, upnDomain) {
  // If upnDomain provided, build from mailNickname
  if (upnDomain) {
    return null; // will be composed by caller once mailNickname is known
  }
  if (email && email.includes('@')) return email.trim();
  return null; // caller must supply domain
}

function generateInitialPassword() {
  // 16+ chars with complexity
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const special = '!@#$%^&*()-_=+[]{}';
  const all = upper + lower + nums + special;
  const rand = (n, set) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('');
  const base = rand(4, upper) + rand(4, lower) + rand(4, nums) + rand(4, special) + rand(4, all);
  return base.split('').sort(() => 0.5 - Math.random()).join('').slice(0, 20);
}

let __defaultVerifiedDomain = null;

async function fetchDefaultVerifiedDomain(token) {
  if (__defaultVerifiedDomain) return __defaultVerifiedDomain;
  const resp = await fetch('https://graph.microsoft.com/v1.0/organization?$select=verifiedDomains', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Failed to read tenant domains (${resp.status}): ${text}`);
  }
  const json = await resp.json();
  const org = Array.isArray(json.value) ? json.value[0] : null;
  const domains = org?.verifiedDomains || [];
  // Prefer default, then initial, then any verified
  const preferred = domains.find(d => d.isDefault) || domains.find(d => d.isInitial) || domains.find(d => d.isVerified);
  if (!preferred || !preferred.name) {
    throw new Error('No verified domains found in tenant.');
  }
  __defaultVerifiedDomain = preferred.name;
  return __defaultVerifiedDomain;
}

async function createUserFromIntake(intake, options = {}) {
  const token = await getAppToken();
  let upnDomain = options.upnDomain || process.env.UPN_DOMAIN || null;

  const firstName = (intake.firstName || '').trim();
  const lastName = (intake.lastName || '').trim();
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || intake.displayName || 'New User';
  const mailNickname = makeMailNickname({ firstName, lastName, email: intake.email });
  const email = (intake.email || '').trim();
  if (!upnDomain) {
    upnDomain = await fetchDefaultVerifiedDomain(token);
  }

  let userPrincipalName = pickUpn(intake, upnDomain);
  if (!userPrincipalName) {
    if (!upnDomain) {
      throw new Error('Cannot determine userPrincipalName. Provide email in intake or set UPN_DOMAIN.');
    }
    userPrincipalName = `${mailNickname}@${upnDomain}`;
  }

  const password = generateInitialPassword();

  const payload = {
    accountEnabled: true,
    displayName,
    mailNickname,
    userPrincipalName,
    givenName: firstName || undefined,
    surname: lastName || undefined,
    jobTitle: intake.jobTitle || undefined,
    department: intake.department || undefined,
    officeLocation: intake.officeLocation || undefined,
    mobilePhone: intake.phone || undefined,
    businessPhones: intake.workPhone ? [String(intake.workPhone)] : undefined,
    otherMails: (email && email.toLowerCase() !== userPrincipalName.toLowerCase()) ? [String(email)] : undefined,
    streetAddress: intake.address || undefined,
    city: intake.city || undefined,
    state: intake.state || undefined,
    postalCode: intake.zipCode || undefined,
    usageLocation: (intake.state && intake.state.length === 2) ? 'US' : undefined,
    passwordProfile: {
      forceChangePasswordNextSignIn: true,
      password
    }
  };

  // Remove undefined keys to avoid Graph validation errors
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const resp = await fetch('https://graph.microsoft.com/v1.0/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const err = new Error(`Graph create user failed (${resp.status}): ${text}`);
    err.status = resp.status;
    throw err;
  }

  const created = await resp.json();
  return { created, initialPassword: password };
}

module.exports = {
  loadClientCredentials,
  getAppToken,
  createUserFromIntake
};
