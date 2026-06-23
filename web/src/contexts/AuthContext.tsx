import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  updatePassword,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db, isFirebaseConfigured, firebaseSetupMessage } from '../config/firebase';
import { COLLECTIONS } from '../constants/collections';

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  changeEmail: (currentPassword: string, newEmail: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

const setupContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
};

const setupPanelStyle: React.CSSProperties = {
  width: 'min(100%, 720px)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  padding: '24px',
  background: 'var(--bg-secondary)',
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
};

const headingStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: '1.5rem',
  lineHeight: 1.2,
};

const textStyle: React.CSSProperties = {
  margin: '0 0 12px',
  lineHeight: 1.6,
  color: 'var(--text-secondary)',
};

const hintStyle: React.CSSProperties = {
  margin: 0,
  lineHeight: 1.6,
  color: 'var(--text-secondary)',
  whiteSpace: 'pre-wrap',
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserMetadata = async (user: User) => {
    try {
      const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create user metadata document
        await setDoc(userDocRef, {
          email: user.email,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isAdmin: false,
          isActive: true,
        });
      }
    } catch (error) {
      console.error('Error ensuring user metadata:', error);
    }
  };

  const signup = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserMetadata(result.user);
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    // Set persistence based on rememberMe option
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);

    const result = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserMetadata(result.user);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loginWithGoogle = async () => {
    // Note: Google login uses persistent storage by design because:
    // 1. OAuth flow implies user trust and typically personal device usage
    // 2. Provides consistent UX - users expect to stay logged in after OAuth
    // 3. If Remember Me is needed for OAuth, it should be offered before OAuth redirect
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserMetadata(result.user);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentUser || !currentUser.email) {
      throw new Error('No user is currently logged in');
    }

    // Re-authenticate user before password change
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);

    // Update password
    await updatePassword(currentUser, newPassword);
  };

  const changeEmail = async (currentPassword: string, newEmail: string) => {
    if (!currentUser || !currentUser.email) {
      throw new Error('No user is currently logged in');
    }

    // Re-authenticate user before email change
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);

    // Update email in Firebase Auth
    await updateEmail(currentUser, newEmail);

    // Update email in Firestore metadata
    const userDocRef = doc(db, COLLECTIONS.USERS, currentUser.uid);
    await updateDoc(userDocRef, {
      email: newEmail,
      updatedAt: Timestamp.now(),
    });
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await ensureUserMetadata(user);
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (!isFirebaseConfigured) {
    return (
      <div style={setupContainerStyle}>
        <div style={setupPanelStyle}>
          <h1 style={headingStyle}>Firebase 尚未設定</h1>
          <p style={textStyle}>{firebaseSetupMessage}</p>
          <p style={hintStyle}>
            請建立 `web/.env`，把 `web/.env.example` 的值填完整，然後重新執行 `npm run dev`。
          </p>
        </div>
      </div>
    );
  }

  const value: AuthContextType = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    loginWithGoogle,
    changePassword,
    changeEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
          }}
        >
          Loading...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
