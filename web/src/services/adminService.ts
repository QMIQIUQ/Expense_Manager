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
import { db } from '../config/firebase';

export interface UserMetadata {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
  isAdmin: boolean;
  isActive: boolean;
}

const USERS_COLLECTION = 'users';

class AdminService {
  // Check if the current user is an admin
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
      if (userDoc.exists()) {
        return userDoc.data().isAdmin === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Get all users (admin only)
  async getAllUsers(): Promise<UserMetadata[]> {
    try {
      const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
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

  // Create user metadata document
  async createUserMetadata(userId: string, email: string, isAdmin: boolean = false): Promise<void> {
    try {
      await setDoc(doc(db, USERS_COLLECTION, userId), {
        email,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isAdmin,
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
      
      await updateDoc(doc(db, USERS_COLLECTION, userId), updateData);
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

  // Delete user metadata (Note: Firebase Auth user deletion requires special permissions)
  async deleteUserMetadata(userId: string): Promise<void> {
    try {
      // Also delete all user's data
      const collections = ['expenses', 'categories', 'budgets', 'recurringExpenses'];
      
      for (const collectionName of collections) {
        const q = query(collection(db, collectionName), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }
      
      // Finally delete the user metadata
      await deleteDoc(doc(db, USERS_COLLECTION, userId));
    } catch (error) {
      console.error('Error deleting user metadata:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<UserMetadata | null> {
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: userDoc.id,
          email: data.email,
          displayName: data.displayName,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isAdmin: data.isAdmin || false,
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
