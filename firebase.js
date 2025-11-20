// firebase.js - initialize Firebase app and export firestore helpers
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, where, limit
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAK6isd6VL5cQEe-c6p0lqan9OOpXIBtU",
  authDomain: "editor-de-letras.firebaseapp.com",
  projectId: "editor-de-letras",
  storageBucket: "editor-de-letras.firebasestorage.app",
  messagingSenderId: "235141484726",
  appId: "1:235141484726:web:b2c8382d6c5cf9305c9617"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db, collection, addDoc, getDocs, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, where, limit
};
