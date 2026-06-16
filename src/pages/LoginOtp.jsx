import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useVerifyOtp } from "../hooks/useAuth";

const OTP_DURATION = 300;

function LoginOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  // Handle direct navigation access gracefully if someone bookmarks the OTP page
  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(OTP_DURATION);
  const [error, setError] = useState("");

  // Consume custom React Query hook
  const verifyMutation = useVerifyOtp();

  useEffect(() => {
    // If no email was forwarded from the initial login, redirect back to root entry
    if (!email) {
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Please provide a valid 6-digit verification sequence.");
      return;
    }

    // Fire verification payload ONLY when form submission is triggered manually
    verifyMutation.mutate(
      { email, otp },
      {
        onError: (err) => {
          setError(err?.response?.data?.message || err.message || "Invalid or expired verification token.");
        },
      }
    );
  };

  // RESTRICTED: Standard input tracking. No code intercepts or automatic execution routines.
  const handleInputChange = (e) => {
    setOtp(e.target.value.replace(/\D/g, ""));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <AuthLayout
      title="Verify Login"
      subtitle={`A 6-digit code was sent to ${email || "your registered account"}`}
    >
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Email Address
          </label>
          <input
            disabled
            value={email}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-400 select-none cursor-not-allowed text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            OTP Code
          </label>
          <input
            type="text"
            maxLength={6}
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={verifyMutation.isPending || timeLeft === 0}
            value={otp}
            onChange={handleInputChange}
            placeholder="• • • • • •"
            className="w-full rounded-xl border border-slate-300 py-3 text-center text-2xl tracking-[0.5em] font-bold text-blue-600 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50/50 transition disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="text-center mt-4">
          {timeLeft > 0 ? (
            <span className="text-amber-700 text-xs font-semibold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 inline-block">
              ⏱ Code expires in {formatTime(timeLeft)}
            </span>
          ) : (
            <span className="text-red-700 text-xs font-semibold bg-red-50 px-3 py-1.5 rounded-full border border-red-200 inline-block">
              🚨 Code expired. Please return to login.
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={otp.length !== 6 || verifyMutation.isPending || timeLeft === 0}
          className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 shadow-sm"
        >
          {verifyMutation.isPending ? "Verifying..." : "Verify OTP"}
        </button>

        <button
          type="button"
          disabled={verifyMutation.isPending}
          onClick={() => navigate("/login")}
          className="w-full mt-4 text-slate-500 hover:text-slate-700 text-xs font-medium transition block text-center"
        >
          ← Back to Login
        </button>
      </form>
    </AuthLayout>
  );
}

export default LoginOtp;