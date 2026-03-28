import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { log, error, warn } from "./lib/logger";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, organizations, projects, servers, databases, insertUserSchema, type User } from "@shared/schema";
import { db } from "./db";
import { eq, or, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";

import { hashPassword, comparePassword } from "./lib/auth-utils";
import { createTenantDatabase } from "./lib/provision";

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
                log(`[Auth] Attempting login for username: ${username}`, "auth");
                const [user] = await db
                    .select({
                        id: users.id,
                        username: users.username,
                        password: users.password,
                        email: users.email,
                        role: users.role,
                        firstName: users.firstName,
                        lastName: users.lastName,
                        orgId: users.orgId,
                        orgName: organizations.name,
                        orgDomain: organizations.domain,
                        plan: organizations.plan,
                        trialExpiresAt: organizations.trialExpiresAt
                    })
                    .from(users)
                    .leftJoin(organizations, eq(users.orgId, organizations.id))
                    .where(or(eq(users.username, username), eq(users.email, username)))
                    .limit(1);

                if (!user) {
                    warn(`[Auth] Login failed: User ${username} not found`, "auth");
                    return done(null, false, { message: "Incorrect username." });
                }

                const isValid = await comparePassword(password, user.password);
                if (!isValid) {
                    warn(`[Auth] Login failed: Incorrect password for ${username}`, "auth");
                    return done(null, false, { message: "Incorrect password." });
                }

                log(`[Auth] Login successful for ${username} (Org: ${user.orgName || 'None'})`, "auth");
                // Remove password from the user object before passing to passport
                const { password: _, ...userWithoutPassword } = user;
                return done(null, userWithoutPassword);
            } catch (err: any) {
                error(`[Auth] LocalStrategy error: ${err.message}`, "auth");
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
                .select({
                    id: users.id,
                    username: users.username,
                    email: users.email,
                    role: users.role,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    orgId: users.orgId,
                    orgName: organizations.name,
                    orgDomain: organizations.domain,
                    plan: organizations.plan,
                    trialExpiresAt: organizations.trialExpiresAt
                })
                .from(users)
                .leftJoin(organizations, eq(users.orgId, organizations.id))
                .where(eq(users.id, id))
                .limit(1);
            
            if (!user) {
                warn(`[Auth] Deserialization failed: User ${id} not found`, "auth");
                return done(null, false);
            }
            done(null, user);
        } catch (err: any) {
            error(`[Auth] Deserialize error: ${err.message}`, "auth");
            done(err);
        }
    });

    // Seed default user and organization if none exist
    (async () => {
        try {
            let org = await db.select().from(organizations).where(eq(organizations.name, "Infra-Ventry")).limit(1).then(rows => rows[0]);
            if (!org) {
                [org] = await db.insert(organizations).values({ name: "Infra-Ventry", domain: "infra-ventry.com", plan: "pro" }).returning();
                log(`Created default organization: ${org.name}`, "auth");
            }

            const [admin] = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
            const hashedPassword = await hashPassword("password");
            if (!admin) {
                await db.insert(users).values({
                    username: "admin",
                    email: "admin@infra-ventry.com",
                    password: hashedPassword,
                    role: "admin",
                    firstName: "System",
                    lastName: "Administrator",
                    orgId: org.id
                });
                log("Created default user 'admin' with password 'password' for organization 'Infra-Ventry'", "auth");
            } else {
                // Force update admin to match new hash logic and link to the correct org
                await db.update(users).set({ 
                    password: hashedPassword, 
                    orgId: org.id,
                    email: admin.email || "admin@infra-ventry.com"
                }).where(eq(users.id, admin.id));
                log(`Verified/Updated admin user for organization ${org.name}`, "auth");
            }

            // Seed demo user and organization
            let demoOrg = await db.select().from(organizations).where(eq(organizations.name, "Demo Cloud")).limit(1).then(rows => rows[0]);
            if (!demoOrg) {
                [demoOrg] = await db.insert(organizations).values({ name: "Demo Cloud", domain: "demo.infra-ventry.com", plan: "pro" }).returning();
                log(`Created demo organization: ${demoOrg.name}`, "auth");

                // SEED DEMO DATA
                const [p1] = await db.insert(projects).values({ name: "Production App", description: "Main customer-facing environment", slug: "prod-app", orgId: demoOrg.id }).returning();
                const [p2] = await db.insert(projects).values({ name: "Internal Tools", description: "CI/CD and utility services", slug: "internal-tools", orgId: demoOrg.id }).returning();

                await db.insert(servers).values([
                    { hostname: "web-v4-01", name: "Web Node 01", os: "Linux", cpuCores: 8, totalRam: 16, totalDisk: 50, ipAddress: "10.0.1.10", projectId: p1.id },
                    { hostname: "web-v4-02", name: "Web Node 02", os: "Linux", cpuCores: 8, totalRam: 16, totalDisk: 50, ipAddress: "10.0.1.11", projectId: p1.id },
                    { hostname: "db-master", name: "Main DB", os: "Linux", cpuCores: 16, totalRam: 64, totalDisk: 1000, ipAddress: "10.0.2.1", projectId: p1.id },
                    { hostname: "jenkins-master", name: "CI Master", os: "Linux", cpuCores: 4, totalRam: 16, totalDisk: 100, ipAddress: "10.0.3.5", projectId: p2.id },
                ]);

                await db.insert(databases).values([
                    { name: "Customer Prod", engine: "PostgreSQL", host: "10.0.2.1", port: 5432, projectId: p1.id },
                    { name: "Auth DB", engine: "Redis", host: "10.0.2.2", port: 6379, projectId: p1.id },
                ]);
            }

            let demoUser = await db.select().from(users).where(eq(users.username, "demo")).limit(1).then(rows => rows[0]);
            if (!demoUser) {
                const demoPass = await hashPassword("demopassword");
                await db.insert(users).values({
                    username: "demo",
                    email: "demo@infra-ventry.com",
                    password: demoPass,
                    role: "admin",
                    firstName: "Demo",
                    lastName: "Account",
                    orgId: demoOrg.id
                });
                log("Created demo user 'demo' with password 'demopassword'", "auth");
            }
        } catch (err: any) {
            error(`Error seeding initial users/demo: ${err.message}`, "auth");
        }
    })();
}

