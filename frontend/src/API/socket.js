// src/socket.js
import { io } from 'socket.io-client';

// const socketApi = io("https://loopmeet-zoom-clone-backend.onrender.com"); // Your backend URL
const socketApi = io("http://localhost:3002"); // Your backend URL

export default socketApi;