// src/socket.js
import { io } from 'socket.io-client';

const socketApi = io("https://loopmeet-zoom-clone-backend.onrender.com/"); // Your backend URL

export default socketApi;