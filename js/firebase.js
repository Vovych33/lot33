import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, onValue, child, runTransaction } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
	apiKey: "AIzaSyCg07PgXIt3ZQERScVpPyWxHFf5wurstHU",
	authDomain: "lotery-lot33.firebaseapp.com",
	databaseURL: "https://lotery-lot33-default-rtdb.europe-west1.firebasedatabase.app",
	projectId: "lotery-lot33",
	storageBucket: "lotery-lot33.firebasestorage.app",
	messagingSenderId: "261478716126",
	appId: "1:261478716126:web:cf757487291ccb4b91a84f"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Экспорт
export { db, ref, get, set, update, remove, onValue, child, runTransaction, auth, signInWithEmailAndPassword, onAuthStateChanged, signOut };