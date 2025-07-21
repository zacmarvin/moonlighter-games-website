# Firebase Functions Deployment Instructions for Windows

The deployment is failing due to a Git Bash path issue on Windows. Here are alternative ways to deploy:

## Method 1: Use PowerShell (Recommended)

1. Open PowerShell as Administrator
2. Navigate to your project:
   ```powershell
   cd "C:\Users\zacha\Documents\Moonlighter Games Website"
   ```
3. Run the deployment:
   ```powershell
   npx firebase deploy --only functions
   ```

Or use the script I created:
```powershell
.\deploy-functions.ps1
```

## Method 2: Use Command Prompt

1. Open Command Prompt (cmd.exe)
2. Navigate to your project:
   ```cmd
   cd /d "C:\Users\zacha\Documents\Moonlighter Games Website"
   ```
3. Deploy:
   ```cmd
   npx firebase deploy --only functions
   ```

## Method 3: Use Windows Terminal

1. Open Windows Terminal
2. Make sure you're in Command Prompt or PowerShell mode (not Git Bash)
3. Run the deployment commands above

## Method 4: Fix Git Bash Path Issue

The error `/usr/bin/bash: Files\Git\bin\bash.exe: No such file or directory` suggests Git is installed in a path with spaces (like "Program Files").

To fix:
1. Reinstall Git to a path without spaces (e.g., C:\Git)
2. Or set the PATH environment variable to use the short name (PROGRA~1)

## What Happens After Successful Deployment

You should see output like:
```
✔  functions[sendContactEmail]: Successful create operation.
✔  functions[subscribeToMailchimp]: Successful create operation.
✔  functions[subscribeNewsletter]: Successful create operation.
✔  functions[getNewsletterSubscribers]: Successful create operation.

Deploy complete!
```

Your functions will be available at:
- https://us-central1-moonlightergameswebsite.cloudfunctions.net/subscribeToMailchimp
- https://us-central1-moonlightergameswebsite.cloudfunctions.net/sendContactEmail

## Current Status

✅ Functions code is ready and error-free
✅ Mailchimp is configured with your API credentials
✅ Functions are converted to v2 format
❌ Deployment blocked by Git Bash path issue

The functions will work as soon as they're deployed using one of the methods above!