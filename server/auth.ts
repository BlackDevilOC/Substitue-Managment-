import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      replitUser?: {
        id: string;
        name: string;
        roles: string;
      }
    }
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

// Middleware to check Replit Auth headers
export const checkReplitAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-replit-user-id'];
  const userName = req.headers['x-replit-user-name'];
  const userRoles = req.headers['x-replit-user-roles'];
  
  if (userId && userName) {
    req.replitUser = {
      id: userId.toString(),
      name: userName.toString(),
      roles: userRoles ? userRoles.toString() : ''
    };
    
    // Auto-login for Replit users
    if (!req.isAuthenticated()) {
      // Create or find user based on Replit identity
      loginOrCreateReplitUser(req, res, next);
      return;
    }
  }
  
  next();
};

// Login or create user based on Replit identity
async function loginOrCreateReplitUser(req: Request, res: Response, next: NextFunction) {
  if (!req.replitUser) return next();
  
  try {
    // Try to find existing user
    let user = await storage.getUserByUsername(req.replitUser.name);
    
    // Create user if they don't exist
    if (!user) {
      // Generate a random password for Replit users
      const password = await hashPassword(randomBytes(16).toString('hex'));
      
      user = await storage.createUser({
        username: req.replitUser.name,
        password: password,
        isAdmin: req.replitUser.roles.includes('admin')
      });
    }
    
    // Login the user
    req.login(user, (err) => {
      if (err) return next(err);
      next();
    });
  } catch (error) {
    console.error('Error in Replit auth login:', error);
    next();
  }
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
  
  // Apply Replit Auth check to all requests
  app.use(checkReplitAuth);

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
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
}