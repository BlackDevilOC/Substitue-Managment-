import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import ManageAbsencesPage from './pages/manage-absences';
import SmsHistoryPage from './pages/sms-history'; // Added import for SMS history page

function App() {
  return (
    <Router>
      <div>
        <Route path="/" component={ManageAbsencesPage} />
        <Route path="/sms-history" component={SmsHistoryPage} />
        <Route path="/sms-history" component={SmsHistoryPage} /> {/* Added route for SMS history */}
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

export default App;

// Placeholder for manage-absences.js (needed for compilation)
const ManageAbsencesPage = () => <div>Manage Absences Placeholder</div>;
export default ManageAbsencesPage;