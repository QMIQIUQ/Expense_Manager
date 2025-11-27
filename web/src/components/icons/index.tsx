/**
 * Unified Icon Library
 * Central source for all icons used in the application
 * Use these components instead of direct emoji or SVG usage
 */

import React from 'react';

export interface IconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

// Emoji-based icons for categories and features
export const CategoryIcons = {
  Food: '🍔',
  Transport: '🚗',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Bills: '📄',
  Healthcare: '🏥',
  Education: '📚',
  Other: '📦',
  Income: '💰',
  Salary: '💵',
  Gift: '🎁',
  Investment: '📈',
  Refund: '↩️',
};

export const PaymentMethodIcons = {
  Cash: '💵',
  CreditCard: '💳',
  EWallet: '📱',
  Bank: '🏦',
  Check: '✅',
};

export const FeatureIcons = {
  Dashboard: '📊',
  Expenses: '💸',
  Incomes: '💰',
  Categories: '📁',
  Budgets: '🎯',
  Recurring: '🔄',
  Cards: '💳',
  Reports: '📈',
  Settings: '⚙️',
  Profile: '👤',
  Admin: '👑',
};

// SVG Icon Component Base
const SvgIcon: React.FC<IconProps & { children: React.ReactNode; viewBox?: string }> = ({
  size = 24,
  className = '',
  style,
  children,
  viewBox = '0 0 24 24',
}) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {children}
  </svg>
);

// Action Icons
export const PlusIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M12 5v14m-7-7h14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const EditIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const DeleteIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const SearchIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </SvgIcon>
);

export const FilterIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const SortIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M3 6h18M7 12h10m-7 6h4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </SvgIcon>
);

export const ChevronUpIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="m18 15-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </SvgIcon>
);

export const ChevronLeftIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </SvgIcon>
);

export const ChevronRightIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </SvgIcon>
);

export const CloseIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M18 6 6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const CheckIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </SvgIcon>
);

export const CircleIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
  </SvgIcon>
);

export const RepaymentIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.5 7.5 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </SvgIcon>
);

export const MenuIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M3 12h18M3 6h18M3 18h18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const MoreVerticalIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="19" r="1.5" fill="currentColor" />
  </SvgIcon>
);

export const DownloadIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const UploadIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const SettingsIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m7.08 7.08 4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m7.08-7.08 4.24-4.24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </SvgIcon>
);

export const EyeIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </SvgIcon>
);

export const EyeOffIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const InfoIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </SvgIcon>
);

export const AlertIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 9v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </SvgIcon>
);

export const CalendarIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </SvgIcon>
);

export const DragIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <circle cx="9" cy="5" r="1" fill="currentColor" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="19" r="1" fill="currentColor" />
    <circle cx="15" cy="5" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="19" r="1" fill="currentColor" />
  </SvgIcon>
);

// Export all icons as a collection
export const Icons = {
  // Emoji Icons
  Category: CategoryIcons,
  PaymentMethod: PaymentMethodIcons,
  Feature: FeatureIcons,
  
  // SVG Icons
  Plus: PlusIcon,
  Edit: EditIcon,
  Delete: DeleteIcon,
  Search: SearchIcon,
  Filter: FilterIcon,
  Sort: SortIcon,
  ChevronDown: ChevronDownIcon,
  ChevronUp: ChevronUpIcon,
  ChevronLeft: ChevronLeftIcon,
  ChevronRight: ChevronRightIcon,
  Close: CloseIcon,
  Check: CheckIcon,
  Circle: CircleIcon,
  Menu: MenuIcon,
  Download: DownloadIcon,
  Upload: UploadIcon,
  Settings: SettingsIcon,
  Eye: EyeIcon,
  EyeOff: EyeOffIcon,
  Info: InfoIcon,
  Alert: AlertIcon,
  Calendar: CalendarIcon,
  Drag: DragIcon,
};

export default Icons;
