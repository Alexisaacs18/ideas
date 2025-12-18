# OAuth Setup Checklist

After changing Google OAuth project and keys:

## ✅ Completed
- [x] Updated `.env` file with new `VITE_GOOGLE_OAUTH_CLIENT_ID`
- [x] Updated Cloudflare secrets:
  - [x] `GOOGLE_OAUTH_CLIENT_ID`
  - [x] `GOOGLE_OAUTH_CLIENT_SECRET`

## 🔧 To Do

### 1. Google Cloud Console Configuration
- [ ] Go to: https://console.cloud.google.com/apis/credentials
- [ ] Click on your OAuth 2.0 Client ID
- [ ] Add these **Authorized redirect URIs**:
  ```
  https://hidden-grass-22b6.alexisaacs18.workers.dev
  https://hidden-grass-22b6.alexisaacs18.workers.dev/admin
  http://localhost:5173
  http://localhost:5173/admin
  ```
- [ ] Click "Save"

### 2. Local Development
- [ ] Stop your dev server (if running)
- [ ] Restart: `npm run dev`
- [ ] Test OAuth at: http://localhost:5173

### 3. Production Testing
- [ ] Test main auth: https://hidden-grass-22b6.alexisaacs18.workers.dev
- [ ] Test admin auth: https://hidden-grass-22b6.alexisaacs18.workers.dev/admin
- [ ] Check browser console for any OAuth errors

## 🐛 Debugging

If OAuth fails:
1. Open browser DevTools (F12)
2. Check Console tab for debug logs
3. Look for `=== OAUTH DEBUG ===` sections
4. Copy the exact Redirect URI shown
5. Verify it matches Google Cloud Console exactly

## 📝 Notes

- Cloudflare secrets are **live** - no redeploy needed
- `.env` changes require **dev server restart**
- Redirect URIs must match **exactly** (including trailing slashes, paths, etc.)

