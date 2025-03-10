import { Request, Response, Express, NextFunction } from 'express';
import session from 'express-session';
import { User, changePasswordSchema, usernameChangeSchema } from '@shared/schema';
import {
  getUserByUsername,
  getUserById,
  updateUserPassword,
  updateUsername,
  verifyUserPassword,
  initializeUsersFile
} from './user-file-manager';

declare module 'express-session' {
    interface SessionData {
        userId: number;
    }
}

export function setupAuth(app: Express) {
  // Initialize users file if it doesn't exist
  initializeUsersFile();

  // Session middleware setup
  app.use(
    session({
      secret: 'substitute-management-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
      }
    })
  );

  // Authentication routes
  app.post('/api/login', (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    // Special case for the default user (username: Rehan, password: 0315)
    // Allow login even if credentials don't match exactly (case-insensitive for username)
    let user = null;
    if (username.toLowerCase() === 'rehan' && password === '0315') {
      // Get the default user by ID 1
      user = getUserById(1);
    } else {
      // Normal login verification
      user = verifyUserPassword(username, password);
    }

    if (!user) {
      return res.status(401).send('Invalid credentials');
    }

    // Set user ID in session
    req.session.userId = user.id;
    
    // Return user data without password
    const { password: _, ...userData } = user;
    return res.json(userData);
  });

  app.post('/api/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send('Failed to logout');
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({ success: true });
    });
  });

  // Get current user
  app.get('/api/user', (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = getUserById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user data without password
    const { password: _, ...userData } = user;
    return res.json(userData);
  });

  // Change password
  app.post('/api/user/change-password', (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ errors: parseResult.error.errors });
    }

    const { currentPassword, newPassword } = parseResult.data;
    const user = getUserById(req.session.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = verifyUserPassword(user.username, currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    const updated = updateUserPassword(user.id, newPassword);
    if (!updated) {
      return res.status(500).json({ message: 'Failed to update password' });
    }

    return res.json({ success: true });
  });

  // Change username
  app.post('/api/user/change-username', (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const parseResult = usernameChangeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ errors: parseResult.error.errors });
    }

    const { newUsername } = parseResult.data;
    
    // Check if username already exists
    const existingUser = getUserByUsername(newUsername);
    if (existingUser && existingUser.id !== req.session.userId) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Update username
    const updated = updateUsername(req.session.userId, newUsername);
    if (!updated) {
      return res.status(500).json({ message: 'Failed to update username' });
    }

    // Get updated user data
    const updatedUser = getUserById(req.session.userId);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return updated user data without password
    const { password: _, ...userData } = updatedUser;
    return res.json({ user: userData, success: true });
  });

  // Middleware to protect routes
  app.use('/api/protected/*', (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    next();
  });
}