@echo off
echo Deploying Mailchimp function with updated CORS...
npx firebase deploy --only functions:subscribeToMailchimp
echo.
echo Deployment complete!
pause