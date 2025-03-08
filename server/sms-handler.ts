import { Teacher, Schedule } from '@shared/schema';
import { storage } from './storage';

// Development mode configuration
const TEST_PHONE_NUMBER = "+923124406273";

interface SMSMessage {
  recipient: string;  // Phone number
  message: string;
}

/**
 * Sends an SMS message (development mode)
 * @param phoneNumber The recipient's phone number (with country code)
 * @param message The message to send
 * @returns Promise with the result
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  // Check if phone number is valid format (Pakistan numbers start with +92)
  if (!phoneNumber || (!phoneNumber.startsWith('+92') && !phoneNumber.startsWith('92'))) {
    console.error(`Invalid Pakistan phone number format: ${phoneNumber}`);
    return false;
  }

  try {
    // In development mode, just log the message
    console.log('\n=== SMS Message Log ===');
    console.log(`To: ${phoneNumber}`);
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

  // Store SMS in history before sending
  await storage.createSmsHistory({
    teacherId: substitute.id,
    message: message,
    status: 'pending'
  });

  const smsSent = await sendSMS(phoneNumber, message);

  // Update SMS status after sending
  if (smsSent) {
    await storage.updateSmsStatus(substitute.id, 'sent');
  } else {
    await storage.updateSmsStatus(substitute.id, 'failed');
  }

  console.log(`SMS logged for ${substitute.name}: ${smsSent ? 'Success' : 'Failed'}`);
  return message;
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
        // You could also implement a web SMS service here
        return true;
      }
    } catch (error) {
      console.error('Failed to send SMS', error);
      return false;
    }
  };
}