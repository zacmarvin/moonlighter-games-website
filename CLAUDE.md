# Moonlighter Games Website - Development Guide

## Official Color Palette

- **Darkest Green**: #1A361F
- **Dark Green**: #2B5433
- **Green**: #589253
- **Light Green**: #8CBA6E
- **Yellow**: #FFEA21
- **Orange**: #CB760C

## Project Structure

This is a React/TypeScript website built with Vite and hosted on Firebase.

### Key Technologies
- React 19.1.0
- TypeScript
- Vite 5.4.11
- React Router DOM
- Firebase Hosting

### Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npx firebase deploy --only hosting` - Deploy to Firebase

### Pages
- Home (`/`)
- About (`/about`)
- Lawn Care Simulator (`/lawn-care-simulator`)

### Components
- Header - Navigation with mobile menu
- Hero - Homepage hero section
- Footer - Site footer with links
- Screenshot Gallery - Interactive gallery with lightbox

### Deployment
- Firebase Project: moonlightergameswebsite
- Live URL: https://moonlightergames.com
- Firebase URL: https://moonlightergameswebsite.web.app

## Deployment Instructions

### Quick Deploy
```bash
# Build and deploy in one command
npm run build && npx firebase deploy --only hosting

# Or separately:
npm run build
npx firebase deploy --only hosting
```

### Deploy Process
1. Make your changes and test locally with `npm run dev`
2. Run linting to ensure code quality: `npm run lint`
3. Build the production version: `npm run build`
4. Deploy to Firebase: `npx firebase deploy --only hosting`

The site will be deployed to:
- Production URL: https://moonlightergames.com
- Firebase URL: https://moonlightergameswebsite.web.app

### Troubleshooting Deployment
- If using Git Bash on Windows, use PowerShell or Command Prompt for Firebase commands
- Ensure you're logged in to Firebase: `firebase login`
- Check that you're in the correct project directory