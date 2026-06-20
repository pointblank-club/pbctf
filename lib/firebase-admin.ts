import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth, type Auth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
// For production: Use service account credentials from environment variables
// For development: Uses application default credentials or can work without full verification

const getFirebaseAdmin = (): App => {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0]!;
  }

  // Check if we have service account credentials
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    // Full credentials available - use them
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  // Fallback: Initialize with just project ID (limited functionality)
  if (projectId) {
    return initializeApp({
      projectId,
    });
  }

  throw new Error('Firebase Admin SDK requires at least FIREBASE_PROJECT_ID to be set');
};

// Lazy initialization
let firebaseAdmin: App | null = null;

export const getAdmin = (): App => {
  if (!firebaseAdmin) {
    firebaseAdmin = getFirebaseAdmin();
  }
  return firebaseAdmin;
};

export const getAuth = (): Auth => {
  return getAdminAuth(getAdmin());
};
