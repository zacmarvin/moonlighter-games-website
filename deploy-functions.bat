@echo off
echo Deploying Firebase Functions...
call npx firebase deploy --only functions
pause