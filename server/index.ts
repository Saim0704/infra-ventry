// Force restart at 2026-02-12T18:30:00
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupRealtime } from "./lib/realtime";

const app = express();
const httpServer = createServer(app);

import { log } from "./lib/logger";
import path from "path";
import fs from "fs";

// Priority Script Serving (Literal routes for reliability)
const scriptsPath = path.resolve(process.cwd(), "public", "scripts");

const serveScript = (filename: string) => (req: Request, res: Response) => {
  const filePath = path.join(scriptsPath, filename);
  console.log(`[Script Service] Request for ${filename} -> ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    console.log(`[Script Service] SERVING: ${filename}`);
    res.setHeader("Content-Type", filename.endsWith(".sh") ? "text/x-shellscript" : "application/octet-stream");
    return res.sendFile(filePath);
  }
  console.error(`[Script Service] NOT FOUND: ${filename}`);
  res.status(404).send("Script not found");
};

app.get("/get/install-agent.sh", serveScript("install-agent.sh"));
app.get("/get/vm_agent.sh", serveScript("vm_agent.sh"));
app.get("/get/audit_services.sh", serveScript("audit_services.sh"));
app.get("/get/infrawatch-agent", serveScript("infrawatch-agent"));

// Initialize real-time updates
setupRealtime(httpServer);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Health check
app.get("/ping", (_req, res) => {
  const scriptsPath = path.resolve(process.cwd(), "public", "scripts");
  const files = fs.existsSync(scriptsPath) ? fs.readdirSync(scriptsPath) : "NOT FOUND";
  res.json({ status: "pong", scriptsPath, files });
});

export { log };

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  log(`[Incoming Request] Method: ${req.method} | Path: ${path} | URL: ${req.url}`);
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        let resData = JSON.stringify(capturedJsonResponse);
        if (resData.length > 500) {
          resData = resData.substring(0, 500) + `... [truncated, total ${resData.length} chars]`;
        }
        logLine += ` :: ${resData}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log("--- BOOM: Registering Routes ---");
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || "5000", 10);
  
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
