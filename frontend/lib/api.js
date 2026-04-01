import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API
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
