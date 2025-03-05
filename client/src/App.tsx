import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import SchedulePage from "@/pages/schedule-page";
import Attendees from "@/pages/Attendees";
import FileUploadPage from "@/pages/file-upload";
import ProfilePage from "@/pages/profile-page";
import ManageAbsencesPage from "@/pages/manage-absences";
import TeacherDetailsPage from "@/pages/teacher-details";
import SecondaryNavPage from "@/pages/secondary-nav";
import SMSHistoryPage from "@/pages/sms-history";
import SettingsPage from "@/pages/settings";
import PeriodsPage from "@/pages/periods";
import { ProtectedRoute } from "./lib/protected-route";
import BottomNav from "./components/bottom-nav";
import NotificationsPage from "@/pages/notifications";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/schedule" component={SchedulePage} />
      <ProtectedRoute path="/attendees" component={Attendees} />
      <ProtectedRoute path="/upload" component={FileUploadPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/manage-absences" component={ManageAbsencesPage} />
      <ProtectedRoute path="/teacher-details/:name" component={TeacherDetailsPage} />
      <ProtectedRoute path="/more" component={SecondaryNavPage} />
      <ProtectedRoute path="/sms-history" component={SMSHistoryPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/periods" component={PeriodsPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen pb-16">
          <Router />
          <BottomNav />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
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
