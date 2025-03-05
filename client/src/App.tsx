import React from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/use-auth';
import { Toaster } from './components/ui/toaster';
import HomePage from './pages/home-page';
import LoginPage from './pages/login-page';
import ManageAbsencesPage from './pages/manage-absences';
import ProtectedRoute from './lib/protected-route';
import Attendees from './pages/Attendees';
import AssignSubstitutePage from './pages/assign-substitute';
import ReportsPage from './pages/reports-page';
import SettingsPage from './pages/settings-page';
import TeachersPage from './pages/teachers-page';
import UploadPage from './pages/upload-page';
import SubstitutesPage from './pages/substitutes-page';
import AssignedSubstitutePage from './pages/assigned-substitute-page';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/manage-absences">
              <ProtectedRoute>
                <ManageAbsencesPage />
              </ProtectedRoute>
            </Route>
            <Route path="/assigned-substitute">
              <ProtectedRoute>
                <AssignedSubstitutePage />
              </ProtectedRoute>
            </Route>
            <Route path="/assign-substitute/:classId">
              <ProtectedRoute>
                <AssignSubstitutePage />
              </ProtectedRoute>
            </Route>
            <Route path="/reports">
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            </Route>
            <Route path="/settings">
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            </Route>
            <Route path="/teachers">
              <ProtectedRoute>
                <TeachersPage />
              </ProtectedRoute>
            </Route>
            <Route path="/upload">
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            </Route>
            <Route path="/substitutes">
              <ProtectedRoute>
                <SubstitutesPage />
              </ProtectedRoute>
            </Route>
            <Route path="/attendees">
              <ProtectedRoute>
                <Attendees />
              </ProtectedRoute>
            </Route>
          </Switch>
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}