import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { authApi } from "../api/authApi";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if (data?.success === false || !data?.data?.employee) {
        throw new Error(data?.message || "Invalid username or password");
      }
      const user = data?.data?.employee;
      const role = user?.user?.role;
      if (!role) {
        console.error("Login succeeded but no role returned:", data);
        return;
      }
      setAuth({ user });
      navigate(role === "Admin" ? "/admin-dashboard" : "/dashboard");
    },
    onError: (err) => {
      console.error("Login failed:", err);
    },
  });
};

export const useLogout = () => {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearAuth();
      navigate("/");
    },
    onError: () => {
      clearAuth();
      navigate("/");
    },
  });
};