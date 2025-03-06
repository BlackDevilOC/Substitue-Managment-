
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
// Added import for the new page
import SMSSendPage from "@/pages/sms-send";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <div className="flex-1">
            <Switch>
              <Route path="/auth" component={AuthPage} />
              <Route path="/" component={HomePage} />
              <Route path="/schedule" component={SchedulePage} />
              <Route path="/attendees" component={Attendees} />
              <Route path="/file-upload" component={FileUploadPage} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/manage-absences" component={ManageAbsencesPage} />
              <Route path="/teacher/:id" component={TeacherDetailsPage} />
              <Route path="/secondary-nav" component={SecondaryNavPage} />
              <Route path="/sms-history" component={SMSHistoryPage} />
              <Route path="/sms-send" component={SMSSendPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/periods" component={PeriodsPage} />
              <Route path="/assigned-substitutes" component={AssignedSubstitutesPage} />
              <Route path="/notifications" component={NotificationsPage} />
              <Route path="/experiment" component={ExperimentScreen} />
              <Route component={NotFound} />
            </Switch>
          </div>
          <BottomNav />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
