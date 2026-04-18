import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useAuthStore } from '@features/auth/stores/authStore';
import { ProtectedRoute } from '@features/auth/components/ProtectedRoute';
import i18n from '@lib/i18n';
import { useTheme } from './ThemeProvider';
import type { ThemeName } from './ThemeProvider';
import { AppLayout } from '@components/layout/AppLayout';
import { PWAInstallBanner } from '@components/common/PWAInstallBanner';
import { LoginPage } from '@features/auth/pages/LoginPage';
import { TwoFactorPage } from '@features/auth/pages/TwoFactorPage';
import { RegisterPage } from '@features/auth/pages/RegisterPage';
import { SecuritySettingsPage } from '@features/auth/pages/SecuritySettingsPage';
import { DashboardPage } from '@features/dashboard/pages/DashboardPage';
import { AccountsPage } from '@features/core/pages/AccountsPage';
import { TransactionsPage } from '@features/core/pages/TransactionsPage';
import { BudgetPage } from '@features/core/pages/BudgetPage';
import { LiabilitiesPage } from '@features/core/pages/LiabilitiesPage';
import { SavingsGoalsPage } from '@features/core/pages/SavingsGoalsPage';
import { ImportsPage } from '@features/integrations/pages/ImportsPage';
import { ReportsPage } from '@features/reports/pages/ReportsPage';
import { RecurringTransactionsPage } from '@features/core/pages/RecurringTransactionsPage';
import { AccountSettingsPage } from '@features/settings/pages/AccountSettingsPage';
import { IntegrationsSettingsPage } from '@features/settings/pages/IntegrationsSettingsPage';
import { HouseholdSetupPage } from '@features/household/pages/HouseholdSetupPage';
import { HouseholdSettingsPage } from '@features/household/pages/HouseholdSettingsPage';

/**
 * AuthInitializer calls GET /auth/me on mount to restore session from
 * the httpOnly refresh cookie (via silent token refresh in the Axios interceptor).
 * It also syncs the i18n language whenever the user's locale preference changes.
 */
function AuthInitializer() {
  useAuth();
  const { setTheme } = useTheme();
  const locale = useAuthStore((s) => s.user?.locale);
  const theme = useAuthStore((s) => s.user?.theme);
  useEffect(() => {
    if (locale) void i18n.changeLanguage(locale);
  }, [locale]);
  useEffect(() => {
    if (theme) setTheme(theme as ThemeName);
  }, [theme, setTheme]);
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

        {/* Household setup — auth required but no household yet */}
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <HouseholdSetupPage />
            </ProtectedRoute>
          }
        />

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
          <Route path="/accounts/:accountId/debt" element={<LiabilitiesPage />} />
          <Route path="/liabilities" element={<LiabilitiesPage />} />
          <Route path="/savings-goals" element={<SavingsGoalsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/recurring-transactions" element={<RecurringTransactionsPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/settings/account" element={<AccountSettingsPage />} />
          <Route path="/settings/integrations" element={<IntegrationsSettingsPage />} />
          <Route path="/settings/security" element={<SecuritySettingsPage />} />
          <Route path="/settings/household" element={<HouseholdSettingsPage />} />
          {/* Legacy route redirects */}
          <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
          <Route path="/settings/preferences" element={<Navigate to="/settings/account" replace />} />
          <Route path="/settings/integrations/simplefin" element={<Navigate to="/settings/integrations" replace />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
