import axios from "axios";
import { useAuthStore } from "../store/authStore";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || "Something went wrong";
    const requestUrl = error.config?.url || "";

    // Skip global redirect if the error came from the login endpoint
    const isLoginRequest = requestUrl.includes("/login") || requestUrl.includes("/auth");

    if (status === 401 && !isLoginRequest) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    }

    return Promise.reject({ status, message });
  }
);

export default axiosInstance;