# FLWINS2 Development - Copilot Instructions

This is a Node.js 22 LTS web application built for Azure App Service deployment.

## Project Overview
- **Framework**: Express.js
- **Runtime**: Node.js 22 LTS
- **Target Platform**: Azure App Service
- **Development Environment**: Visual Studio Code

## Key Files
- `app.js` - Main application entry point
- `package.json` - Dependencies and scripts
- `web.config` - Azure App Service configuration
- `public/index.html` - Static HTML content
- `.vscode/launch.json` - VS Code debugging configuration

## Development Guidelines
- Use `npm start` to run the production server
- Use `npm run dev` to run with nodemon for development
- Environment variables are configured in `.env` file
- Health check endpoint available at `/health`
- Static files served from `public/` directory