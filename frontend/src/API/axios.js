import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3002/",
  withCredentials: true,
});
// const api = axios.create({
//   baseURL: "https://loopmeet-zoom-clone-backend.onrender.com",
//   withCredentials: true,
// });

export default api;
