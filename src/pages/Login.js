import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../assets/logo.png";
import { signInWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast"; 

// ✅ Animation Imports
import IOSPage from "../components/IOSPage";
import useIOSSound from "../hooks/useIOSSound";
import { motion } from "framer-motion";
import { buttonTap } from "../animations/interactionVariants";

// ✅ Import the New Modal
import TwoFactorVerifyModal from "../components/TwoFactorVerifyModal";

const BACKEND_URL = "https://acadex-backend-n2wh.onrender.com";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // 🔐 2FA State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [tempUser, setTempUser] = useState(null); // Stores user while verifying
  const [verifying2FA, setVerifying2FA] = useState(false);

  const navigate = useNavigate();
  const playSound = useIOSSound(); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- 1. HANDLE LOGIN (Initial Step) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    playSound('tap');
    setError("");

    if (!form.email || !form.password) {
      playSound('error');
      setError("❌ Please enter both your email and password.");
      return;
    }

    try {
      // Login with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;

      // 🚨 Super Admin Bypass
      if (user.email === "scheduplan1@gmail.com") {
          playSound('success');
          navigate('/super-admin');
          return;
      }

      // Check Database for 2FA
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) throw new Error("User profile not found.");
      
      const userData = userDoc.data();

      if (userData.is2FAEnabled) {
          // 🛑 STOP! Show Custom 2FA Modal
          setTempUser(user); // Save user for step 2
          setShow2FAModal(true); // Open Modal
          return;
      }

      // No 2FA? Proceed to Dashboard
      proceedToDashboard(userData);

    } catch (error) {
      handleLoginError(error);
    }
  };

  // --- 2. HANDLE 2FA VERIFICATION (Step 2) ---
  const onVerify2FA = async (code) => {
      setVerifying2FA(true);
      try {
          const token = await tempUser.getIdToken();
          
          const verifyRes = await fetch(`${BACKEND_URL}/verify2FA`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({ token: code, isLogin: true })
          });

          const verifyData = await verifyRes.json();
          
          if (!verifyData.success) {
              playSound('error');
              toast.error("❌ Invalid Code");
              setVerifying2FA(false);
              return; 
          }

          // ✅ Success!
          toast.success("Identity Verified!");
          setShow2FAModal(false);
          
          // Fetch role again to redirect
          const userDoc = await getDoc(doc(db, "users", tempUser.uid));
          proceedToDashboard(userDoc.data());

      } catch (error) {
          console.error(error);
          toast.error("Verification Error");
          setVerifying2FA(false);
      }
  };

  // --- HELPER: Redirect based on Role ---
  const proceedToDashboard = (userData) => {
      playSound('success');
      if (userData.role === 'student') navigate('/student-dashboard');
      else if (userData.role === 'teacher') navigate('/teacher-dashboard');
      else if (userData.role === 'institute-admin') navigate('/admin-dashboard'); 
      else if (userData.role === 'super-admin') navigate('/super-admin');
      else navigate('/dashboard');
  };

  const handleLoginError = (error) => {
      playSound('error');
      let errorMessage = "❌ Login Failed.";
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
         errorMessage = "❌ Invalid credentials.";
      } 
      setError(errorMessage);
  };

  // Handle Google Login (Optional: Add 2FA logic here if needed too)
  const handleGoogleSignIn = async () => {
    playSound('tap');
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      
      const userDoc = await getDoc(doc(db, "users", res.user.uid));
      if (userDoc.exists()) proceedToDashboard(userDoc.data());
      else navigate("/dashboard"); 
      
    } catch (error) {
      playSound('error');
      setError(`❌ Google Sign-In Error: ${error.message}`);
    }
  };

  if (checkingAuth) return null;

  return (
    <IOSPage>
      {/* ✅ RENDER 2FA MODAL */}
      <TwoFactorVerifyModal 
          isOpen={show2FAModal} 
          isLoading={verifying2FA}
          onClose={() => { setShow2FAModal(false); auth.signOut(); }} // Logout if they cancel
          onVerify={onVerify2FA}
      />

      <div className="login-wrapper">
        <div className="login-container">
          <div className="login-header">
            <img className="login-logo" src={logo} alt="App Logo" />
            <h1>Sign in to <span className="highlight">AcadeX</span></h1>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="********"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <motion.button 
              type="submit" 
              className="btn-primary"
              variants={buttonTap}
              whileTap="tap"
            >
              Sign In
            </motion.button>
            
            <div className="separator">OR</div>

            <motion.button 
              type="button" 
              onClick={handleGoogleSignIn} 
              className="btn-google"
              variants={buttonTap}
              whileTap="tap"
            >
              <i className="fab fa-google"></i> Sign in with Google
            </motion.button>

            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
              Want to use AcadeX for your institute?{" "}
              <span
                style={{ color: "#2563eb", cursor: "pointer", fontWeight: "600" }}
                onClick={() => { playSound('tap'); navigate("/apply"); }}
              >
                Apply here
              </span>
            </p>

            <p style={{ marginTop: '10px', textAlign: 'center', fontSize: '14px' }}>
              Are you a student?{" "}
              <span
                style={{ color: "#2563eb", cursor: "pointer", fontWeight: "600" }}
                onClick={() => { playSound('tap'); navigate("/student-register"); }}
              >
                Register with Institute Code
              </span>
            </p>
          </form>
        </div>
      </div>
    </IOSPage>
  );
}