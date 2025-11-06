import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  Timestamp 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, auth, functionsClient } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { ENABLE_ADMIN_FUNCTIONS } from '../config/appConfig';
import { COLLECTIONS, USER_DATA_COLLECTIONS } from '../constants/collections';

export interface UserMetadata {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
  isAdmin: boolean;
  isActive: boolean;
}

class AdminService {
  // Check if the current user is an admin
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
      if (userDoc.exists()) {
          const data = userDoc.data();
          // Support both `isAdmin` and legacy `adminStatus` field names
          return data.isAdmin === true || data.adminStatus === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Send password reset email to an existing account
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  // Get all users (admin only)
  async getAllUsers(): Promise<UserMetadata[]> {
    try {
      const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          displayName: data.displayName,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isAdmin: data.isAdmin || false,
          isActive: data.isActive !== false, // default to true
        };
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Create user with Firebase Auth account AND metadata
  async createUser(email: string, password: string, isAdmin: boolean = false): Promise<string> {
    try {
      // Use a secondary, in-memory Auth instance so we don't affect the admin's session
      const secondaryAppName = `admin-secondary-${Date.now()}`;
      const secondaryApp = initializeApp((auth as unknown as { app: { options: object } }).app.options as object, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      await setPersistence(secondaryAuth, inMemoryPersistence);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const userId = userCredential.user.uid;

      // Create Firestore metadata
      await setDoc(doc(db, COLLECTIONS.USERS, userId), {
        email,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        // write both fields to be compatible with older entries
        isAdmin,
        adminStatus: isAdmin,
        isActive: true,
      });

      // Clean up: sign out and delete the secondary app (admin remains logged in on primary app)
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      return userId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Create user metadata document only (legacy method)
  async createUserMetadata(userId: string, email: string, isAdmin: boolean = false): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.USERS, userId), {
        email,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
          // write both fields to be compatible with older entries
          isAdmin,
          adminStatus: isAdmin,
        isActive: true,
      });
    } catch (error) {
      console.error('Error creating user metadata:', error);
      throw error;
    }
  }

  // Update user metadata
  async updateUserMetadata(userId: string, updates: Partial<UserMetadata>): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
      };
      
      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.createdAt;
      
      // Sync adminStatus with isAdmin for compatibility
      if ('isAdmin' in updateData) {
        updateData.adminStatus = updateData.isAdmin;
      }
      
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), updateData);
    } catch (error) {
      console.error('Error updating user metadata:', error);
      throw error;
    }
  }

  // Deactivate user account
  async deactivateUser(userId: string): Promise<void> {
    try {
      await this.updateUserMetadata(userId, { isActive: false });
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  // Activate user account
  async activateUser(userId: string): Promise<void> {
    try {
      await this.updateUserMetadata(userId, { isActive: true });
    } catch (error) {
      console.error('Error activating user:', error);
      throw error;
    }
  }

  // Delete user account (Auth via Cloud Function) and metadata
  async deleteUserMetadata(userId: string): Promise<void> {
    try {
      // Attempt to delete the Firebase Auth user via a secured Cloud Function (only when enabled)
      if (ENABLE_ADMIN_FUNCTIONS) {
        try {
          const deleteFn = httpsCallable(functionsClient, 'adminDeleteUser');
          await deleteFn({ uid: userId });
        } catch (fnErr) {
          // If the function is not deployed or permission denied, proceed with metadata cleanup
          console.warn('Auth user deletion via function failed or unavailable:', fnErr);
        }
      }

      // Also delete all user's data from all user-related collections
      for (const collectionName of USER_DATA_COLLECTIONS) {
        const q = query(collection(db, collectionName), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }
      
      // Finally delete the user metadata
      await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
    } catch (error) {
      console.error('Error deleting user metadata:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<UserMetadata | null> {
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: userDoc.id,
          email: data.email,
          displayName: data.displayName,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
            isAdmin: data.isAdmin || data.adminStatus || false,
          isActive: data.isActive !== false,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
