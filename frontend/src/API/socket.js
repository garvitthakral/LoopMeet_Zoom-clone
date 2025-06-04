// src/socket.js
import { io } from 'socket.io-client';

const socket = io("http://localhost:3002"); // Your backend URL

export default socket;