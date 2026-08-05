// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVivfTrMCVrNO6ThPtRhYVWm-1hAWTMJE",
  authDomain: "customised-gifts.firebaseapp.com",
  projectId: "customised-gifts",
  storageBucket: "customised-gifts.firebasestorage.app",
  messagingSenderId: "754059671259",
  appId: "1:754059671259:web:6464ed2e33fdda0743befe",
  measurementId: "G-Y47ZEFWQ4Q",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);