export function registerAuthRoutes(app: Express) {
    app.post("/api/login", passport.authenticate("local"), (req, res) => {
        res.status(200).json(req.user);
    });

    app.post("/api/register", async (req, res) => {
        try {
            // Pre-process body to allow missing username (default to email)
            const body = { ...req.body };
            if (!body.username && body.email) {
                body.username = body.email;
            }

            const result = insertUserSchema.safeParse(body);
            if (!result.success) {
                return res.status(400).json({ message: result.error.message });
            }

            const { email, username, password } = result.data;
            const finalUsername = username as string;

            // Check if user already exists
            const existingUser = await db.select().from(users).where(or(eq(users.username, finalUsername), eq(users.email, email as string))).limit(1);
            if (existingUser.length > 0) {
                return res.status(400).json({ message: "Username already exists" });
            }

            // Organization Logic: Extract domain from email
            const domain = email.split("@")[1];
            if (!domain) {
                return res.status(400).json({ message: "Invalid email format" });
            }

            // Find or create organization
            let org = await db.select().from(organizations).where(eq(organizations.domain, domain)).limit(1).then(rows => rows[0]);
            if (!org) {
                // Determine organization name from domain (e.g., google.com -> Google)
                const orgName = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
                const trialExpiresAt = new Date();
                trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);
                
                // Use organization name + createdAt as basis for DB name
                const dateStr = trialExpiresAt.toISOString().split('T')[0].replace(/-/g, '');
                const dbSlug = orgName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const dbName = `${dbSlug}_${dateStr}`;

                [org] = await db.insert(organizations).values({
                    name: orgName,
                    domain: domain,
                    dbName: dbName,
                    plan: 'trial',
                    trialExpiresAt
                }).returning();
                log(`Created new organization with 30-day trial: ${org.name} (${org.domain}) DB: ${dbName}`, "auth");

                // Provision the physical DB
                try {
                    await createTenantDatabase(dbName);
                } catch (provisionErr) {
                    error(`Failed to provision DB for ${orgName}: ${provisionErr}`, "auth");
                }
            }

            const hashedPassword = await hashPassword(password);
            const [user] = await db.insert(users).values({
                ...result.data,
                username: finalUsername,
                password: hashedPassword,
                orgId: org.id,
                role: "user" // Default role
            }).returning();

            req.login(user, (err) => {
                if (err) return res.status(500).json({ message: "Login failed after registration" });
                res.status(201).json({
                    ...user,
                    orgName: org!.name,
                    orgDomain: org!.domain
                });
            });
        } catch (err: any) {
            error(`Registration error: ${err.message}`, "auth");
            res.status(500).json({ message: "Internal server error" });
        }
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
