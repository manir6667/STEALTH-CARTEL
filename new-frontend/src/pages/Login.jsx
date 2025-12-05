import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('strongpassword');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        await authAPI.register(email, password);
        setIsRegistering(false);
        setError('Registration successful! Please log in.');
      } else {
        const response = await authAPI.login(email, password);
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('role', response.data.role);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gray-900 relative"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1498084393753-b411b2d26b34?q=80&w=2232&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-75"></div>
      
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-900 bg-opacity-95 rounded-lg shadow-2xl border border-gray-700 relative z-10 backdrop-blur-sm">
        <div>
          <div className="flex justify-center mb-4">
            <div className="bg-red-600 p-3 rounded-full">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M13,17h-2v-2h2V17z M13,13h-2V7h2V13z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-white tracking-wide">
            🛡️ AIRCRAFT DETECTION SYSTEM
          </h2>
          <p className="mt-3 text-center text-sm text-red-400 font-semibold uppercase tracking-wider">
            {isRegistering ? '⚡ Security Clearance Registration' : '🔐 Restricted Access - Authorized Personnel Only'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-center text-red-400">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border-2 border-red-600 text-sm font-bold rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 uppercase tracking-wider transition-all duration-200 shadow-lg hover:shadow-red-500/50"
            >
              <span className="mr-2">🔓</span>
              {isRegistering ? 'Request Access' : 'Enter System'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {isRegistering
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register"}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded border-l-4 border-green-500">
          <p className="text-xs text-green-400 font-bold mb-2 uppercase tracking-wide">✓ Default Admin Credentials:</p>
          <p className="text-xs text-gray-300 font-mono">Email: admin@example.com</p>
          <p className="text-xs text-gray-300 font-mono">Password: strongpassword</p>
          <p className="text-xs text-blue-400 mt-2 italic">🔒 Access Level: ADMIN</p>
        </div>
      </div>
    </div>
  );
}
