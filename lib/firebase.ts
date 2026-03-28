import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
	
};

// Inicializar Firebase (Patrón Singleton para Next.js)
const app: FirebaseApp =
	getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicializar Firestore
const db: Firestore = getFirestore(app);

// Inicializar Auth
const auth: Auth = getAuth(app);

export { app, db, auth };
