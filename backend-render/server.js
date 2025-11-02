import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));

// Connect to MongoDB using mongoose
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Atlas connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Backend running" });
});

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is running successfully!" });
});

// Import and use existing API routes
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to recursively load route files
function loadRoutes(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      loadRoutes(filePath);
    } else if (file.endsWith('.js') && file !== 'server.js') {
      // Import the route file
      import(filePath).then(module => {
        // Get the route path relative to the api directory
        const relativePath = path.relative(path.join(__dirname, 'api'), dir);
        const routePath = relativePath ? `/api/${relativePath}` : '/api';
        
        // Use the route handlers
        if (module.GET) {
          app.get(routePath, module.GET);
        }
        if (module.POST) {
          app.post(routePath, module.POST);
        }
        if (module.PUT) {
          app.put(routePath, module.PUT);
        }
        if (module.PATCH) {
          app.patch(routePath, module.PATCH);
        }
        if (module.DELETE) {
          app.delete(routePath, module.DELETE);
        }
        
        console.log(`Loaded route: ${routePath}`);
      }).catch(err => {
        console.error(`Error loading route ${filePath}:`, err);
      });
    }
  });
}

// Load all API routes
loadRoutes(path.join(__dirname, 'api'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));