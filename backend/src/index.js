import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

app.get("/home", (req, res) => {
    res.json("hello world")
});

const start = async () => {

    app.listen(3003, () => {
        console.log("Listing on port 3003")
    });
}

start();