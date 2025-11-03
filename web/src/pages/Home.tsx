import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '100px auto', padding: '20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>💰 Expense Manager</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '40px', color: '#666' }}>
        Track and manage your expenses with ease
      </p>
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <Link
          to="/login"
          style={{
            padding: '15px 30px',
            backgroundColor: '#4CAF50',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '1.1rem',
          }}
        >
          Login
        </Link>
        <Link
          to="/register"
          style={{
            padding: '15px 30px',
            backgroundColor: '#2196F3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '1.1rem',
          }}
        >
          Register
        </Link>
      </div>
    </div>
  );
};

export default Home;
