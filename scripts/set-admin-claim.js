// Run locally from the project root after downloading a service-account key.
// NEVER commit the service-account JSON file to GitHub.
const admin = require("firebase-admin");
const path = require("node:path");

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const email = process.argv[2];

if (!serviceAccountPath || !email) {
  console.error("Usage: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/set-admin-claim.js admin@example.com");
  process.exit(1);
}
const serviceAccount = require(path.resolve(serviceAccountPath));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

(async () => {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
  console.log(`Admin claim granted to ${email} (${user.uid}). Sign out and sign in again.`);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
