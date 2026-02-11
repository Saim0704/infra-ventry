import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";

import { hashPassword, comparePassword } from "./lib/auth-utils";

const PgSession = connectPg(session);

export function setupAuth(app: Express) {
    const sessionSettings: session.SessionOptions = {
        secret: process.env.SESSION_SECRET || "super_secret_session_key",
        resave: false,
        saveUninitialized: false,
        store: new PgSession({
            conString: process.env.DATABASE_URL,
            createTableIfMissing: false,
            tableName: "sessions",
        }),
        cookie: {
            secure: app.get("env") === "production",
            maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        },
    };

    if (app.get("env") === "production") {
        app.set("trust proxy", 1);
    }

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(async (username, password, done) => {
            try {
                const [user] = await db
                    .select()
                    .from(users)
                    .where(eq(users.username, username))
                    .limit(1);

                if (!user) {
                    return done(null, false, { message: "Incorrect username." });
                }

                const isValid = await comparePassword(password, user.password);
                if (!isValid) {
                    return done(null, false, { message: "Incorrect password." });
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }),
    );

    passport.serializeUser((user, done) => {
        done(null, (user as User).id);
    });

    passport.deserializeUser(async (id: string, done) => {
        try {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, id))
                .limit(1);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    // Seed default user if none exist
    (async () => {
        const existingUsers = await db.select().from(users).limit(1);
        if (existingUsers.length === 0) {
            const hashedPassword = await hashPassword("password");
            await db.insert(users).values({
                username: "admin",
                email: "admin@example.com",
                password: hashedPassword,
                role: "admin",
                firstName: "System",
                lastName: "Administrator"
            });
            console.log("Created default user 'admin' with password 'password'");
        }
    })();
}

export function registerAuthRoutes(app: Express) {
    app.post("/api/login", passport.authenticate("local"), (req, res) => {
        res.status(200).json(req.user);
    });

    app.all("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.status(200).json({ message: "Logged out successfully" });
        });
    });

    app.get("/api/user", (req, res) => {
        if (req.isAuthenticated()) {
            res.json(req.user);
        } else {
            res.status(401).json({ message: "Unauthorized" });
        }
    });

    // For compatibility with use-auth hook
    app.get("/api/auth/user", (req, res) => {
        if (req.isAuthenticated()) {
            res.json(req.user);
        } else {
            res.status(401).json({ message: "Unauthorized" });
        }
    });
}

export function isAuthenticated(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Unauthorized" });
}
