import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { StoredVideo } from './videoStorage';

// Initialize Firebase App singleton
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth: Auth = getAuth(app);

// Initialize Firestore targeting the specific provisioned database
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Validate connection to Firestore as required by the integration directives.
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently in offline mode or connecting...');
    }
    return false;
  }
}

/**
 * Sign in using Google OAuth popup
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign in anonymously for quick trial without popup blockers
 */
export async function signInAsGuest(displayName?: string): Promise<User> {
  const result = await signInAnonymously(auth);
  if (displayName && result.user) {
    await updateProfile(result.user, { displayName });
  }
  return result.user;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, pass: string, name?: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && result.user) {
    await updateProfile(result.user, { displayName: name });
  }
  return result.user;
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Listen to authentication state changes
 */
export function subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * ============================================================================
 * FIRESTORE PERSISTENT VIDEOS API
 * Path: /users/{userId}/videos/{videoId}
 * ============================================================================
 */

/**
 * Persist a video record to the user's Firestore account
 */
export async function saveUserVideoToFirestore(userId: string, video: StoredVideo): Promise<void> {
  if (!userId) throw new Error('Cannot save video without an authenticated user ID.');

  const videoRef = doc(db, 'users', userId, 'videos', video.id);

  // Strip non-serializable blob before storing in Firestore
  const payload: any = {
    id: video.id,
    userId,
    quote: video.quote,
    candidateName: video.candidateName,
    generatedDate: video.generatedDate,
    thumbnailUrl: video.thumbnailUrl,
    durationSec: video.durationSec || 6.0,
    videoUrl: video.videoUrl || '',
    promptUsed: video.promptUsed || '',
    createdAt: video.createdAt || Date.now(),
  };

  await setDoc(videoRef, payload, { merge: true });
}

/**
 * Delete a video record from the user's Firestore account
 */
export async function deleteUserVideoFromFirestore(userId: string, videoId: string): Promise<void> {
  if (!userId) return;
  const videoRef = doc(db, 'users', userId, 'videos', videoId);
  await deleteDoc(videoRef);
}

/**
 * Subscribe to real-time updates of the user's persisted videos in Firestore
 */
export function subscribeToUserVideos(
  userId: string,
  onVideosUpdated: (videos: StoredVideo[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    onVideosUpdated([]);
    return () => {};
  }

  const videosCol = collection(db, 'users', userId, 'videos');
  const q = query(videosCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoredVideo[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: data.id || d.id,
          quote: data.quote || '',
          candidateName: data.candidateName || 'Hermione',
          generatedDate: data.generatedDate || '',
          thumbnailUrl: data.thumbnailUrl || '/candidates/hermione.png',
          durationSec: data.durationSec || 6.0,
          videoUrl: data.videoUrl || '',
          promptUsed: data.promptUsed || '',
          createdAt: data.createdAt || Date.now(),
        });
      });
      onVideosUpdated(items);
    },
    (err) => {
      console.warn('Firestore user videos subscription warning:', err);
      onError?.(err);
    }
  );
}
