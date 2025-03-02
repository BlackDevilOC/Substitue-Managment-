import { Teacher, Schedule } from '@shared/schema';
import { storage } from './storage';
import axios from 'axios';

// SMS gateway configuration
const SMS_API_KEY = process.env.SMS_API_KEY || "";
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || "SubTeacher";

interface SMSMessage {
  recipient: string;  // Phone number
  message: string;
  senderId?: string;
}

/**
 * Sends an SMS message
 * @param phoneNumber The recipient's phone number (with country code)
 * @param message The message to send
 * @returns Promise with the result
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  // Check if phone number is valid format
  if (!phoneNumber || !phoneNumber.startsWith('+')) {
    console.error(`Invalid phone number format: ${phoneNumber}`);
    return false;
  }

  try {
    // Mobile app compatibility - both server and mobile devices can send messages
    if (process.env.NODE_ENV === 'production') {
      // Server-side SMS sending
      return await sendSMSViaAPI(phoneNumber, message);
    } else {
      // In development, just log the message
      console.log(`[SMS] To: ${phoneNumber}, Message: ${message}`);
      return true;
    }
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

/**
 * Server-side SMS sending via API
 */
async function sendSMSViaAPI(phoneNumber: string, message: string): Promise<boolean> {
  if (!SMS_API_KEY) {
    console.error('SMS_API_KEY not configured');
    return false;
  }

  try {
    // This is a placeholder. Replace with your actual SMS gateway API
    const response = await axios.post('https://api.yoursmsgateway.com/send', {
      apiKey: SMS_API_KEY,
      to: phoneNumber,
      message: message,
      senderId: SMS_SENDER_ID
    });

    return response.status === 200;
  } catch (error) {
    console.error('SMS API error:', error);
    return false;
  }
}

/**
 * Client-side SMS handler that can be used from the mobile app
 * This uses the device's native SMS capabilities
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
    } catch (error) {
      console.error('Failed to communicate with native app', error);
      return false;
    }
  };
}

export async function sendSubstituteNotification(
  substitute: Teacher,
  assignments: {day: string; period: number; className: string; originalTeacher: string}[]
) {
  if (!substitute.phoneNumber) {
    console.warn(`No phone number for substitute ${substitute.name}`);
    return;
  }

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

  // Store SMS in history
  await storage.createSmsHistory({
    teacherId: substitute.id,
    message: message,
    status: 'sent' // We'll update this when we implement actual SMS sending
  });

  const smsSent = await sendSMS(substitute.phoneNumber, message);
  console.log('SMS sent successfully:', smsSent);
  return message;
}