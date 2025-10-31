const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args)));
const { ensureIntakeTable, upsertIntakeForm } = require('./config/database');
const { createUserFromIntake } = require('./config/msgraph-account');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Ensure database schema (best effort)
if (process.env.SQL_SERVER || process.env.SQL_CONNECTION_STRING) {
  ensureIntakeTable().catch((err) => {
    console.error('Failed to ensure intake table:', err.message);
  });
}

// Routes
app.get('/', (req, res) => {
  // Serve the FL WINS homepage
  res.sendFile(__dirname + '/public/flwins.html');
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Welcome to FLWINS2 Development Server',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.get('/signin', (req, res) => {
  // Redirect to Azure AD login
  res.redirect('/.auth/login/aad');
});

app.get('/create-account', (req, res) => {
  // Redirect to Azure AD login (same as sign in for Azure AD)
  res.redirect('/.auth/login/aad');
});

app.get('/signout', (req, res) => {
  // Redirect to Azure AD logout
  res.redirect('/.auth/logout');
});

// Serve FL WINS HTML page
app.get('/flwins.html', (req, res) => {
  res.sendFile(__dirname + '/public/flwins.html');
});

// Handle the incorrect redirect URL - redirect to flwins.html
app.get('/flwins2.html', (req, res) => {
  res.redirect('/flwins.html');
});

// Profile page route
app.get('/profile', (req, res) => {
  res.sendFile(__dirname + '/public/profile.html');
});

// Helper to extract claim values
const getClaimValue = (claims = [], claimTypes = []) => {
  for (const type of claimTypes) {
    const claim = claims.find(c => c.typ === type);
    if (claim && claim.val) {
      return claim.val;
    }
  }
  return null;
};

const getAppBaseUrl = (req) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
};

class ProfileError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

const fetchProfileData = async (req, { includeGraph = true } = {}) => {
  const authResponse = await fetch(`${getAppBaseUrl(req)}/.auth/me`, {
    headers: {
      cookie: req.headers.cookie || '',
      'x-zumo-auth': req.headers['x-zumo-auth'] || ''
    }
  });

  if (!authResponse.ok) {
    throw new ProfileError('Authentication context not available', authResponse.status === 401 ? 401 : 500);
  }

  const authData = await authResponse.json();
  const principal = authData?.[0];

  if (!principal || !principal.user_id) {
    throw new ProfileError('User not authenticated', 401);
  }

  const claims = principal.user_claims || [];

  const baseProfile = {
    id: principal.user_id,
    displayName: getClaimValue(claims, [
      'name',
      'http://schemas.microsoft.com/identity/claims/displayname',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
    ]),
    firstName: getClaimValue(claims, [
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      'given_name'
    ]),
    lastName: getClaimValue(claims, [
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      'family_name'
    ]),
    email: getClaimValue(claims, [
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      'email',
      'upn'
    ]),
    department: getClaimValue(claims, [
      'department',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/department'
    ]),
    jobTitle: getClaimValue(claims, [
      'jobTitle',
      'http://schemas.microsoft.com/identity/claims/jobtitle'
    ]),
    phone: getClaimValue(claims, [
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/otherphone',
      'phone_number'
    ])
  };

  let graphProfile = null;
  const accessToken = principal.access_token;

  if (includeGraph && accessToken) {
    try {
      const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,mobilePhone,businessPhones,officeLocation,streetAddress,city,state,postalCode', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (graphResponse.ok) {
        graphProfile = await graphResponse.json();

        baseProfile.displayName = graphProfile.displayName || baseProfile.displayName;
        baseProfile.firstName = graphProfile.givenName || baseProfile.firstName;
        baseProfile.lastName = graphProfile.surname || baseProfile.lastName;
        baseProfile.email = graphProfile.mail || graphProfile.userPrincipalName || baseProfile.email;
        baseProfile.department = graphProfile.department || baseProfile.department;
        baseProfile.jobTitle = graphProfile.jobTitle || baseProfile.jobTitle;
        baseProfile.phone = graphProfile.mobilePhone || baseProfile.phone;
        baseProfile.workPhone = Array.isArray(graphProfile.businessPhones) ? graphProfile.businessPhones[0] : undefined;
        baseProfile.officeLocation = graphProfile.officeLocation || baseProfile.officeLocation;
        baseProfile.address = graphProfile.streetAddress;
        baseProfile.city = graphProfile.city;
        baseProfile.state = graphProfile.state;
        baseProfile.zipCode = graphProfile.postalCode;
      } else {
        console.warn('Microsoft Graph responded with status:', graphResponse.status);
      }
    } catch (graphError) {
      console.warn('Microsoft Graph request failed:', graphError.message);
    }
  } else if (!accessToken) {
    console.warn('No access token available for Microsoft Graph');
  }

  return { principal, claims, baseProfile, graphProfile, accessToken };
};

// API endpoint to get user profile
app.get('/api/profile', async (req, res) => {
  try {
    const { principal, baseProfile, claims, graphProfile } = await fetchProfileData(req);

    res.json({
      profile: baseProfile,
      authProvider: principal.identity_provider,
      claims,
      graph: graphProfile
    });
  } catch (error) {
    const status = error instanceof ProfileError ? error.status : 500;
    if (!(error instanceof ProfileError)) {
      console.error('Profile API error:', error);
    }
    res.status(status).json({ error: error.message || 'Failed to get user profile' });
  }
});

