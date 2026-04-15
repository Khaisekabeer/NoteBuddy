import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import InaugurationCeremony from './components/InaugurationCeremony';
import AuthScreen from './components/AuthScreen';
import Dashboard from './pages/Dashboard';

function AppContent() {
  const { currentUser, isLoadingAuth } = useAuth();
  
  const [isInaugurated, setIsInaugurated] = useState(() => {
    return localStorage.getItem('inaugurated') === 'true';
  });

  if (isLoadingAuth) {
    return <div className="min-h-screen bg-background flex items-center justify-center font-bold text-primary">Loading...</div>;
  }

  if (!isInaugurated) {
    return (
      <InaugurationCeremony onComplete={() => {
        localStorage.setItem('inaugurated', 'true');
        setIsInaugurated(true);
      }} />
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
