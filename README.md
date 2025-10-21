# FL WINS - Florida Workforce Innovation Network System

A modern, responsive web application for Florida's Workforce Innovation Network System, built with Node.js and Express.js for deployment on Azure App Service.

## Features

- **Express.js** framework for web server
- **Security** middleware with Helmet.js
- **CORS** support for cross-origin requests
- **Environment** configuration with dotenv
- **Health check** endpoint for monitoring
- **Static file** serving from public directory
- **Azure App Service** ready configuration

## Prerequisites

- Node.js 22 LTS
- npm or yarn package manager

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

### Local Development
```bash
# Start development server with nodemon
npm run dev

# Start production server
npm start
```

The application will be available at `http://localhost:3000`

### Environment Variables

Create a `.env` file in the project root with the following variables:
```
NODE_ENV=development
PORT=3000
```

## API Endpoints

- `GET /` - Main API endpoint with server information
- `GET /health` - Health check endpoint
- Static files served from `/public` directory

## Azure App Service Deployment

This application is configured for Azure App Service with:

- **Runtime Stack**: Node.js 22 LTS
- **Startup Command**: `npm start`
- **Web.config** for IIS integration
- **Package.json** with proper Node.js version specification

### Deployment Steps

1. Create an Azure App Service with Node.js 22 runtime
2. Configure application settings:
   - `NODE_ENV=production`
   - `WEBSITE_NODE_DEFAULT_VERSION=22-lts`
3. Deploy using your preferred method (Git, VS Code, GitHub Actions, etc.)

## Project Structure

```
flwins2-dev/
├── .github/
│   └── copilot-instructions.md
├── .vscode/
│   └── launch.json
├── public/
│   └── index.html
├── .env
├── .gitignore
├── app.js
├── package.json
├── web.config
└── README.md
```

## Scripts

- `npm start` - Start the application
- `npm run dev` - Start with nodemon for development
- `npm test` - Run tests (not implemented yet)

## License

MIT