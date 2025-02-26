
import { Teacher, Schedule } from '@shared/schema';
import { storage } from './storage';

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

  // For now, just log the message. You can integrate an SMS service here
  console.log('SMS notification:', message);
  return message;
}