// API endpoint to check authentication status
app.get('/api/auth/status', (req, res) => {
  try {
    console.log('Auth status check - Headers received:');
    console.log('x-ms-client-principal:', req.headers['x-ms-client-principal'] ? 'Present' : 'Not present');
    console.log('x-ms-client-principal-idp:', req.headers['x-ms-client-principal-idp']);
    console.log('x-ms-client-principal-name:', req.headers['x-ms-client-principal-name']);
    
    const clientPrincipal = req.headers['x-ms-client-principal'];
    const clientPrincipalIdp = req.headers['x-ms-client-principal-idp'];
    const clientPrincipalName = req.headers['x-ms-client-principal-name'];
    
    if (clientPrincipal) {
      const decoded = Buffer.from(clientPrincipal, 'base64').toString('ascii');
      const userInfo = JSON.parse(decoded);
      
      console.log('Decoded user info:', userInfo);
      
      const response = {
        authenticated: true,
        user: {
          id: userInfo.userId || userInfo.sid,
          name: userInfo.userDetails || clientPrincipalName,
          email: userInfo.claims?.find(c => c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress')?.val,
          provider: clientPrincipalIdp || 'aad'
        }
      };
      
      console.log('Sending authenticated response:', response);
      res.json(response);
    } else {
      console.log('No authentication headers found, sending unauthenticated response');
      res.json({
        authenticated: false,
        user: null
      });
    }
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({ 
      error: 'Failed to check authentication status',
      authenticated: false 
    });
  }
});

// Alternative auth endpoint using Azure's built-in endpoint
app.get('/api/auth/me', async (req, res) => {
  try {
    console.log('Auth me endpoint called');
    
    // Try the built-in Azure endpoint first
    const authResponse = await fetch(`${getAppBaseUrl(req)}/.auth/me`, {
      headers: {
        'cookie': req.headers.cookie || '',
        'x-zumo-auth': req.headers['x-zumo-auth'] || ''
      }
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('Azure auth response:', authData);
      
      if (authData && authData.length > 0 && authData[0].user_id) {
        const userInfo = authData[0];
        res.json({
          authenticated: true,
          user: {
            id: userInfo.user_id,
            name: userInfo.user_claims?.find(c => c.typ === 'name')?.val || userInfo.user_id,
            email: userInfo.user_claims?.find(c => c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress')?.val,
            provider: userInfo.identity_provider || 'aad'
          }
        });
      } else {
        res.json({ authenticated: false, user: null });
      }
    } else {
      console.log('Azure auth endpoint returned:', authResponse.status);
      res.json({ authenticated: false, user: null });
    }
  } catch (error) {
    console.error('Auth me error:', error);
    res.json({ authenticated: false, user: null });
  }
});

// API endpoint to update user profile
app.post('/api/intake', express.json(), async (req, res) => {
  try {
    const { principal, baseProfile } = await fetchProfileData(req, { includeGraph: false });

    if (!process.env.SQL_SERVER && !process.env.SQL_CONNECTION_STRING) {
      return res.status(500).json({ error: 'SQL Database configuration missing on server.' });
    }

    const body = req.body || {};
    const sanitize = (value, maxLength = 4000) => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
    };

    const firstName = sanitize(body.firstName, 150) || baseProfile.firstName;
    const lastName = sanitize(body.lastName, 150) || baseProfile.lastName;
    const email = baseProfile.email || sanitize(body.email, 256);

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    await upsertIntakeForm({
      userId: principal.user_id,
      email,
      firstName,
      lastName,
      department: sanitize(body.department, 150),
      jobTitle: sanitize(body.jobTitle, 150),
      officeLocation: sanitize(body.officeLocation, 150),
      workPhone: sanitize(body.workPhone, 50),
      address: sanitize(body.address, 500),
      city: sanitize(body.city, 150),
      state: sanitize(body.state, 50),
      zipCode: sanitize(body.zipCode, 20),
      phone: sanitize(body.phone, 50)
    });

    // Attempt Microsoft Graph account creation using client credentials
    // This is best-effort and won't fail the intake save if Graph fails.
    let accountCreation = { created: false };
    try {
      const graphResult = await createUserFromIntake({
        firstName,
        lastName,
        email,
        department: sanitize(body.department, 150),
        jobTitle: sanitize(body.jobTitle, 150),
        officeLocation: sanitize(body.officeLocation, 150),
        workPhone: sanitize(body.workPhone, 50),
        address: sanitize(body.address, 500),
        city: sanitize(body.city, 150),
        state: sanitize(body.state, 50),
        zipCode: sanitize(body.zipCode, 20),
        phone: sanitize(body.phone, 50),
        displayName: baseProfile.displayName
      });
      accountCreation = {
        created: true,
        userId: graphResult?.created?.id,
        userPrincipalName: graphResult?.created?.userPrincipalName,
        initialPassword: graphResult?.initialPassword
      };
    } catch (graphErr) {
      console.warn('Graph account creation failed:', graphErr?.message || graphErr);
      accountCreation = { created: false, error: graphErr?.message };
    }

    res.json({
      message: 'Intake form saved successfully.',
      accountCreation
    });
  } catch (error) {
    const status = error instanceof ProfileError ? error.status : 500;
    if (!(error instanceof ProfileError)) {
      console.error('Intake form submission error:', error);
    }
    res.status(status).json({
      error: error.message || 'Failed to submit intake form.'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
