import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // Aggiunto per il database in tempo reale

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "cuticchiune-card-game.firebaseapp.com",
  databaseURL: "https://cuticchiune-card-game-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cuticchiune-card-game",
  storageBucket: "cuticchiune-card-game.firebasestorage.app",
  messagingSenderId: "265976746182",
  appId: "1:265976746182:web:ed02b696a1f97451df47c7"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza il Realtime Database e lo esporta per usarlo in React
export const db = getDatabase(app);