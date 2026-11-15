import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";

// The API key and project identifiers below came from your uploaded Android
// Firebase config. Register a WEB app in Firebase Console and replace appId
// with the Web App ID shown there. Android app IDs are not Web App IDs.
const firebaseConfig = {
  apiKey: "AIzaSyDlv7KsE7y_b3iWhc88Hocya45grC5A-4M",
  authDomain: "zyttols-2d95f.firebaseapp.com",
  databaseURL: "https://zyttols-2d95f-default-rtdb.firebaseio.com",
  projectId: "zyttols-2d95f",
  storageBucket: "zyttols-2d95f.firebasestorage.app",
  messagingSenderId: "394462887600",
  appId: "REPLACE_WITH_WEB_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const functions = getFunctions(app, "asia-southeast1");
