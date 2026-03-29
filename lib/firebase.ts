import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
	apiKey: 'AIzaSyA2DqPHizmQVhr0Vgp8Lco7No19fahsBz4',
	authDomain: 'my-first-fb-db.firebaseapp.com',
	projectId: 'my-first-fb-db',
	storageBucket: 'my-first-fb-db.firebasestorage.app',
	messagingSenderId: '496273439981',
	appId: '1:496273439981:web:3e362be4ba60dff882e0e4',
	measurementId: 'G-EVXSK0S3HT',
};

// Inicializar Firebase (Patrón Singleton para Next.js)
const app: FirebaseApp =
	getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicializar Firestore
const db: Firestore = getFirestore(app);

// Inicializar Auth
const auth: Auth = getAuth(app);

export { app, db, auth };
