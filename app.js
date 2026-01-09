require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const Routes = require("./routes/index");
const cors = require("cors");
const {
  handleStripeWebhook,
} = require("./controllers/stripeWebhookController");

const app = express();
const port = process.env.PORT || 3000;

// CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

// Stripe Webhook (raw body)
app.use("/webhook/stripe", express.raw({ type: "application/json" }));
app.post("/webhook/stripe", handleStripeWebhook);

// JSON parsing
app.use(express.json({ type: "application/json" }));
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "1000mb", extended: true }));

// Static files & views
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use("/api", Routes);

app.get("/", (req, res) => {
  res.send("YSoft Health");
});

const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => console.log("HTTP server closed"));
});
