import React from "react";

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-white px-4  border-r-8 border-blue-600">
      <div className="w-80 bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,95,180,0.15)] p-8">
        
        {/* Logo */}
        <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center mx-auto mb-4">
          NOC
        </div>

        {/* Header */}
        <h2 className="text-center text-2xl font-bold text-blue-700">
          {title}
        </h2>

        <p className="text-center text-sm text-slate-500 mt-2 mb-6">
          {subtitle}
        </p>

        {children}

        <p className="text-center text-[11px] text-slate-400 mt-8 pt-4">
          © {new Date().getFullYear()} NOC Roster &amp; Claims Management System
        </p>
      </div>
    </div>
  );
}

export default AuthLayout;