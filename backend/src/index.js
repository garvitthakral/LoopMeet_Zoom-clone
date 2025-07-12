import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import { createServer } from "http";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js"
import { connectToSocket } from './controllers/socket.js';
import connectToSockets from './controllers/sockets.js';

const PORT = process.env.PORT || 3002;
const URL = process.env.MONGO_URL;

const app = express();
const server = createServer(app);
const io = connectToSockets(server);

app.use(
  cors({
    origin: ["http://localhost:5173", "https://loopmeet-zoom-clone.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json({limit: "40KB"}));
app.use(express.urlencoded({limit: "40kb", extended: true}));
app.use("/api/v1/user", userRoutes);

mongoose
  .connect(URL)
  .then(() => {
    console.log("Connected to Database");

    server.listen(PORT, () => {
      console.log(`server is listening on PORT ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });

app.get("/", (req, res) => {
  res.send("Backend is working");
});