import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Generate a secure random string if SESSION_SECRET is not set
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const { verifyPassword } = await import('./user-file-manager.js');
        const user = verifyPassword(username, password);
        
        if (!user) {
          return done(null, false);
        }
        
        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Change password route
  app.post("/api/user/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    
    const { currentPassword, newPassword } = req.body;
    
    try {
      // Get user from file
      const { verifyPassword, updateUserPassword } = await import('./user-file-manager.js');
      const user = verifyPassword(req.user.username, currentPassword);
      
      if (!user) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Update password
      const success = updateUserPassword(req.user.id, newPassword);
      
      if (!success) {
        return res.status(500).json({ error: "Failed to update password" });
      }
      
      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "An error occurred while changing password" });
    }
  });

  // Change username route
  app.post("/api/user/change-username", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    
    const { newUsername } = req.body;
    
    if (!newUsername || typeof newUsername !== 'string') {
      return res.status(400).json({ error: "New username is required" });
    }
    
    try {
      // Check if username already exists
      const { getUserByUsername, updateUsername } = await import('./user-file-manager.js');
      const existingUser = getUserByUsername(newUsername);
      
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Update username
      const success = updateUsername(req.user.id, newUsername);
      
      if (!success) {
        return res.status(500).json({ error: "Failed to update username" });
      }
      
      // Update session
      const updatedUser = { ...req.user, username: newUsername };
      req.login(updatedUser, (err) => {
        if (err) {
          return res.status(500).json({ error: "Error updating session" });
        }
        res.status(200).json({ message: "Username updated successfully", user: updatedUser });
      });
    } catch (error) {
      console.error("Error changing username:", error);
      res.status(500).json({ error: "An error occurred while changing username" });
    }
  });
}