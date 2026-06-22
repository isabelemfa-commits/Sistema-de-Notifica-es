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
    console.error("Error reading firebase-applet-config.json:", err);
  }

  console.log('Initializing Firebase Admin for project:', projectId);
  initializeApp({
    projectId: projectId
  });
}

const auth = getAuth();
const db = getFirestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to create a user
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, name, role, adminEmail } = req.body;

    // Security check: Only isabelemfa@gmail.com can call this
    if (adminEmail !== "isabelemfa@gmail.com") {
      return res.status(403).json({ error: "Unauthorized. Only the master admin can create users." });
    }

    try {
      // Create the Auth user
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });

      // Store profile in Firestore
      await db.collection("user_profiles").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        name,
        role: role || "user",
        createdAt: new Date().toISOString(),
      });

      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
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
