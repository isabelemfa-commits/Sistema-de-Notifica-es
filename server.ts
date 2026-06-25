import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import fs from 'fs';

// Initialize Firebase Admin
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

// Force the project ID in the environment to prevent gRPC from using the host project
process.env.GOOGLE_CLOUD_PROJECT = projectId;
process.env.GCLOUD_PROJECT = projectId;

const firebaseApp = getApps().length === 0 
  ? initializeApp({ projectId }) 
  : getApp();

const currentProjectId = firebaseApp.options.projectId || process.env.GOOGLE_CLOUD_PROJECT || 'unknown';
console.log('Firebase Admin initialized. App count:', getApps().length, 'Project:', currentProjectId);

const auth = getAuth(firebaseApp);

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

console.log('Using Firestore database:', databaseId);
const db = (databaseId && databaseId !== "(default)") 
  ? getFirestore(firebaseApp, databaseId) 
  : getFirestore(firebaseApp);

function getFirebaseErrorMessage(error: any) {
  let errorMessage = error.message;
  // Error code 7 is PERMISSION_DENIED for Firestore/Auth in gRPC
  if ((error.code === 'auth/internal-error' || error.code === 'auth/forbidden' || error.code === 7) && error.message.includes('identitytoolkit.googleapis.com')) {
    errorMessage = "A API do 'Identity Toolkit' (Firebase Auth) não está ativa no seu projeto Google Cloud. \n\n1. Clique no link para ativar: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=" + projectId + "\n2. Certifique-se também de que o provedor 'E-mail/Senha' está ativado no Console do Firebase (Autenticação > Provedores de login).";
  } else if (error.message.includes('firestore.googleapis.com') || (error.code === 7 && !error.message.includes('identitytoolkit'))) {
    errorMessage = "A API do Firestore não está ativa ou o banco de dados '" + databaseId + "' ainda não está pronto. \n\n1. Verifique se a API está ativa: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=" + projectId + "\n2. Se você acabou de criar o projeto, aguarde 1 minuto e tente novamente.";
  }
  return errorMessage;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to create a user in Firebase Auth and Firestore
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, name, role, adminEmail } = req.body;

    // Security check: Only isabelemfa@gmail.com can call this
    if (adminEmail?.toLowerCase() !== "isabelemfa@gmail.com") {
      return res.status(403).json({ error: "Unauthorized. Somente o administrador principal pode gerenciar usuários." });
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
      res.status(500).json({ error: getFirebaseErrorMessage(error) });
    }
  });

  // API Route to list users
  app.get("/api/admin/users", async (req, res) => {
    const adminEmail = req.query.adminEmail as string;

    if (adminEmail?.toLowerCase() !== "isabelemfa@gmail.com") {
      return res.status(403).json({ error: "Unauthorized." });
    }

    try {
      console.log(`Fetching users from Firestore [Project: ${currentProjectId}, DB: ${databaseId}] collection: user_profiles`);
      const snapshot = await db.collection("user_profiles").get();
      const users = snapshot.docs.map(doc => doc.data());
      res.json({ users });
    } catch (error: any) {
      console.error("Error listing users:", error);
      res.status(500).json({ 
        error: getFirebaseErrorMessage(error),
        details: error.message,
        code: error.code,
        project: currentProjectId,
        database: databaseId
      });
    }
  });

  app.get("/api/debug/firestore", async (req, res) => {
    const results: any = {};
    try {
      const defaultDb = getFirestore(firebaseApp);
      await defaultDb.collection("debug").limit(1).get();
      results.defaultDb = "OK";
    } catch (err: any) {
      results.defaultDb = `Error: ${err.message} (Code: ${err.code})`;
    }

    try {
      await db.collection("debug").limit(1).get();
      results.namedDb = "OK";
    } catch (err: any) {
      results.namedDb = `Error: ${err.message} (Code: ${err.code})`;
    }

    res.json({
      projectId: currentProjectId,
      databaseId,
      results
    });
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
