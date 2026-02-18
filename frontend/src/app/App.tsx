import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { ProtectedRoute } from '@features/auth/components/ProtectedRoute';
import { LoginPage } from '@features/auth/pages/LoginPage';
import { TwoFactorPage } from '@features/auth/pages/TwoFactorPage';
import { RegisterPage } from '@features/auth/pages/RegisterPage';
import { SecuritySettingsPage } from '@features/auth/pages/SecuritySettingsPage';
import { DashboardPage } from '@features/dashboard/pages/DashboardPage';
import { AccountsPage } from '@features/core/pages/AccountsPage';
import { TransactionsPage } from '@features/core/pages/TransactionsPage';
import { BudgetListPage } from '@features/core/pages/BudgetListPage';
import { BudgetDetailPage } from '@features/core/pages/BudgetDetailPage';

/**
 * AuthInitializer calls GET /auth/me on mount to restore session from
 * the httpOnly refresh cookie (via silent token refresh in the Axios interceptor).
 */
function AuthInitializer() {
  useAuth();
  return null;
}

function App() {
  return (
    <>
      <AuthInitializer />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/two-factor" element={<TwoFactorPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <AccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProtectedRoute>
              <BudgetListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets/:id"
          element={
            <ProtectedRoute>
              <BudgetDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/security"
          element={
            <ProtectedRoute>
              <SecuritySettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
