const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args)));
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

// API endpoint to get user profile
app.get('/api/profile', async (req, res) => {
  try {
    // Request the authenticated principal from Azure App Service
    const authResponse = await fetch(`${getAppBaseUrl(req)}/.auth/me`, {
      headers: {
        cookie: req.headers.cookie || '',
        'x-zumo-auth': req.headers['x-zumo-auth'] || ''
      }
    });

    if (!authResponse.ok) {
      console.warn('Azure /.auth/me returned status:', authResponse.status);
      return res.status(401).json({
        error: 'User not authenticated',
        message: 'Authentication context not available'
      });
    }

    const authData = await authResponse.json();
    const principal = authData?.[0];

    if (!principal || !principal.user_id) {
      return res.status(401).json({
        error: 'User not authenticated',
        message: 'Azure principal not found'
      });
    }

    const claims = principal.user_claims || [];

    // Build a base profile from the available claims
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

    // Enhance with Microsoft Graph data if an access token is available
    const accessToken = principal.access_token;
    if (accessToken) {
      try {
        const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,mobilePhone,businessPhones,officeLocation', {
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
          baseProfile.phone = graphProfile.mobilePhone || graphProfile.businessPhones?.[0] || baseProfile.phone;
          baseProfile.officeLocation = graphProfile.officeLocation || baseProfile.officeLocation;
        } else {
          console.warn('Microsoft Graph responded with status:', graphResponse.status);
        }
      } catch (graphError) {
        console.warn('Microsoft Graph request failed:', graphError.message);
      }
    } else {
      console.warn('No access token available for Microsoft Graph');
    }

    res.json({
      profile: baseProfile,
      authProvider: principal.identity_provider,
      claims,
      graph: graphProfile
    });
  } catch (error) {
    console.error('Profile API error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
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
app.post('/api/profile', express.json(), (req, res) => {
  // Note: Azure AD user attributes are typically read-only for standard apps
  // This endpoint would need Microsoft Graph API permissions to update user profiles
  res.json({ 
    message: 'Profile update received',
    note: 'Azure AD profile updates require Microsoft Graph API integration'
  });
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