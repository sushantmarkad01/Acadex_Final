import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db, sendPasswordResetEmail } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast'; // ✅ Import Toast
import './Dashboard.css'; 

const BACKEND_URL = "https://acadex-backend-n2wh.onrender.com";

export default function SuperAdminDashboard() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "applications"), (snap) => {
            setApplications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // ✅ FIXED: Approval Logic with Toast
    const handleApproval = async (app) => {
        const toastId = toast.loading("Creating Admin Account...");
        
        try {
            // 1. Generate a random temporary password
            const tempPassword = Math.random().toString(36).slice(-8) + "Aa1@"; 
            
            // 2. Call Backend
            const response = await fetch(`${BACKEND_URL}/createUser`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: app.email,
                    password: tempPassword,
                    firstName: app.contactName,
                    lastName: "(Admin)",
                    role: 'institute-admin', // Matches backend role check
                    instituteName: app.instituteName,
                    instituteId: app.id // Use App ID as Institute ID
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Backend creation failed");
            }

            const data = await response.json();
            const newAdminUid = data.uid;

            // 3. Update Firestore Status
            await updateDoc(doc(db, "applications", app.id), { 
                status: 'approved', 
                adminUid: newAdminUid 
            });
            
            // 4. Send Password Reset Email
            await sendPasswordResetEmail(auth, app.email);
            
            toast.success(`Approved! Login email sent to ${app.email}`, { id: toastId });

        } catch (error) {
            console.error(error);
            toast.error("Approval Failed: " + error.message, { id: toastId });
        }
    };

    const handleDenial = async (appId) => {
        if(!window.confirm("Are you sure you want to deny this request?")) return;
        try {
            await updateDoc(doc(db, "applications", appId), { status: 'denied' });
            toast.success("Application Denied");
        } catch(e) { 
            toast.error("Error denying application");
        }
    };

    const handleSendLoginLink = async (email) => {
        const toastId = toast.loading("Sending email...");
        try { 
            await sendPasswordResetEmail(auth, email); 
            toast.success(`Login link sent to ${email}`, { id: toastId });
        } catch (e) { 
            toast.error("Failed to send email", { id: toastId });
        }
    };

    if (loading) return <div className="content-section"><p>Loading...</p></div>;

    return (
        <div className="dashboard-container">
            {/* ✅ Toast Container */}
            <Toaster position="top-center" reverseOrder={false} />

            {isMobileNavOpen && <div className="nav-overlay" onClick={() => setIsMobileNavOpen(false)}></div>}

            <aside className={`sidebar ${isMobileNavOpen ? 'open' : ''}`}>
                <div className="logo-container">
                    <img src="https://iili.io/KoAVeZg.md.png" alt="Logo" className="sidebar-logo"/>
                    <span className="logo-text">AcadeX</span>
                </div>
                <div className="teacher-info">
                    <h4>Super Admin</h4>
                    <p>Platform Manager</p>
                </div>
                <ul className="menu">
                    <li className="active" onClick={() => setIsMobileNavOpen(false)}>
                        <i className="fas fa-shield-alt" style={{width:'20px'}}></i> 
                        <span>Applications</span>
                    </li>
                </ul>
                <div className="sidebar-footer">
                    <button onClick={() => signOut(auth).then(() => navigate('/'))} className="logout-btn">
                        <i className="fas fa-sign-out-alt"></i><span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="mobile-header">
                    <button className="hamburger-btn" onClick={() => setIsMobileNavOpen(true)}>
                        <i className="fas fa-bars"></i>
                    </button>
                    <div className="mobile-brand">
                        <img src="https://iili.io/KoAVeZg.md.png" alt="Logo" className="mobile-logo-img" />
                        <span className="mobile-logo-text">AcadeX</span>
                    </div>
                    <div style={{width:'40px'}}></div>
                </header>

                <div className="content-section">
                    <div style={{marginBottom:'30px'}}>
                        <h2 className="content-title">Institute Applications</h2>
                        <p className="content-subtitle">Manage new institute registration requests.</p>
                    </div>

                    <div className="cards-grid">
                        <div className="card" style={{background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: 'none'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                <div className="icon-box-modern" style={{background:'white', color:'#2563eb'}}><i className="fas fa-building"></i></div>
                                <div><h3 style={{margin:0, color:'#1e3a8a'}}>Total Requests</h3><p style={{margin:0, fontSize:'32px', fontWeight:'800', color:'#1e40af'}}>{applications.length}</p></div>
                            </div>
                        </div>
                        <div className="card" style={{background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: 'none'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                <div className="icon-box-modern" style={{background:'white', color:'#d97706'}}><i className="fas fa-clock"></i></div>
                                <div><h3 style={{margin:0, color:'#92400e'}}>Pending</h3><p style={{margin:0, fontSize:'32px', fontWeight:'800', color:'#b45309'}}>{applications.filter(a => a.status === 'pending').length}</p></div>
                            </div>
                        </div>
                    </div>

                    <div className="card card-full-width" style={{marginTop:'30px'}}>
                        <div className="table-wrapper">
                            <table className="attendance-table">
                                <thead>
                                    <tr><th>Institute</th><th>Contact</th><th>Email</th><th>Status</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {applications.map(app => (
                                        <tr key={app.id}>
                                            <td style={{fontWeight:'600'}}>{app.instituteName}</td>
                                            <td>{app.contactName}</td>
                                            <td>{app.email}</td>
                                            <td><span className={`status-badge status-${app.status}`}>{app.status}</span></td>
                                            <td>
                                                <div style={{display:'flex', gap:'8px'}}>
                                                    {app.status === 'pending' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleApproval(app)} 
                                                                className="btn-action btn-action-approve"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDenial(app.id)} 
                                                                className="btn-action btn-action-deny"
                                                            >
                                                                Deny
                                                            </button>
                                                        </>
                                                    )}
                                                    {app.status === 'approved' && (
                                                        <button 
                                                            onClick={() => handleSendLoginLink(app.email)} 
                                                            className="btn-action btn-action-link"
                                                        >
                                                            Resend Link
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {applications.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:'30px'}}>No applications found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}