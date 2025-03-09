import { Teacher, Schedule } from '@shared/schema';
import { storage } from './storage';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Development mode configuration
const TEST_PHONE_NUMBER = "+923124406273";
const SMS_HISTORY_FILE = path.join(__dirname, '../data/sms_history.json');

interface SMSMessage {
  recipient: string;  // Phone number
  message: string;
}

interface SMSHistoryEntry {
  id: string;
  teacherId: string;
  teacherName: string;
  message: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
  method: 'api' | 'mobile' | 'whatsapp';
}

// Initialize SMS history file if it doesn't exist
export function initializeSMSHistory() {
  if (!fs.existsSync(SMS_HISTORY_FILE)) {
    fs.writeFileSync(SMS_HISTORY_FILE, JSON.stringify([], null, 2));
  }
}

// Load SMS history
export function loadSMSHistory(): SMSHistoryEntry[] {
  try {
    initializeSMSHistory();
    const data = fs.readFileSync(SMS_HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading SMS history:', error);
    return [];
  }
}

// Save SMS history
export function saveSMSHistory(history: SMSHistoryEntry[]) {
  try {
    fs.writeFileSync(SMS_HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Error saving SMS history:', error);
  }
}

// Add new SMS entry to history
export function addSMSToHistory(entry: Omit<SMSHistoryEntry, 'id' | 'sentAt'>) {
  const history = loadSMSHistory();
  const newEntry: SMSHistoryEntry = {
    ...entry,
    id: Math.random().toString(36).substr(2, 9),
    sentAt: new Date().toISOString()
  };
  history.push(newEntry);
  saveSMSHistory(history);
  return newEntry;
}

/**
 * Sends an SMS message (development mode)
 */
export async function sendSMS(phoneNumber: string, message: string, method: 'api' | 'mobile' | 'whatsapp' = 'api'): Promise<boolean> {
  // Check if phone number is valid format (Pakistan numbers start with +92)
  if (!phoneNumber || (!phoneNumber.startsWith('+92') && !phoneNumber.startsWith('92'))) {
    console.error(`Invalid Pakistan phone number format: ${phoneNumber}`);
    return false;
  }

  try {
    // In development mode, just log the message
    console.log('\n=== SMS Message Log ===');
    console.log(`To: ${phoneNumber}`);
    console.log(`Method: ${method}`);
    console.log('Message:');
    console.log(message);
    console.log('=====================\n');

    // For testing, we'll consider the message as "sent" if it was logged
    return true;
  } catch (error) {
    console.error('Failed to log SMS:', error);
    return false;
  }
}

export async function sendSubstituteNotification(
  substitute: Teacher,
  assignments: {day: string; period: number; className: string; originalTeacher: string}[]
) {
  // In development, use the test phone number
  const phoneNumber = TEST_PHONE_NUMBER;

  const message = `
Dear ${substitute.name},

You have been assigned to cover the following classes:

${assignments.map(a => `
Date: ${a.day}
Period: ${a.period}
Class: ${a.className}
Covering for: ${a.originalTeacher}
`).join('\n')}

Please confirm your availability.
`;

  // Add to SMS history before sending
  const historyEntry = addSMSToHistory({
    teacherId: substitute.id.toString(),
    teacherName: substitute.name,
    message: message,
    status: 'pending',
    method: 'api'
  });

  const smsSent = await sendSMS(phoneNumber, message);

  // Update SMS status
  const history = loadSMSHistory();
  const updatedHistory = history.map(entry => 
    entry.id === historyEntry.id 
      ? { ...entry, status: smsSent ? 'sent' : 'failed' }
      : entry
  );
  saveSMSHistory(updatedHistory);

  console.log(`SMS logged for ${substitute.name}: ${smsSent ? 'Success' : 'Failed'}`);
  return message;
}

// Function to get SMS history
export function getSMSHistory(): SMSHistoryEntry[] {
  return loadSMSHistory();
}

/**
 * Client-side SMS handler that can be used from the mobile app
 */
export function setupClientSideSMS() {
  // This function would be called from the client (mobile app)
  // It provides an interface that can be used via a WebView

  // Expose a global function that the WebView can call
  (window as any).sendSMSFromDevice = async (phoneNumber: string, message: string) => {
    if (!(window as any).ReactNativeWebView) {
      console.error('ReactNativeWebView not available - not running in WebView?');
      return false;
    }

    try {
      // Check if running in React Native WebView
      if (typeof (window as any).ReactNativeWebView !== 'undefined') {
        // Send a message to the React Native host
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'SEND_SMS',
            payload: {
              phoneNumber,
              message
            }
          })
        );
        return true;
      } else {
        // Fallback for web - could be a web SMS service or just logging
        console.log(`Would send SMS to ${phoneNumber}: ${message}`);
        return true;
      }
    } catch (error) {
      console.error('Failed to send SMS', error);
      return false;
    }
  };
}