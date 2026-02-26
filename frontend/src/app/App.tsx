import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useAuthStore } from '@features/auth/stores/authStore';
import { ProtectedRoute } from '@features/auth/components/ProtectedRoute';
import i18n from '@lib/i18n';
import { AppLayout } from '@components/layout/AppLayout';
import { PWAInstallBanner } from '@components/common/PWAInstallBanner';
import { LoginPage } from '@features/auth/pages/LoginPage';
import { TwoFactorPage } from '@features/auth/pages/TwoFactorPage';
import { RegisterPage } from '@features/auth/pages/RegisterPage';
import { SecuritySettingsPage } from '@features/auth/pages/SecuritySettingsPage';
import { PreferencesPage } from '@features/auth/pages/PreferencesPage';
import { DashboardPage } from '@features/dashboard/pages/DashboardPage';
import { AccountsPage } from '@features/core/pages/AccountsPage';
import { TransactionsPage } from '@features/core/pages/TransactionsPage';
import { BudgetPage } from '@features/core/pages/BudgetPage';
import { DebtDetailPage } from '@features/core/pages/DebtDetailPage';
import { LiabilitiesPage } from '@features/core/pages/LiabilitiesPage';
import { SavingsGoalsPage } from '@features/core/pages/SavingsGoalsPage';
import { SimplefinSettingsPage } from '@features/integrations/pages/SimplefinSettingsPage';
import { ImportsPage } from '@features/integrations/pages/ImportsPage';
import { ReportsPage } from '@features/reports/pages/ReportsPage';
import { RecurringTransactionsPage } from '@features/core/pages/RecurringTransactionsPage';

/**
 * AuthInitializer calls GET /auth/me on mount to restore session from
 * the httpOnly refresh cookie (via silent token refresh in the Axios interceptor).
 * It also syncs the i18n language whenever the user's locale preference changes.
 */
function AuthInitializer() {
  useAuth();
  const locale = useAuthStore((s) => s.user?.locale);
  useEffect(() => {
    if (locale) void i18n.changeLanguage(locale);
  }, [locale]);
  return null;
}

function App() {
  return (
    <>
      <AuthInitializer />
      <PWAInstallBanner />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/two-factor" element={<TwoFactorPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected layout route — all children share AppLayout sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/budgets" element={<BudgetPage />} />
          <Route path="/accounts/:accountId/debt" element={<DebtDetailPage />} />
          <Route path="/liabilities" element={<LiabilitiesPage />} />
          <Route path="/savings-goals" element={<SavingsGoalsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/recurring-transactions" element={<RecurringTransactionsPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/settings/integrations/simplefin" element={<SimplefinSettingsPage />} />
          <Route path="/settings/security" element={<SecuritySettingsPage />} />
          <Route path="/settings/preferences" element={<PreferencesPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
