import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import LandingPage from './components/Landing/LandingPage';
import AdminDashboard from './components/Admin/AdminDashboard';
import Dashboard from './components/Dashboard/Dashboard';
import InsertionForm from './components/Dashboard/InsertionForm';
import IndicadoresEstudoPage from './components/IndicadoresEstudo/IndicadoresEstudoPage';
import { api } from './services/api';
import { supabase } from './services/supabase';
import type { User } from './types';
import { rotaInicialPorModulo, temPermissao, type AcaoAcesso } from './utils/permissoesAcesso';

const AuthLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
    Carregando autenticacao...
  </div>
);

const ProtectedRoute: React.FC<{ authReady: boolean; user: User | null; required: AcaoAcesso; children: React.ReactNode }> = ({ authReady, user, required, children }) => {
  if (!authReady) {
    return <AuthLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!temPermissao(user, required)) {
    return <Navigate to={rotaInicialPorModulo(user)} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const user = await api.restaurarSessaoUsuario();
        if (!isMounted) return;
        setAuthenticated(!!user);
        setCurrentUser(user);
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
          if (isMounted) {
            setAuthenticated(!!user);
            setCurrentUser(user);
          }
        } else if (isMounted) {
          setAuthenticated(false);
          setCurrentUser(null);
        }
      })();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);


  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={authReady && authenticated ? <Navigate to={rotaInicialPorModulo(currentUser)} replace /> : <Login />} />
        <Route path="/admin" element={<ProtectedRoute authReady={authReady} user={currentUser} required="administracao"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute authReady={authReady} user={currentUser} required="analitico"><Dashboard /></ProtectedRoute>} />
        <Route path="/indicadores-estudo" element={<ProtectedRoute authReady={authReady} user={currentUser} required="analitico"><IndicadoresEstudoPage /></ProtectedRoute>} />
        <Route path="/insertion" element={<ProtectedRoute authReady={authReady} user={currentUser} required="insercao"><InsertionForm /></ProtectedRoute>} />
        {/* Fallback to public home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
