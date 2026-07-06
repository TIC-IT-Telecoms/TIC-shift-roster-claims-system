import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { authApi } from "../api/authApi";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data, variables) => {
      if (data?.success === false) {
        throw new Error(data?.message || "Invalid username or password");
      }

      if (data?.data?.requiresOtp) {
        navigate("/login-otp", {
          state: { email: variables.username.toLowerCase().trim() }
        });
        return;
      }

      if (!data?.data?.employee) {
        throw new Error("Malformed server response context. Missing profile data.");
      }

      const user = data?.data?.employee;
      const role = user?.user?.role;
      if (!role) {
        console.error("Login succeeded but no access role profile returned:", data);
        return;
      }

      setAuth({ user });
      navigate(role === "Admin" ? "/admin-dashboard" : "/dashboard");
    },
    onError: (err) => {
      console.error("Login mutation pipeline rejected:", err);
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

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email) => authApi.forgotPassword(email),
    onSuccess: (data) => { },
    onError: (err) => {
      console.error("Forgot password mutation failed:", err);
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (resetPayload) => authApi.resetPassword(resetPayload),
    onSuccess: (data) => { },
    onError: (err) => {
      console.error("Reset password mutation failed:", err);
    },
  });
};

export const useVerifyOtp = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (otpPayload) => authApi.verifyOtp(otpPayload),
    onSuccess: (data) => {
      if (data?.success === false || !data?.data?.employee) {
        throw new Error(data?.message || "Verification code validation rejected.");
      }

      const user = data?.data?.employee;
      const role = user?.user?.role;

      if (!role) {
        console.error("MFA validation succeeded but user metadata role is missing:", data);
        return;
      }

      setAuth({ user });
      navigate(role === "Admin" ? "/admin-dashboard" : "/dashboard");
    },
    onError: (err) => {
      console.error("OTP authentication pipeline rejected:", err);
    },
  });
};