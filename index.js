import express from "express";
import bodyParser from "body-parser";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import QRCode from "qrcode";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

let db;
(async () => {
  db = await open({
    filename: "./data.sqlite",
    driver: sqlite3.Database
  });
  await db.exec(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    storage_choice TEXT,
    dropoff_time TEXT,
    qr TEXT,
    status TEXT,
    location TEXT
  )`);
})();

// Home page - submission form
app.get("/", (req, res) => {
  res.render("index");
});

// Handle form submission
app.post("/submit", async (req, res) => {
  const { name, description, storage_choice, dropoff_time } = req.body;
  const id = Date.now(); // unique ID
  const qrData = `ID:${id}|Name:${name}`;
  const qrImage = await QRCode.toDataURL(qrData);

  await db.run(
    "INSERT INTO items (name, description, storage_choice, dropoff_time, qr, status) VALUES (?, ?, ?, ?, ?, ?)",
    [name, description, storage_choice, dropoff_time, qrImage, "Submitted"]
  );

  res.render("tracking", { item: { id, name, qr: qrImage, status: "Submitted" } });
});

// Admin dashboard
app.get("/dashboard", async (req, res) => {
  const items = await db.all("SELECT * FROM items ORDER BY id DESC");
  res.render("dashboard", { items });
});

// Scan QR / update item
app.post("/update/:id", async (req, res) => {
  const { status, location } = req.body;
  await db.run("UPDATE items SET status = ?, location = ? WHERE id = ?", [status, location, req.params.id]);
  res.redirect("/dashboard");
});

// Tracking page by QR code ID
app.get("/track/:id", async (req, res) => {
  const item = await db.get("SELECT * FROM items WHERE id = ?", [req.params.id]);
  if (!item) return res.send("Item not found");
  res.render("tracking", { item });
});

app.listen(3000, () => console.log("Server running on port 3000"));
