import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import AuthLayout from "../components/AuthLayout";
import { authApi } from "../api/authApi";

const OTP_DURATION = 300;

function LoginOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(OTP_DURATION);
  const [error, setError] = useState("");

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const verifyMutation = useMutation({
    mutationFn: () =>
      authApi.verifyLoginOtp({
        email,
        otp,
      }),

    onSuccess: () => {
      navigate("/dashboard");
    },

    onError: (err) => {
      setError(err.message || "Invalid OTP.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyMutation.mutate();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <AuthLayout
      title="Verify Login"
      subtitle={`A 6-digit code was sent to ${email}`}
    >
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Email
          </label>

          <input
            disabled
            value={email}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            OTP Code
          </label>

          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) =>
              setOtp(
                e.target.value.replace(/\D/g, "")
              )
            }
            placeholder="• • • • • •"
            className="w-full rounded-xl border border-slate-300 py-3 text-center text-2xl tracking-[0.5em] font-bold text-blue-700"
          />
        </div>

        <div className="text-center mt-4">
          <span className="text-amber-700 text-sm font-semibold">
            ⏱ OTP expires in {formatTime(timeLeft)}
          </span>
        </div>

        <button
          type="submit"
          disabled={otp.length !== 6}
          className="w-full mt-5 bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          Verify OTP
        </button>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full mt-3 text-slate-500 text-sm"
        >
          ← Back to Login
        </button>
      </form>
    </AuthLayout>
  );
}

export default LoginOtp;