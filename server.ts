import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import fs from 'fs';

// Initialize Firebase Admin
if (getApps().length === 0) {
  let projectId = "notific-ae16crv01-cb89e";
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

  // API Route to create a user in Firebase Auth and Firestore
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, name, role, adminEmail } = req.body;

    // Security check: Only isabelemfa@gmail.com can call this
    if (adminEmail !== "isabelemfa@gmail.com") {
      return res.status(403).json({ error: "Unauthorized. Only the master admin can manage users." });
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    try {
      // 1. Create user in Firebase Auth
      let userRecord;
      try {
        userRecord = await auth.createUser({
          email: email.toLowerCase(),
          password: password,
          displayName: name,
        });
        console.log('Successfully created new user in Auth:', userRecord.uid);
      } catch (authError: any) {
        // If user already exists in Auth, we might want to just update the Firestore record
        // but typically for "create", we expect a new user.
        if (authError.code === 'auth/email-already-in-use') {
          // If already in Auth, fetch the user to get the UID
          userRecord = await auth.getUserByEmail(email.toLowerCase());
          console.log('User already exists in Auth, updating Firestore profile for UID:', userRecord.uid);
        } else {
          throw authError;
        }
      }

      // 2. Create/Update user profile in Firestore
      const userRef = db.collection("user_profiles").doc(email.toLowerCase());
      const roleToSet = email.toLowerCase() === "isabelemfa@gmail.com" ? "owner" : (role || "user");
      
      await userRef.set({
        uid: userRecord.uid,
        email: email.toLowerCase(),
        name,
        role: roleToSet,
        createdAt: new Date().toISOString(),
        status: 'active'
      }, { merge: true });

      res.json({ success: true, email: email.toLowerCase(), uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/internal-error' && error.message.includes('identitytoolkit.googleapis.com')) {
        errorMessage = "A API do Firebase Authentication não está ativa. Por favor, clique no link abaixo para ativar:\n\nhttps://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=" + (process.env.FIREBASE_PROJECT_ID || "notific-ae16crv01-cb89e");
      }
      
      res.status(500).json({ error: errorMessage });
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
