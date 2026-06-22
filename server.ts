import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import fs from 'fs';

// Initialize Firebase Admin
if (getApps().length === 0) {
  let projectId = "tactical-heading-j18qq";
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.projectId) {
        projectId = config.projectId;
      }
    }
  } catch (err) {
    console.error("Error reading projectId from config:", err);
  }

  console.log('Initializing Firebase Admin for project:', projectId);
  // We use projectId to ensure it targets the provisioned project
  initializeApp({
    projectId: projectId
  });
}

const auth = getAuth();

// Get database ID from config
let databaseId = "(default)";
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.firestoreDatabaseId) {
      databaseId = config.firestoreDatabaseId;
    }
  }
} catch (err) {
  console.error("Error reading databaseId from config:", err);
}

const db = getFirestore(databaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to register a user email in Firestore (Simplified)
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, name, role, adminEmail } = req.body;

    // Security check: Only isabelemfa@gmail.com can call this
    if (adminEmail !== "isabelemfa@gmail.com") {
      return res.status(403).json({ error: "Unauthorized. Only the master admin can manage users." });
    }

    try {
      const userRef = db.collection("user_profiles").doc(email.toLowerCase());
      const roleToSet = email.toLowerCase() === "isabelemfa@gmail.com" ? "owner" : (role || "user");
      
      await userRef.set({
        email: email.toLowerCase(),
        name,
        role: roleToSet,
        createdAt: new Date().toISOString(),
        status: 'active'
      }, { merge: true });

      res.json({ success: true, email: email.toLowerCase() });
    } catch (error: any) {
      console.error("Error creating user record:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to list users
  app.get("/api/admin/users", async (req, res) => {
    const adminEmail = req.query.adminEmail;

    if (adminEmail !== "isabelemfa@gmail.com") {
      return res.status(403).json({ error: "Unauthorized." });
    }

    try {
      const snapshot = await db.collection("user_profiles").get();
      const users = snapshot.docs.map(doc => doc.data());
      res.json({ users });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
