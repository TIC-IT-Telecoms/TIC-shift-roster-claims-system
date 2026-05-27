import { useState } from 'react';
import { useLogin } from '../hooks/useAuth.js';

const Login = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const login = useLogin();

  const handleSubmit = (e) => {
    e.preventDefault();
    login.mutate(form);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #eaf5ff, #ffffff)', fontFamily: "'Open Sans', sans-serif" }}
    >
      <div
        className="w-[360] bg-white rounded-2xl p-8 text-center"
        style={{ boxShadow: '0 10px 30px rgba(0, 95, 180, 0.15)' }}
      >
        {/* Logo */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-sm"
          style={{ background: '#006bd6' }}
        >
          NOC
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold m-0" style={{ color: '#005bbb' }}>
          NOC Roster & Claims
        </h2>

        <p className="text-sm mb-6 mt-1" style={{ color: '#667085' }}>
          Management System
        </p>

        {/* Error */}
        {login.isError && (
          <div
            className="mb-5 p-3 rounded-xl border text-sm text-left"
            style={{
              background: '#fee4e2',
              borderColor: '#fecaca',
              color: '#b42318',
            }}
          >
            {login.error?.message || 'Login failed. Please try again.'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="text-left space-y-4">
          {/* Email */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: '#344054' }}
            >
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              className="w-full px-3 py-3 rounded-lg text-sm outline-none transition"
              style={{
                border: '1px solid #d0d5dd',
                color: '#1d2939',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#006fd6')}
              onBlur={(e) => (e.target.style.borderColor = '#d0d5dd')}
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: '#344054' }}
            >
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full px-3 py-3 pr-10 rounded-lg text-sm outline-none transition"
                style={{
                  border: '1px solid #d0d5dd',
                  color: '#1d2939',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#006fd6')}
                onBlur={(e) => (e.target.style.borderColor = '#d0d5dd')}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#667085' }}
              >
                {showPassword ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label
              className="flex items-center gap-2 cursor-pointer"
              style={{ color: '#344054' }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded"
                style={{ accentColor: '#006fd6' }}
              />
              Remember me
            </label>

            <a
              href="#"
              className="text-sm font-semibold no-underline"
              style={{ color: '#006bd6' }}
            >
              Forgot Password?
            </a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={login.isPending}
            className="w-full py-3 rounded-lg text-white font-bold text-sm transition cursor-pointer border-none"
            style={{
              background: login.isPending ? '#cce3f8' : '#006bd6',
              cursor: login.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {login.isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-xs mt-6 mb-0" style={{ color: '#98a2b3' }}>
          © 2026 NOC Roster & Claims Management System
        </p>
      </div>
    </div>
  );
};

export default Login;