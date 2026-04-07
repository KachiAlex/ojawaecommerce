import React from 'react';
import { Link } from 'react-router-dom';

const TestLink = () => {
  return (
    <div>
      <h1>Test Link Component</h1>
      <Link to="/register">Go to Register</Link>
      <Link to="/login">Go to Login</Link>
    </div>
  );
};

export default TestLink;
