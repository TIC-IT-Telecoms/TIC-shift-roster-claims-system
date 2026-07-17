import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";

// ===== Lazy Loaded Pages =====

// Auth
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const LoginOtp = lazy(() => import("./pages/LoginOtp"));

// Employee Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const MyRoster = lazy(() => import("./pages/MyRoster"));
const MyClaims = lazy(() => import("./pages/MyClaims"));
const SubmitClaim = lazy(() => import("./pages/SubmitClaim"));
const MyPayroll = lazy(() => import("./pages/MyPayroll"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const MyApprovals = lazy(() => import("./pages/MyApprovals"));
const MyReports = lazy(() => import("./pages/MyReports"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Employees = lazy(() => import("./pages/Employees"));
const AddEmployee = lazy(() => import("./pages/AddEmployee"));
const Teams = lazy(() => import("./pages/Teams"));
const AddTeam = lazy(() => import("./pages/AddTeam"));
const Shifts = lazy(() => import("./pages/Shifts"));
const RotationCycles = lazy(() => import("./pages/RotationCycles"));
const AdminRosters = lazy(() => import("./pages/AdminRosters"));
const AdminClaims = lazy(() => import("./pages/AdminClaims"));
const AdminPayroll = lazy(() => import("./pages/AdminPayroll"));
const GeneratePayroll = lazy(() => import("./pages/GeneratePayroll"));
const Compliance = lazy(() => import("./pages/Compliance"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const Holidays = lazy(() => import("./pages/Holidays"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));

// ===== React Query =====
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
});

// ===== Loading Screen =====
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
  </div>
);

// ===== Protected Route =====
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuth, user } = useAuthStore();
  const role = user?.user?.user?.role;

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <Navigate
        to={role === "Admin" ? "/admin-dashboard" : "/dashboard"}
        replace
      />
    );
  }

  return children;
};

// ===== Root Redirect =====
const RootRedirect = () => {
  const { isAuth, user } = useAuthStore();

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={
        user?.user?.user?.role === "Admin"
          ? "/admin-dashboard"
          : "/dashboard"
      }
      replace
    />
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* ===== PUBLIC ROUTES ===== */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login-otp" element={<LoginOtp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ===== EMPLOYEE ROUTES ===== */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["Employee"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
                  <MyProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/roster"
              element={
                <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
                  <MyRoster />
                </ProtectedRoute>
              }
            />

            <Route
              path="/claims"
              element={
                <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
                  <MyClaims />
                </ProtectedRoute>
              }
            />

            <Route
              path="/submit-claim"
              element={
                <ProtectedRoute allowedRoles={["Employee"]}>
                  <SubmitClaim />
                </ProtectedRoute>
              }
            />

            <Route
              path="/payroll"
              element={
                <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
                  <MyPayroll />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
                  <Notifications />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/approvals"
              element={
                <ProtectedRoute allowedRoles={["Employee"]}>
                  <MyApprovals />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={["Employee"]}>
                  <MyReports />
                </ProtectedRoute>
              }
            />

            {/* ===== ADMIN ROUTES ===== */}

            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <Employees />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employees/add"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AddEmployee />
                </ProtectedRoute>
              }
            />

            <Route
              path="/teams"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <Teams />
                </ProtectedRoute>
              }
            />

            <Route
              path="/teams/add"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AddTeam />
                </ProtectedRoute>
              }
            />

            <Route
              path="/shifts"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <Shifts />
                </ProtectedRoute>
              }
            />

            <Route
              path="/rotation-cycles"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <RotationCycles />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-rosters"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AdminRosters />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-claims"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AdminClaims />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-payroll"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AdminPayroll />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-payroll/generate"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <GeneratePayroll />
                </ProtectedRoute>
              }
            />

            <Route
              path="/compliance"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <Compliance />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-reports"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AdminReports />
                </ProtectedRoute>
              }
            />

            <Route
              path="/holidays"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <Holidays />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-settings"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />

            {/* ===== 404 ===== */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;