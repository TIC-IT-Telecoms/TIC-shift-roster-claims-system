import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { authApi } from "../api/authApi";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const forgotPasswordMutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email),

    onSuccess: () => {
      setSuccess(true);
      setError("");
    },

    onError: (err) => {
      setError(err.message || "Failed to send reset link.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    forgotPasswordMutation.mutate();
  };

  return (
    <AuthLayout
      title={success ? "Check Your Email" : "Forgot Password"}
      subtitle={
        success
          ? "We've sent a password reset link to your email."
          : "Enter your work email address to receive a password reset link."
      }
    >
      {!success ? (
        <>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address
            </label>

            <input
              type="email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-600 outline-none"
              placeholder="user@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              type="submit"
              disabled={forgotPasswordMutation.isPending}
              className="w-full mt-5 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              {forgotPasswordMutation.isPending
                ? "Sending..."
                : "Send Reset Link"}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center">
          <div className="text-6xl mb-4">📧</div>

          <p className="text-slate-600 mb-2">
            A reset link has been sent to:
          </p>

          <p className="font-semibold text-slate-900">
            {email}
          </p>

          <button
            onClick={() => navigate("/")}
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold"
          >
            Back to Login
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

export default ForgotPassword;