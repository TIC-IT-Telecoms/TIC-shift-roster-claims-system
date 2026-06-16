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

/**
 * Hook to handle requesting a reset email link
 */
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email) => authApi.forgotPassword(email),
    onSuccess: (data) => {
      // Handle global logs or contextual analytical tracking metrics here if needed
    },
    onError: (err) => {
      console.error("Forgot password mutation failed:", err);
    },
  });
};

/**
 * Hook to execute and save the new account credentials payload
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: (resetPayload) => authApi.resetPassword(resetPayload),
    onSuccess: (data) => {
      // Successfully updated credentials contract handled globally
    },
    onError: (err) => {
      console.error("Reset password mutation failed:", err);
    },
  });
};