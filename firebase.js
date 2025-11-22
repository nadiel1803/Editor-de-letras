// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// Import serviços que vamos usar
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCAK6isd6VL5cQEe-c6p0lqan9OOpXIBtU",
  authDomain: "editor-de-letras.firebaseapp.com",
  projectId: "editor-de-letras",
  storageBucket: "editor-de-letras.firebasestorage.app",
  messagingSenderId: "235141484726",
  appId: "1:235141484726:web:b2c8382d6c5cf9305c9617"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Exportar instâncias dos serviços para usar em outros arquivos
export const db = getFirestore(app);
export const auth = getAuth(app);
