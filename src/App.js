import React, { Suspense, lazy, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from 'react-hot-toast';
import IOSSplashScreen from "./components/IOSSplashScreen";
import logo from "./assets/logo.png"; 

// ✅ Import the Skeleton Component (Make sure you created this from the previous step)
import DashboardSkeleton from "./components/DashboardSkeleton";

// Lazy load components
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const StudentRegister = lazy(() => import("./pages/StudentRegister"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Attendance = lazy(() => import("./pages/Attendance"));
const FreeTime = lazy(() => import("./pages/FreeTime"));
const Goals = lazy(() => import("./pages/Goals"));
const InstituteApplication = lazy(() => import("./pages/InstituteApplication"));
const CheckStatus = lazy(() => import("./pages/CheckStatus"));

function App() {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(true);

  // 1. Show App Logo Splash Screen FIRST
  if (showSplash) {
    return (
      <IOSSplashScreen 
        logoSrc={logo} 
        onComplete={() => setShowSplash(false)} 
      />
    );
  }

  return (
    // 2. After Splash, show the Skeleton while the actual page loads (Replaces "Loading..." text)
    <Suspense fallback={<DashboardSkeleton />}>
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* mode="wait" ensures the old page slides out before the new one slides in */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/apply" element={<InstituteApplication />} />
          <Route path="/check-status" element={<CheckStatus />} />
          <Route path="/student-register" element={<StudentRegister />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/free-time" element={<FreeTime />} />
          <Route path="/goals" element={<Goals />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default App;