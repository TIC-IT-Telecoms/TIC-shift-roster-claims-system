import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useForgotPassword } from "../hooks/useAuth"; // Swapped out local useMutation for your centralized hook

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Consume your custom hook
  const forgotPasswordMutation = useForgotPassword();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    // Pass the payload string and handle state changes inside component context overrides
    forgotPasswordMutation.mutate(email, {
      onSuccess: () => {
        setSuccess(true);
        setError("");
      },
      onError: (err) => {
        // Safely parses customized errors returned from Express ErrorResponse structures
        setError(err?.response?.data?.message || err.message || "Failed to send reset link.");
      },
    });
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-600 outline-none transition"
              placeholder="user@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              type="submit"
              disabled={forgotPasswordMutation.isPending}
              className="w-full mt-5 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center">
          <div className="text-6xl mb-4">📧</div>

          <p className="text-slate-600 mb-2 text-sm">
            A reset link has been sent to:
          </p>

          <p className="font-semibold text-slate-900 mb-2">
            {email}
          </p>
          
          <p className="text-xs text-slate-500 mb-4 px-4">
            Please review your inbox or spam folder. The secure link will remain active for 1 hour.
          </p>

          <button
            onClick={() => navigate("/")}
            className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-semibold"
          >
            Back to Login
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

export default ForgotPassword;