import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import AuthLayout from "../components/AuthLayout";
import { authApi } from "../api/authApi";

function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      authApi.resetPassword({
        reset_token: token,
        new_password: password,
        confirm_password: confirmPassword,
      }),

    onSuccess: () => {
      navigate("/");
    },

    onError: (err) => {
      setError(err.message || "Failed to reset password.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (password.length < 8) {
      return setError(
        "Password must be at least 8 characters."
      );
    }

    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    mutation.mutate();
  };

  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Choose a strong password for your account."
    >
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-semibold">
            New Password
          </label>

          <input
            type="password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold">
            Confirm Password
          </label>

          <input
            type="password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {password && (
          <div className="mt-3 text-sm">
            {password.length >= 8 ? (
              <span className="text-green-600">
                ✓ Strong enough
              </span>
            ) : (
              <span className="text-red-600">
                {8 - password.length} more characters needed
              </span>
            )}
          </div>
        )}

        <button
          type="submit"
          className="w-full mt-5 bg-blue-600 text-white py-3 rounded-xl font-semibold"
        >
          {mutation.isPending
            ? "Resetting..."
            : "Reset Password"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;