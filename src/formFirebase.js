import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Hardcoded configuration for the Google Form Realtime Database
const formFirebaseConfig = {
  apiKey: "AIzaSyAhBjTXdKtTuxjr7TRWDkGhIpgiTBDMHLU",
  authDomain: "sahayak-ai-3581c.firebaseapp.com",
  projectId: "sahayak-ai-3581c",
  storageBucket: "sahayak-ai-3581c.firebasestorage.app",
  messagingSenderId: "720472536087",
  appId: "1:720472536087:web:140a06b9d6d557dae49852",
  measurementId: "G-VLEXC6RD49",
  // Using a more reliable way to specify the database URL
  databaseURL: "https://sahayak-ai-3581c-default-rtdb.firebaseio.com"
};

// Initialize the second Firebase app
const formApp = initializeApp(formFirebaseConfig, "secondary-app");

export const formDb = getDatabase(formApp);
