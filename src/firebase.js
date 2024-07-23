import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js'

// If you enabled Analytics in your project, add the Firebase SDK for Google Analytics
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js'

// Add Firebase products that you want to use
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  connectAuthEmulator,
} from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  connectFirestoreEmulator
} from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js'

export const firebaseConfig = {
  apiKey: "AIzaSyCPk288cXOkT8YToajeENki-pAm3uABijk",
  authDomain: "wordo-449f3.firebaseapp.com",
  projectId: "wordo-449f3",
  storageBucket: "wordo-449f3.appspot.com",
  messagingSenderId: "239193131058",
  appId: "1:239193131058:web:c8e8a370fa8bf13c09542b",
  measurementId: "G-88ZRB3JD1H"
}

export const app = initializeApp(firebaseConfig)
export const analytics = getAnalytics(app)
export const auth = getAuth()
export const db = getFirestore()
connectAuthEmulator(auth, "http://127.0.0.1:9099")
connectFirestoreEmulator(db, 'http://127.0.0.1', 9090)

export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}
