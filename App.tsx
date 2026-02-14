import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import StudentCheckIn from './components/StudentCheckIn';
import { user } from './services/gunService';

// Determine the view based on Hash Routing (for GitHub Pages support)
const getHashPath = () => {
  const hash = window.location.hash;
  if (hash.startsWith('#/checkin')) return 'checkin';
  return 'admin';
};

const App: React.FC = () => {
  const [view, setView] = useState<'admin' | 'checkin'>('admin');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    // 1. Check Routing
    const currentPath = getHashPath();
    setView(currentPath);

    // 2. Check Persisted Login (Gun recalls session automatically in localStorage)
    if (user) {
      // Gun.recall attempts to restore session from sessionStorage
      user.recall({ sessionStorage: true }, (ack: any) => {
        if (user.is) {
          setIsAuthenticated(true);
        }
        setIsAuthChecking(false);
      });

      // Fallback: If recall doesn't fire callback quickly (e.g. no session), stop loading
      const timer = setTimeout(() => {
        setIsAuthChecking((prev) => {
          if (prev) return false;
          return prev;
        });
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      console.error("Gun.js not initialized");
      setIsAuthChecking(false);
    }

    // Handle hash change for navigation
    const handleHashChange = () => {
      setView(getHashPath());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (view === 'checkin') {
    return <StudentCheckIn />;
  }

  // Admin Views
  if (isAuthChecking) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-4 bg-indigo-600 rounded-full mb-2"></div>
          <span>Initializing Secure Mesh...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <AdminDashboard />;
  }

  return <Login onLogin={() => setIsAuthenticated(true)} />;
};

export default App;