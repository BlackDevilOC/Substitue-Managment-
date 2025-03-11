import { Teacher, Schedule } from '@shared/schema';
import { storage } from './storage';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Development mode configuration
const TEST_PHONE_NUMBER = "+923133469238";
const SMS_HISTORY_FILE = path.join(__dirname, '../data/sms_history.json');
const API_CONFIG_FILE = path.join(__dirname, '../data/api_config.json');

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
  phone: string;
}

interface ApiConfig {
  id: string;
  name: string;
  key: string;
  deviceId: string; // Added deviceId field
  type: 'sms' | 'whatsapp';
  isActive: boolean;
}

// Initialize SMS history file if it doesn't exist
export function initializeSMSHistory() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize empty SMS history file
    fs.writeFileSync(SMS_HISTORY_FILE, JSON.stringify([], null, 2));
    console.log('SMS history file initialized successfully');
  } catch (error) {
    console.error('Error initializing SMS history file:', error);
  }
}

// Load SMS history
export function loadSMSHistory(): SMSHistoryEntry[] {
  try {
    if (!fs.existsSync(SMS_HISTORY_FILE)) {
      initializeSMSHistory();
    }
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

// Load API configurations
export function loadApiConfigs(): ApiConfig[] {
  try {
    if (!fs.existsSync(API_CONFIG_FILE)) {
      return [];
    }
    const data = fs.readFileSync(API_CONFIG_FILE, 'utf-8');
    const configs = JSON.parse(data);
    console.log('Loaded API configs:', configs);
    return configs;
  } catch (error) {
    console.error('Error loading API configs:', error);
    return [];
  }
}

// Get active API for a specific type
function getActiveApi(type: 'sms' | 'whatsapp'): ApiConfig | null {
  const configs = loadApiConfigs();
  const activeApi = configs.find(config => config.type === type && config.isActive);
  console.log(`Active ${type} API:`, activeApi);
  return activeApi || null;
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
 * Sends SMS using TextBee API
 */
async function sendSMSViaAPI(phoneNumber: string, message: string, apiConfig: ApiConfig): Promise<boolean> {
  try {
    console.log('Attempting to send SMS via TextBee API:', {
      phoneNumber,
      messageLength: message.length,
      apiName: apiConfig.name,
      deviceId: apiConfig.deviceId // Log device ID being used
    });

    // Format phone number: remove '+' and ensure it starts with '92'
    let formattedPhone = phoneNumber.replace('+', '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '92' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('92')) {
      formattedPhone = '92' + formattedPhone;
    }

    console.log('Formatted phone number:', formattedPhone);

    const endpoint = `https://api.textbee.dev/api/v1/gateway/devices/${apiConfig.deviceId}/send-sms`;
    console.log('Using API endpoint:', endpoint);

    const response = await axios.post(
      endpoint,
      {
        recipients: [formattedPhone],
        message: message
      },
      {
        headers: {
          'x-api-key': apiConfig.key,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('TextBee API Response:', {
      status: response.status,
      data: response.data
    });

    // Check for specific success indicators in the response
    if (response.data && response.data.status === 'success') {
      console.log('SMS sent successfully');
      return true;
    } else {
      console.error('SMS sending failed:', response.data);
      return false;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('TextBee API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        headers: error.response?.headers
      });
    } else {
      console.error('Unexpected error while sending SMS:', error);
    }
    return false;
  }
}

/**
 * Sends an SMS message
 */
export async function sendSMS(
  phoneNumber: string, 
  message: string, 
  method: 'api' | 'mobile' | 'whatsapp' = 'api',
  isDevMode: boolean = false
): Promise<boolean> {
  console.log('sendSMS called with:', { phoneNumber, message, method, isDevMode });

  // Check if phone number is valid format (Pakistan numbers start with +92)
  if (!phoneNumber || (!phoneNumber.startsWith('+92') && !phoneNumber.startsWith('92'))) {
    console.error(`Invalid Pakistan phone number format: ${phoneNumber}`);
    return false;
  }

  // In dev mode, always send to test number
  const finalPhoneNumber = isDevMode ? TEST_PHONE_NUMBER : phoneNumber;
  console.log('Using phone number:', finalPhoneNumber, isDevMode ? '(dev mode)' : '');

  try {
    if (method === 'api') {
      const apiConfig = getActiveApi('sms');
      if (!apiConfig) {
        console.error('No active SMS API configured');
        return false;
      }
      console.log('Using API config:', { name: apiConfig.name, type: apiConfig.type });
      return await sendSMSViaAPI(finalPhoneNumber, message, apiConfig);
    } else if (method === 'whatsapp') {
      const apiConfig = getActiveApi('whatsapp');
      if (!apiConfig) {
        console.error('No active WhatsApp API configured');
        return false;
      }
      // Implement WhatsApp sending logic here
      console.log('WhatsApp sending not implemented yet');
      return false;
    } else {
      // For mobile method, just log the message in development
      console.log('\n=== SMS Message Log ===');
      console.log(`To: ${finalPhoneNumber}`);
      console.log(`Method: ${method}`);
      console.log('Message:');
      console.log(message);
      console.log('=====================\n');
      return true;
    }
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

export async function sendSubstituteNotification(
  substitute: Teacher,
  assignments: {day: string; period: number; className: string; originalTeacher: string}[]
) {
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
    method: 'api',
    phone: substitute.phoneNumber || TEST_PHONE_NUMBER
  });

  const smsSent = await sendSMS(substitute.phoneNumber || TEST_PHONE_NUMBER, message);

  // Update SMS status
  const history = loadSMSHistory();
  const updatedHistory = history.map(entry => 
    entry.id === historyEntry.id 
      ? { ...entry, status: smsSent ? 'sent' as const : 'failed' as const }
      : entry
  );
  saveSMSHistory(updatedHistory);

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