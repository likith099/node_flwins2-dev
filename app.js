const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

// API endpoint to get user profile
app.get('/api/profile', (req, res) => {
  try {
    // For Azure App Service, the user info is available in headers
    const clientPrincipal = req.headers['x-ms-client-principal'];
    
    if (clientPrincipal) {
      // Decode the base64 encoded client principal
      const decoded = Buffer.from(clientPrincipal, 'base64').toString('ascii');
      const userInfo = JSON.parse(decoded);
      res.json({ user: userInfo });
    } else {
      // Return a message indicating no authentication info available
      res.status(401).json({ 
        error: 'User not authenticated',
        message: 'No Azure authentication headers found'
      });
    }
  } catch (error) {
    console.error('Profile API error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
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