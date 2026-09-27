import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCLwy1KTRhE5fKrtkNKDq9m7zsY3QCV7Fc",
  authDomain: "missao-agua-destinos.firebaseapp.com",
  projectId: "missao-agua-destinos",
  storageBucket: "missao-agua-destinos.firebasestorage.app",
  messagingSenderId: "905571472581",
  appId: "1:905571472581:web:5f6269b0f40543002a0cac",
  measurementId: "G-WN9L5TWG8V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Analytics only works in the browser
let analytics;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch {
    // Analytics might not be supported in some iframe or sandbox environments
  }
}

export { app, analytics, db };
