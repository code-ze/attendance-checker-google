import React, { useState } from 'react';
import { user } from '../services/gunService';
import { ShieldCheck, UserPlus, LogIn, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isRegistering) {
      user.create(username, password, (ack: any) => {
        setLoading(false);
        if (ack.err) {
          setMessage(`Error: ${ack.err}`);
        } else {
          setMessage('Account created! Logging in...');
          login();
        }
      });
    } else {
      login();
    }
  };

  const login = () => {
    user.auth(username, password, (ack: any) => {
      setLoading(false);
      if (ack.err) {
        setMessage(`Error: ${ack.err}`);
      } else {
        onLogin();
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 p-3 rounded-full">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {isRegistering ? 'Create Admin Account' : 'Admin Login'}
        </h2>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Decentralized Attendance System
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username (Alias)</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {message && (
             <div className={`text-sm p-2 rounded ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
               {message}
             </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isRegistering ? <UserPlus className="w-5 h-5"/> : <LogIn className="w-5 h-5"/>)}
            {isRegistering ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setMessage('');
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>
      </div>
      <p className="mt-8 text-xs text-gray-400">
        Data is stored securely on the decentralized GUN network.
      </p>
    </div>
  );
};

export default Login;
