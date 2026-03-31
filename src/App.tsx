import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard/Dashboard';
import InsertionForm from './components/Dashboard/InsertionForm';
import { api } from './services/api';
import { supabase } from './services/supabase';

const ProtectedRoute: React.FC<{ authenticated: boolean; children: React.ReactNode }> = ({ authenticated, children }) => {
  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const user = await api.restaurarSessaoUsuario();
        if (!isMounted) return;
        setAuthenticated(!!user);
      } finally {
        if (isMounted) setAuthReady(true);
      }
    };

    void bootstrapAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!isMounted) return;

        if (session?.user) {
          const user = await api.restaurarSessaoUsuario();
          if (isMounted) setAuthenticated(!!user);
        } else if (isMounted) {
          setAuthenticated(false);
        }
      })();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Carregando autenticação...
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={authenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={<ProtectedRoute authenticated={authenticated}><Dashboard /></ProtectedRoute>} />
        <Route path="/insertion" element={<ProtectedRoute authenticated={authenticated}><InsertionForm /></ProtectedRoute>} />
        {/* Fallback to Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
