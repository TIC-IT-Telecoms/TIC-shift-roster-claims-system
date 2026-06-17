import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useResetPassword } from "../hooks/useAuth"; // Centralized custom hook matching your architecture

function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Safely extract ?token= value out of URL query string
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Consume your unified react-query mutation hook
  const mutation = useResetPassword();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Authorization token is missing or invalid. Please request a new link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Fire mutation payload matching your backend's expected data keys
    mutation.mutate(
      {
        reset_token: token,
        new_password: password,
        confirm_password: confirmPassword,
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setError("");
        },
        onError: (err) => {
          // Captures custom error strings sent from Express ErrorResponse object fields
          setError(err?.response?.data?.message || err.message || "Failed to reset password.");
        },
      }
    );
  };

  return (
    <AuthLayout
      title="Set New Password"
      subtitle={success ? "Success" : "Choose a strong password for your account."}
    >
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!success ? (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              New Password
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              Confirm Password
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 transition"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {password && (
            <div className="mt-3 text-sm">
              {password.length >= 8 ? (
                <span className="text-green-600 font-medium">✓ Strong enough</span>
              ) : (
                <span className="text-red-600 font-medium">
                  ⚠️ {8 - password.length} more characters needed
                </span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full mt-5 bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-semibold disabled:opacity-50 shadow-sm"
          >
            {mutation.isPending ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      ) : (
        <div className="text-center">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-slate-600 mb-5 text-sm">
            Your password has been successfully updated. You can now securely access your dashboard.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            Back to Login
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

export default ResetPassword;