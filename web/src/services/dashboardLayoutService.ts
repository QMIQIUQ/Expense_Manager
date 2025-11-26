// Dashboard Layout Service - Manages user's dashboard widget configuration
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DashboardLayout, DashboardWidget, DEFAULT_DASHBOARD_LAYOUT } from '../types/dashboard';

const COLLECTION_NAME = 'dashboardLayouts';

// Convert Firestore Timestamps to Date objects
const convertTimestamps = (data: Record<string, unknown>): DashboardLayout => {
  return {
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as string),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt as string),
  } as DashboardLayout;
};

export const dashboardLayoutService = {
  // Get user's dashboard layout
  async get(userId: string): Promise<DashboardLayout | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return convertTimestamps({ id: docSnap.id, ...docSnap.data() });
      }
      
      return null;
    } catch (error) {
      console.error('Error getting dashboard layout:', error);
      throw error;
    }
  },

  // Get or create default layout
  async getOrCreate(userId: string): Promise<DashboardLayout> {
    try {
      const existing = await this.get(userId);
      
      if (existing) {
        return existing;
      }
      
      // Create default layout
      const defaultLayout: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        widgets: DEFAULT_DASHBOARD_LAYOUT,
        columns: 1,
      };
      
      const docRef = doc(db, COLLECTION_NAME, userId);
      await setDoc(docRef, {
        ...defaultLayout,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      const created = await getDoc(docRef);
      return convertTimestamps({ id: created.id, ...created.data() });
    } catch (error) {
      console.error('Error getting or creating dashboard layout:', error);
      throw error;
    }
  },

  // Update entire layout
  async update(userId: string, layout: Partial<DashboardLayout>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      await updateDoc(docRef, {
        ...layout,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating dashboard layout:', error);
      throw error;
    }
  },

  // Update widgets only
  async updateWidgets(userId: string, widgets: DashboardWidget[]): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      await updateDoc(docRef, {
        widgets,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating widgets:', error);
      throw error;
    }
  },

  // Toggle widget visibility
  async toggleWidget(userId: string, widgetId: string, enabled: boolean): Promise<void> {
    try {
      const layout = await this.get(userId);
      if (!layout) return;
      
      const updatedWidgets = layout.widgets.map(w => 
        w.id === widgetId ? { ...w, enabled } : w
      );
      
      await this.updateWidgets(userId, updatedWidgets);
    } catch (error) {
      console.error('Error toggling widget:', error);
      throw error;
    }
  },

  // Reorder widgets
  async reorderWidgets(userId: string, orderedWidgetIds: string[]): Promise<void> {
    try {
      const layout = await this.get(userId);
      if (!layout) return;
      
      const widgetMap = new Map(layout.widgets.map(w => [w.id, w]));
      const updatedWidgets = orderedWidgetIds.map((id, index) => {
        const widget = widgetMap.get(id);
        if (!widget) throw new Error(`Widget not found: ${id}`);
        return { ...widget, order: index };
      });
      
      await this.updateWidgets(userId, updatedWidgets);
    } catch (error) {
      console.error('Error reordering widgets:', error);
      throw error;
    }
  },

  // Reset to default layout
  async resetToDefault(userId: string): Promise<void> {
    try {
      await this.update(userId, {
        widgets: DEFAULT_DASHBOARD_LAYOUT,
        columns: 1,
      });
    } catch (error) {
      console.error('Error resetting to default:', error);
      throw error;
    }
  },

  // Update column layout
  async updateColumns(userId: string, columns: 1 | 2): Promise<void> {
    try {
      await this.update(userId, { columns });
    } catch (error) {
      console.error('Error updating columns:', error);
      throw error;
    }
  },
};
