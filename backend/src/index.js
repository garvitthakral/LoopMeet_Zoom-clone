import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js"
import { conectToSockt } from './controllers/socket.js';

const PORT = process.env.PORT || 3002;
const URL = process.env.MONGO_URL;

const app = express();
const server = createServer(app);
const io = conectToSockt(server);

app.use(
  cors({
    origin: "http://localhost:5173",
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

    app.listen(PORT, () => {
      console.log(`App is listening on PORT ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });

app.get("/", (req, res) => {
  res.send("Backend is working");
});