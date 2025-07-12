// src/socket.js
import { io } from 'socket.io-client';

const socketApi = io(["http://localhost:3002", "https://loopmeet-zoom-clone-backend.onrender.com/"]); // Your backend URL

export default socketApi;