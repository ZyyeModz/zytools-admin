const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

function requireAdmin(request) {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Administrator access required.");
  }
}

exports.setUserDisabled = onCall({ region: "asia-southeast1" }, async (request) => {
  requireAdmin(request);
  const uid = String(request.data?.uid || "").trim();
  const disabled = request.data?.disabled;
  if (!uid || typeof disabled !== "boolean") {
    throw new HttpsError("invalid-argument", "A UID and boolean disabled value are required.");
  }
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "You cannot disable your own admin account.");
  }
  try {
    await getAuth().updateUser(uid, { disabled });
    return { ok: true, message: disabled ? "Account banned." : "Account unbanned." };
  } catch (error) {
    console.error("setUserDisabled failed", error);
    throw new HttpsError("not-found", "Could not update that Auth account. Check the UID.");
  }
});

exports.listAuthUsers = onCall({ region: "asia-southeast1" }, async (request) => {
  requireAdmin(request);
  const result = await getAuth().listUsers(1000);
  return {
    users: result.users.map(u => ({
      uid: u.uid,
      email: u.email || "",
      displayName: u.displayName || "",
      disabled: u.disabled,
      emailVerified: u.emailVerified,
      creationTime: u.metadata.creationTime,
      lastSignInTime: u.metadata.lastSignInTime
    })),
    pageToken: result.pageToken || null
  };
});
