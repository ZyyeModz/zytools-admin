# ZYTOOLS Admin Panel

Dark responsive Firebase admin dashboard for GitHub Pages.

## Included
- Firebase email/password admin login
- Admin-only Realtime Database viewer
- App user-record management
- License record create/enable/disable/delete
- App configuration editor
- Firebase Authentication ban/unban callable function
- GitHub Actions deployment to GitHub Pages

## 1. Register a Firebase Web App
Your uploaded `google-services.json` contains Android app registrations, not a Web App ID. In Firebase Console:
1. Open project `zyttols-2d95f`.
2. Project settings → General → Your apps → Add app → Web.
3. Register the web app (hosting setup is optional).
4. Copy the Web App configuration's `appId`.
5. Replace `REPLACE_WITH_WEB_APP_ID` in `src/firebase.js` with that Web App ID.

The project ID, database URL, sender ID, storage bucket, and API key are prefilled from the uploaded config. Confirm them in Firebase Console before deploying.

## 2. Enable Authentication
Firebase Console → Authentication → Get started → Sign-in method → enable Email/Password.
Create your own admin account under Authentication → Users → Add user.
Do not create a public sign-up page. Only accounts you create and explicitly grant the admin claim can enter the panel.

## 3. Install and deploy backend functions
Install Node.js 22 and Firebase CLI on your computer, or use a trusted development environment:
```bash
npm install -g firebase-tools
firebase login
firebase use zyttols-2d95f
cd functions
npm install
cd ..
firebase deploy --only database
firebase deploy --only functions
```
Cloud Functions deployment may require the Firebase project to be on the Blaze billing plan. Review usage and budget alerts first.

## 4. Grant the first admin claim
In Firebase Console → Project settings → Service accounts, generate a private key for a service account with appropriate project permissions. Store it outside the repository. Never upload it to GitHub, send it in chat, or put it in frontend code.

From the project root, run:
```bash
# macOS/Linux:
GOOGLE_APPLICATION_CREDENTIALS="./service-account.json" node scripts/set-admin-claim.js your-admin-email@example.com

# Windows PowerShell:
$env:GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"
node scripts/set-admin-claim.js your-admin-email@example.com
```
The `service-account.json` file must be kept private and is ignored by `.gitignore`. If it was ever exposed, revoke/rotate that key immediately. Sign out and sign back in to refresh the admin token.

## 5. Deploy the dashboard to GitHub Pages
1. Create a private or public GitHub repository named exactly `zytools-admin` (or update `base` in `vite.config.js` to match your repo name).
2. Upload the project files to the repository root. Do not upload service-account keys.
3. In GitHub repository → Settings → Pages → Build and deployment, choose **GitHub Actions**.
4. Push to the `main` branch. The workflow builds and deploys the site.
5. Open `https://YOUR_GITHUB_USERNAME.github.io/zytools-admin/`.

For a custom repository name, change `base: "/zytools-admin/"` in `vite.config.js` to `base: "/YOUR_REPOSITORY_NAME/"`.

## 6. Database structure
The dashboard uses:
```json
{
  "users": {
    "FIREBASE_UID_OR_APP_USER_ID": {
      "email": "user@example.com",
      "licenseKey": "ZY-EXAMPLE",
      "banned": false,
      "updatedAt": 0
    }
  },
  "licenses": {
    "ZY-EXAMPLE": {
      "status": "active",
      "owner": "",
      "createdAt": 0,
      "expiresAt": null
    }
  },
  "appConfig": {
    "appName": "ZYTOOLS",
    "announcement": "",
    "minimumVersion": "1.0.0",
    "maintenance": false
  }
}
```

## Important notes
- The `users` table is an app-owned user-record table. Firebase Authentication accounts are separate. The Ban/Unban action calls Firebase Auth by UID; it does not create or delete accounts.
- The current dashboard displays the app user records from `/users`. `listAuthUsers` is included as a protected backend function for extending the UI to show Auth accounts. Do not expose it publicly.
- Your Android app must read the same `/licenses` and `/appConfig` schema and enforce license validation server-side for meaningful protection. A client-only check can be modified.
- The rules intentionally deny all access except authenticated users with the trusted `admin: true` custom claim. Do not change them to public read/write.
- A license key created in this panel is a database record only. Connect your Android app's license-validation flow to this schema before treating keys as active subscriptions.
- Before using this on real users, test with a separate test account and review Firebase billing, App Check, and data retention settings.
