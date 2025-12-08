import React, { useState } from 'react';
import { auth } from '../firebase'; 
import toast from 'react-hot-toast';

// REPLACE WITH YOUR RENDER BACKEND URL
const BACKEND_URL = "https://acadex-backend-n2wh.onrender.com"; 

const TwoFactorSetup = ({ user }) => {
    const [qrCode, setQrCode] = useState(null);
    const [code, setCode] = useState('');
    const [step, setStep] = useState(1); 

    const startSetup = async () => {
        const toastId = toast.loading("Generating Secure Key...");
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${BACKEND_URL}/setup2FA`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if(data.qrImage) {
                setQrCode(data.qrImage);
                setStep(2);
                toast.success("Scan the QR Code!", { id: toastId });
            }
        } catch (e) { toast.error("Setup Failed", { id: toastId }); }
    };

    const verifySetup = async () => {
        const toastId = toast.loading("Verifying...");
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${BACKEND_URL}/verify2FA`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ token: code, isLogin: false })
            });
            const data = await res.json();
            if (data.success) {
                setStep(3);
                toast.success("2FA Secured!", { id: toastId });
            } else {
                toast.error("Invalid Code", { id: toastId });
            }
        } catch (e) { toast.error("Error", { id: toastId }); }
    };

    if (user?.is2FAEnabled) return <div className="card" style={{borderLeft:'5px solid #10b981', padding:'20px'}}><h3>✅ 2FA Active</h3></div>;

    return (
        <div className="card">
            <h3>🛡️ Enable 2FA Security</h3>
            {step === 1 && <button className="btn-primary" onClick={startSetup}>Start Setup</button>}
            {step === 2 && (
                <div style={{textAlign:'center'}}>
                    <img src={qrCode} alt="QR" style={{border:'5px solid white', borderRadius:'10px', maxWidth:'200px'}} />
                    <p>Scan with Google Authenticator</p>
                    <input type="text" placeholder="123 456" value={code} onChange={e=>setCode(e.target.value)} style={{padding:'10px', fontSize:'18px', textAlign:'center', width:'100%', margin:'10px 0'}} />
                    <button className="btn-primary" onClick={verifySetup}>Verify & Activate</button>
                </div>
            )}
            {step === 3 && <h3 style={{color:'#10b981'}}>Success! Account Secured.</h3>}
        </div>
    );
};
export default TwoFactorSetup;