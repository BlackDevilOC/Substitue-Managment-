import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'; //Added Switch
// Import your pages
import LoginPage from './pages/login-page';
import IndexPage from './pages/index-page';
// import AbsencePage from './pages/absence-page'; // Hiding old absence page
import AttendancePage from './pages/attendance-page'; // New attendance page
import SubstitutesPage from './pages/substitutes-page';
import SchedulePage from './pages/schedule-page';
import PeriodConfigPage from './pages/period-config-page';
import TimeTableUploadPage from './pages/timetable-upload-page';
import DashboardPage from './pages/dashboard-page';
import SmsHistoryPage from './pages/sms-history'; // Added import for SMS history page


// Placeholder for ProtectedRoute (assuming this component exists elsewhere)
const ProtectedRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={props => (
    // Check if user is authenticated (replace with your authentication logic)
    true ? (
      <Component {...props} />
    ) : (
      <Redirect to="/login" />
    )
  )} />
);


function App() {
  return (
    <Router>
      <div>
        <Switch>
            <Route path="/" component={IndexPage} />
            <Route path="/login" component={LoginPage} />
            <ProtectedRoute path="/dashboard" component={DashboardPage} />
            <ProtectedRoute path="/schedule" component={SchedulePage} />
            <ProtectedRoute path="/absences" component={AttendancePage} />
            <ProtectedRoute path="/substitutes" component={SubstitutesPage} />
            <ProtectedRoute path="/periods" component={PeriodConfigPage} />
            <ProtectedRoute path="/upload" component={TimeTableUploadPage} />
            <Route path="/sms-history" component={SmsHistoryPage} /> {/* Added route for SMS history */}
            <Route>Page not found</Route>
          </Switch>
      </div>
    </Router>
  );
}

// Placeholder for SmsHistoryPage
const SmsHistoryPage = () => {
  const smsMessages = [
    { from: '1234567890', message: 'Hello from 1234567890' },
    { from: '9876543210', message: 'Hello from 9876543210' },
  ];

  return (
    <div>
      <h1>SMS History</h1>
      <table>
        <thead>
          <tr>
            <th>From</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {smsMessages.map((msg, index) => (
            <tr key={index}>
              <td>{msg.from}</td>
              <td>{msg.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


// Placeholder for AttendancePage
const AttendancePage = () => <div>Attendance Page</div>;

// Placeholder for manage-absences.js (needed for compilation)
const ManageAbsencesPage = () => <div>Manage Absences Placeholder</div>;


export default App;