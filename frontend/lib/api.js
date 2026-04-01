import axios from "axios";

const API = "https://realsecanteen-3.onrender.com/api";

const api = axios.create({
  baseURL: "https://realsecanteen-3.onrender.com"
});
// 🔥 ใส่ token อัตโนมัติทุก request
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
