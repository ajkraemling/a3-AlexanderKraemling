require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const path = require("path");
const { auth, requiresAuth } = require('express-openid-connect');

const app = express();
const port = process.env.PORT || 3000;

// --- Auth0 configuration ---
const config = {
  authRequired: true,      // automatically redirects to login
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_DOMAIN
};

// attach /login, /logout, /callback routes
app.use(auth(config));

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- MongoDB setup ---
const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let db, checklistsCollection;

// connect to MongoDB
async function connectDB() {
  await client.connect();
  console.log("Connected to MongoDB!");
  db = client.db("bucketdb");
  checklistsCollection = db.collection("checklists");
}

connectDB().catch(err => console.error("Mongo connection failed:", err));

// --- Routes ---

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Return current Auth0 user
app.get("/api/me", (req, res) => {
  if (!req.oidc.isAuthenticated()) return res.status(401).json({ error: "Not logged in" });
  res.json({ user: req.oidc.user });
});

// --- Checklists CRUD ---

// Get all checklists for the logged-in user
app.get("/api/checklists", requiresAuth(), async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const checklists = await checklistsCollection.find({ userId }).toArray();
    res.json(checklists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new checklist
app.post("/api/checklists", requiresAuth(), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Checklist name required" });

  const newChecklist = { name, userId: req.oidc.user.sub, tasks: [] };
  try {
    await checklistsCollection.insertOne(newChecklist);
    res.json(newChecklist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a task to a checklist
app.post("/api/checklists/:name/tasks", requiresAuth(), async (req, res) => {
  const { name } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Task text required" });

  try {
    const userId = req.oidc.user.sub;
    await checklistsCollection.updateOne(
        { name, userId },
        { $push: { tasks: { text, done: false } } }
    );
    const updated = await checklistsCollection.findOne({ name, userId });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle task done/undone
app.put("/api/checklists/:name/tasks/:index", requiresAuth(), async (req, res) => {
  const { name, index } = req.params;

  try {
    const userId = req.oidc.user.sub;
    const checklist = await checklistsCollection.findOne({ name, userId });
    if (!checklist || !checklist.tasks[index]) return res.status(404).json({ error: "Task not found" });

    checklist.tasks[index].done = !checklist.tasks[index].done;
    await checklistsCollection.updateOne(
        { name, userId },
        { $set: { tasks: checklist.tasks } }
    );
    res.json(checklist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Start server ---
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
