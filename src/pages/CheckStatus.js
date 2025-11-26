import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/logo.png";
import './Login.css'; 

// ✅ Animation Imports
import IOSPage from "../components/IOSPage";
import useIOSSound from "../hooks/useIOSSound";
import { motion } from "framer-motion";
import { buttonTap } from "../animations/interactionVariants";

const BACKEND_URL = "https://acadex-backend-n2wh.onrender.com"; // ✅ Use your Backend URL

export default function CheckStatus() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null); // Stores the backend response
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const playSound = useIOSSound();

  const handleCheckStatus = async (e) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    playSound('tap');

    if (!email) {
      setResult({ error: true, message: 'Please enter your email address.' });
      playSound('error');
      setLoading(false);
      return;
    }

    try {
      // ✅ Call Backend API instead of direct Firestore
      const response = await fetch(`${BACKEND_URL}/checkStatus`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
          throw new Error(data.error || "Failed to check status");
      }

      // ✅ Handle Response
      if (data.found) {
          playSound('success');
          setResult({ 
              success: true, 
              status: data.status, 
              message: data.message 
          });
      } else {
          playSound('error');
          setResult({ 
              success: false, 
              message: "No application found with this email." 
          });
      }

    } catch (error) {
      console.error(error);
      playSound('error');
      setResult({ error: true, message: "Server Error: Could not check status." });
    } finally {
      setLoading(false);
    }
  };

  // Helper for status colors
  const getStatusColor = (status) => {
      if (status === 'approved') return '#dcfce7'; // Green
      if (status === 'pending') return '#fef9c3'; // Yellow
      if (status === 'denied') return '#fee2e2'; // Red
      return '#f3f4f6'; // Grey
  };

  const getStatusTextColor = (status) => {
      if (status === 'approved') return '#166534';
      if (status === 'pending') return '#854d0e';
      if (status === 'denied') return '#991b1b';
      return '#374151';
  };

  return (
    <IOSPage>
      <div className="login-wrapper">
        <div className="login-container">
          <div className="login-header">
            <img className="login-logo" src={logo} alt="App Logo" />
            <h1>Check Application Status</h1>
            <p>Enter your email to track your request.</p>
          </div>

          <form className="login-form" onSubmit={handleCheckStatus}>
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            {/* ✅ Result Display */}
            {result && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ 
                        padding: '15px', 
                        borderRadius: '10px', 
                        textAlign: 'center', 
                        fontWeight: '600', 
                        marginBottom: '15px',
                        backgroundColor: result.success ? getStatusColor(result.status) : '#fee2e2',
                        color: result.success ? getStatusTextColor(result.status) : '#991b1b',
                        border: '1px solid rgba(0,0,0,0.05)'
                    }}
                >
                    {result.message}
                </motion.div>
            )}

            <motion.button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
                variants={buttonTap}
                whileTap="tap"
            >
                {loading ? 'Checking...' : 'Check Status'}
            </motion.button>
            
            <p style={{ marginTop: '15px', textAlign: 'center' }}>
              Back to{" "}
              <span style={{ color: "#075eec", cursor: "pointer", fontWeight:'600' }} onClick={() => { playSound('tap'); navigate("/"); }}>
                Sign In
              </span>
            </p>
          </form>
        </div>
      </div>
    </IOSPage>
  );
}