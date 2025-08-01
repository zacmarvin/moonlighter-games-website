# Moonlighter Games Website

Official website for Moonlighter Games, featuring our flagship title Lawn Care Simulator.

## Tech Stack

- React 19.1.0 + TypeScript
- Vite 5.4.11
- React Router DOM
- Firebase Hosting
- Formspree (Contact Forms)
- Mailchimp (Newsletter)

## Getting Started

### Prerequisites
- Node.js (v20.10.0 or higher)
- npm
- Firebase CLI (`npm install -g firebase-tools`)

### Installation
```bash
# Clone the repository
git clone [repository-url]

# Navigate to project directory
cd "Moonlighter Games Website"

# Install dependencies
npm install
```

## Development

### Local Development Server
```bash
npm run dev
```
Opens the site at http://localhost:5173 with hot module replacement.

### Build for Production
```bash
npm run build
```
Creates optimized production build in the `dist` folder.

### Linting
```bash
npm run lint
```

## Deployment

### Deploy to Firebase Hosting
```bash
# Build and deploy in one command
npm run build && npx firebase deploy --only hosting

# Or separately:
npm run build
npx firebase deploy --only hosting
```

The site will be deployed to:
- Production: https://moonlightergames.com
- Firebase URL: https://moonlightergameswebsite.web.app

### Deploy Other Services
```bash
# Deploy everything (hosting, functions, firestore)
npx firebase deploy

# Deploy specific services
npx firebase deploy --only functions
npx firebase deploy --only firestore
```

**Note:** Functions deployment may require PowerShell or Command Prompt on Windows due to Git Bash path issues.

## Project Structure

```
├── public/              # Static assets (images, favicon)
├── src/
│   ├── components/      # Reusable React components
│   ├── pages/          # Page components
│   ├── data/           # Data files (news posts)
│   └── styles/         # Global styles
├── functions/          # Firebase Cloud Functions
└── dist/               # Production build (git ignored)
```

## Features

- **Landing Page**: Split hero showcasing Moonlighter Games and Lawn Care Simulator
- **About Page**: Company information and team profiles
- **Game Page**: Lawn Care Simulator details with screenshot gallery
- **News/Devlog**: Patch notes and development updates
- **Contact Page**: 
  - Contact form (via Formspree)
  - Newsletter signup (via Mailchimp)

## Configuration

### Environment Variables
Functions use Firebase config for sensitive data:
```bash
# Mailchimp (already configured)
firebase functions:config:get

# To add SendGrid (when ready)
firebase functions:config:set sendgrid.key="YOUR_API_KEY"
```

### Form Services
- **Contact Form**: Formspree endpoint configured in `src/pages/Contact.tsx`
- **Newsletter**: Mailchimp integration via Firebase Functions

## Common Tasks

### Update Content
1. Make changes to components/pages
2. Test locally with `npm run dev`
3. Build and deploy: `npm run build && npx firebase deploy --only hosting`

### Add News Post
1. Edit `src/data/newsData.ts`
2. Add new post object with type, date, content
3. Deploy changes

### Update Team Photos
1. Add images to `public/` folder
2. Reference in components with `/filename.ext`
3. Deploy changes

## Troubleshooting

### Git Bash Deployment Issues
Use PowerShell or Command Prompt instead of Git Bash for Firebase deployments.

### CORS Errors
Functions are configured to accept requests from:
- https://moonlightergames.com
- https://www.moonlightergames.com
- http://localhost:5173

### Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (should be v20+)

## License

© 2025 Moonlighter Games. All rights reserved.