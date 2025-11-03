# Expense Manager Web App

A modern React application built with Vite, TypeScript, and Firebase Authentication.

## Features

- ⚡️ Vite for fast development and building
- ⚛️ React 18 with TypeScript
- 🔐 Firebase Authentication (Email/Password + Google Sign-in)
- 🔒 Protected routes with authentication
- 🎨 Clean and responsive UI

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Firebase project (for authentication)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Firebase:
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Authentication (Email/Password and Google providers)
   - Copy your Firebase configuration

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration values

   ```bash
   cp .env.example .env
   ```

### Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Building

Build the app for production:

```bash
npm run build
```

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
```

## Project Structure

```
web/
├── src/
│   ├── components/      # Reusable components
│   │   └── PrivateRoute.tsx
│   ├── contexts/        # React contexts
│   │   └── AuthContext.tsx
│   ├── config/          # Configuration files
│   │   └── firebase.ts
│   ├── pages/           # Page components
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── Dashboard.tsx
│   ├── App.tsx          # Main app component with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Authentication

The app includes a complete authentication system with:

- **Email/Password Registration**: Create new accounts with email and password
- **Email/Password Login**: Sign in with existing credentials
- **Google Sign-in**: Quick authentication with Google accounts
- **Protected Routes**: Dashboard requires authentication
- **Auth Context**: Centralized authentication state management

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies

- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Firebase** - Authentication backend
- **ESLint** - Code linting

## Next Steps

- Integrate expense tracking functionality
- Add expense CRUD operations
- Implement data persistence with Firebase Firestore
- Add data visualization and charts
- Improve UI/UX with a component library
