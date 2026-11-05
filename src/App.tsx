import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import { Spinner } from './components/ui';
import type { UserRole } from './lib/types';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyLeavesPage } from './pages/MyLeavesPage';
import { ApplyLeavePage } from './pages/ApplyLeavePage';
import { LeaveDetailPage } from './pages/LeaveDetailPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { RecordsPage } from './pages/RecordsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import type { ReactNode } from 'react';

function Guard({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Signing you in…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <Spinner /> : user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={loading ? <Spinner /> : user ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />

      <Route
        path="/dashboard"
        element={
          <Guard>
            <Layout>
              <DashboardPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/leaves"
        element={
          <Guard roles={['student', 'staff', 'hod', 'principal']}>
            <Layout>
              <MyLeavesPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/leaves/new"
        element={
          <Guard roles={['student', 'staff', 'hod', 'principal']}>
            <Layout>
              <ApplyLeavePage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/leaves/:id"
        element={
          <Guard>
            <Layout>
              <LeaveDetailPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/approvals"
        element={
          <Guard roles={['staff', 'hod', 'principal']}>
            <Layout>
              <ApprovalsPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/records"
        element={
          <Guard roles={['management']}>
            <Layout>
              <RecordsPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/notifications"
        element={
          <Guard>
            <Layout>
              <NotificationsPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/profile"
        element={
          <Guard>
            <Layout>
              <ProfilePage />
            </Layout>
          </Guard>
        }
      />

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
