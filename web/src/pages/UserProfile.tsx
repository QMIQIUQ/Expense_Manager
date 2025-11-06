import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">User Profile</h2>
      
      {/* User Info Section */}
      <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600 w-full sm:w-32 mb-1 sm:mb-0">Email:</span>
          <span className="text-base text-gray-900 break-all">{currentUser?.email}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center py-3">
          <span className="text-sm font-medium text-gray-600 w-full sm:w-32 mb-1 sm:mb-0">User ID:</span>
          <span className="text-sm text-gray-900 font-mono break-all">{currentUser?.uid}</span>
        </div>
      </div>

      {/* Account Settings Section */}
      <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Account Settings</h3>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            如需更改密碼或 Email，請聯繫系統管理員協助處理。
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
