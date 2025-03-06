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
import AssignedSubstitutesPage from "@/pages/assigned-substitutes";
import { ProtectedRoute } from "./lib/protected-route";
import BottomNav from "./components/bottom-nav";
import NotificationsPage from "@/pages/notifications";
import ExperimentScreen from "@/pages/experiment-screen";

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
      <ProtectedRoute path="/assigned-substitutes" component={AssignedSubstitutesPage} />
      <ProtectedRoute path="/experiments" component={ExperimentScreen} />
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