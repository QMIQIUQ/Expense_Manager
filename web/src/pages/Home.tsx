import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: 'var(--ui-space-100px) auto', padding: 'var(--ui-space-20px)', textAlign: 'center' }}>
      <h1 style={{ fontSize: 'var(--ui-font-3rem)', marginBottom: 'var(--ui-space-20px)' }}>💰 Expense Manager</h1>
      <p style={{ fontSize: 'var(--ui-font-1-2rem)', marginBottom: 'var(--ui-space-40px)', color: 'var(--text-secondary)' }}>
        Track and manage your expenses with ease
      </p>
      <div style={{ display: 'flex', gap: 'var(--ui-space-20px)', justifyContent: 'center' }}>
        <Link
          to="/login"
          style={{
            padding: 'var(--ui-space-15px) var(--ui-space-30px)',
            backgroundColor: 'var(--success-text)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 'var(--ui-radius-4px)',
            fontSize: 'var(--ui-font-1-1rem)',
          }}
        >
          Login
        </Link>
        <Link
          to="/register"
          style={{
            padding: 'var(--ui-space-15px) var(--ui-space-30px)',
            backgroundColor: 'var(--info-text)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 'var(--ui-radius-4px)',
            fontSize: 'var(--ui-font-1-1rem)',
          }}
        >
          Register
        </Link>
      </div>
    </div>
  );
};

export default Home;
