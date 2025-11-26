import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast, { Toaster } from 'react-hot-toast';
import logo from "../assets/logo.png";
import './Dashboard.css';


// Component Imports
import FreePeriodTasks from './FreePeriodTasks';
import Profile from './Profile';
import AiChatbot from './AiChatbot';
import CareerRoadmap from './CareerRoadmap';
import Leaderboard from './Leaderboard';

const BACKEND_URL = "https://acadex-backend-n2wh.onrender.com";

// --- HELPER: Time Logic ---
const getCurrentTimeMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
};

const getMinutesFromTime = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

// --- COMPONENT: Leave Request Form & History ---
const LeaveRequestForm = ({ user }) => {
    const [form, setForm] = useState({ reason: '', fromDate: '', toDate: '' });
    const [loading, setLoading] = useState(false);
    const [myLeaves, setMyLeaves] = useState([]);

    useEffect(() => {
        if (!user.uid) return;
        const q = query(collection(db, 'leave_requests'), where('studentId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leavesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            leavesData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setMyLeaves(leavesData);
        });
        return () => unsubscribe();
    }, [user.uid]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading("Sending Request...");
        try {
            await fetch(`${BACKEND_URL}/requestLeave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    uid: user.uid, 
                    name: `${user.firstName} ${user.lastName}`, 
                    rollNo: user.rollNo, 
                    department: user.department,
                    instituteId: user.instituteId,
                    ...form 
                })
            });
            toast.success("Request sent to HOD!", { id: toastId });
            setForm({ reason: '', fromDate: '', toDate: '' });
        } catch (err) { toast.error("Failed to send.", { id: toastId }); }
        finally { setLoading(false); }
    };

    return (
        <div className="content-section">
            <h2 className="content-title">Request Leave</h2>
            <div className="card" style={{marginBottom: '30px'}}>
                <form onSubmit={handleSubmit}>
                    <div className="input-group"><label>Reason</label><input type="text" required value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. Sick Leave" /></div>
                    <div style={{display:'flex', gap:'15px'}}>
                        <div className="input-group" style={{flex:1}}><label>From</label><input type="date" required value={form.fromDate} onChange={e => setForm({...form, fromDate: e.target.value})} /></div>
                        <div className="input-group" style={{flex:1}}><label>To</label><input type="date" required value={form.toDate} onChange={e => setForm({...form, toDate: e.target.value})} /></div>
                    </div>
                    <button className="btn-primary" disabled={loading}>{loading ? 'Sending...' : 'Submit Request'}</button>
                </form>
            </div>
            <h3 style={{color:'#1e293b', margin:'0 0 15px 0', fontSize:'18px'}}>My Leave History</h3>
            <div className="cards-grid">
                {myLeaves.length > 0 ? (
                    myLeaves.map(leave => (
                        <div key={leave.id} className="card" style={{borderLeft: `5px solid ${leave.status === 'approved' ? '#10b981' : leave.status === 'rejected' ? '#ef4444' : '#f59e0b'}`, padding: '15px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                <div>
                                    <h4 style={{margin:'0 0 5px 0', fontSize:'16px'}}>{leave.reason}</h4>
                                    <p style={{margin:0, fontSize:'13px', color:'#64748b'}}>{new Date(leave.fromDate).toLocaleDateString()} ➔ {new Date(leave.toDate).toLocaleDateString()}</p>
                                </div>
                                <span className={`status-badge status-${leave.status}`} style={{textTransform: 'uppercase', fontSize:'11px', letterSpacing:'0.5px'}}>{leave.status}</span>
                            </div>
                        </div>
                    ))
                ) : <div className="card" style={{textAlign:'center', padding:'30px', color:'#94a3b8', fontStyle:'italic'}}>No leave history found.</div>}
            </div>
        </div>
    );
};

// --- COMPONENT: Notices View ---
const NoticesView = ({ notices }) => {
    return (
        <div className="content-section">
            <h2 className="content-title">Notice Board</h2>
            <p className="content-subtitle">Latest updates from your teachers & HOD.</p>
            
            <div className="cards-grid" style={{gridTemplateColumns:'1fr'}}>
                {notices.length > 0 ? notices.map(n => (
                    <div key={n.id} className="card" style={{borderLeft:'5px solid #2563eb', padding:'25px', position:'relative', overflow:'hidden'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <div className="icon-box-modern" style={{background:'#eff6ff', color:'#2563eb', width:'36px', height:'36px', fontSize:'16px'}}>
                                    <i className="fas fa-bullhorn"></i>
                                </div>
                                <h3 style={{margin:0, fontSize:'18px', color:'#1e3a8a'}}>{n.title}</h3>
                            </div>
                            <span style={{fontSize:'11px', fontWeight:'600', color:'#94a3b8', background:'#f1f5f9', padding:'4px 8px', borderRadius:'6px'}}>
                                {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() : 'Just now'}
                            </span>
                        </div>
                        <p style={{color:'#334155', fontSize:'14px', lineHeight:'1.6', marginBottom:'15px'}}>{n.message}</p>
                        <div style={{borderTop:'1px solid #f1f5f9', paddingTop:'10px', fontSize:'11px', color:'#64748b', display:'flex', justifyContent:'space-between'}}>
                            <span><strong>Posted by:</strong> {n.teacherName}</span>
                            <div style={{display:'flex', gap:'10px'}}>
                                <span className="status-badge-pill" style={{fontSize:'10px'}}>{n.targetYear === 'All' ? 'Everyone' : n.targetYear}</span>
                                <span>{n.department}</span>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="card" style={{textAlign:'center', padding:'40px'}}>
                        <div style={{fontSize:'40px', marginBottom:'10px'}}>📭</div>
                        <p style={{color:'#64748b'}}>No announcements for your class yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- COMPONENT: Smart Schedule Card ---
const SmartScheduleCard = ({ user, onOpenAI }) => {
    const [currentSlot, setCurrentSlot] = useState(null);
    const [statusMessage, setStatusMessage] = useState("Loading schedule...");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchedule = async () => {
            if (!user?.department || !user?.year) { setStatusMessage("Update profile to see schedule."); setLoading(false); return; }

            let sem = user.semester || (user.year === 'FE' ? '1' : user.year === 'SE' ? '3' : user.year === 'TE' ? '5' : '7');
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];

            if (today === 'Sunday') { setCurrentSlot({ type: 'Holiday', subject: 'Weekend! Relax.' }); setLoading(false); return; }

            try {
                const docSnap = await getDoc(doc(db, 'timetables', `${user.department}_Sem${sem}_${today}`));
                if (docSnap.exists()) {
                    const slots = docSnap.data().slots;
                    const now = getCurrentTimeMinutes();
                    const activeSlot = slots.find(slot => {
                        const start = getMinutesFromTime(slot.startTime);
                        const end = getMinutesFromTime(slot.endTime);
                        return now >= start && now < end;
                    });
                    setCurrentSlot(activeSlot || { type: 'Free', subject: 'No active class right now.' });
                } else { setCurrentSlot(null); setStatusMessage(`No timetable for ${today}.`); }
            } catch (error) { console.error(error); setStatusMessage("Error loading schedule."); } finally { setLoading(false); }
        };
        fetchSchedule();
        const interval = setInterval(fetchSchedule, 60000); 
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (currentSlot?.type === 'Free') {
            toast("🎉 It's a Free Period! Check your Tasks.", { icon: '☕', duration: 6000, style: { border: '1px solid #10b981', background: '#ecfdf5', color: '#064e3b' } });
        }
    }, [currentSlot?.type]);

    if (loading) return <div className="card" style={{padding:'20px', textAlign:'center', color:'#64748b'}}>{statusMessage}</div>;
    if (!currentSlot) return <div className="card" style={{padding:'20px', textAlign:'center'}}><h3 style={{margin:0, color:'#64748b'}}>No Schedule</h3><p style={{margin:'5px 0 0 0', fontSize:'13px', color:'#94a3b8'}}>{statusMessage}</p></div>;

    const isFree = currentSlot?.type === 'Free' || currentSlot?.type === 'Break' || currentSlot?.type === 'Holiday';
    return (
        <div className="card" style={{borderLeft: isFree ? '5px solid #10b981' : '5px solid #3b82f6', background: isFree ? 'linear-gradient(to right, #ecfdf5, white)' : 'white'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                    <h4 style={{margin:0, color: isFree ? '#059669' : '#2563eb', fontSize:'12px', textTransform:'uppercase', fontWeight:'bold'}}>{isFree ? "🟢 RIGHT NOW" : "🔴 LIVE CLASS"}</h4>
                    <h2 style={{margin:'5px 0 0 0', fontSize:'20px', color: '#1e293b', fontWeight:'700'}}>{currentSlot?.subject || "Free Period"}</h2>
                    <p style={{margin:'4px 0 0 0', fontSize:'13px', color:'#64748b'}}>{currentSlot?.startTime ? `${currentSlot.startTime} - ${currentSlot.endTime}` : "Enjoy your free time!"}</p>
                </div>
                {isFree && <button onClick={onOpenAI} className="btn-primary" style={{width:'auto', padding:'10px 16px', fontSize:'13px', marginTop: 0}}><i className="fas fa-robot" style={{marginRight:'8px'}}></i> Get Task</button>}
            </div>
        </div>
    );
};

// --- DASHBOARD HOME ---
const DashboardHome = ({ user, onOpenAI }) => {
    const [liveSession, setLiveSession] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [recentAttendance, setRecentAttendance] = useState([]);

    // 1. Fetch Active Session
    useEffect(() => {
        if (!user?.instituteId) return;
        const q = query(collection(db, "live_sessions"), where("isActive", "==", true), where("instituteId", "==", user.instituteId));
        const unsubscribe = onSnapshot(q, (snapshot) => setLiveSession(!snapshot.empty ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null));
        return () => unsubscribe();
    }, [user]);

    // 2. Fetch Recent Attendance
    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, "attendance"), where("studentId", "==", auth.currentUser.uid), orderBy("timestamp", "desc"), limit(3));
        const unsubscribe = onSnapshot(q, (snapshot) => setRecentAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate().toLocaleDateString() }))));
        return () => unsubscribe();
    }, [user]);

    // Scanner Logic
    const handleScan = (sessionId) => {
        toast.loading("Verifying...");
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const token = await auth.currentUser.getIdToken();
                const response = await fetch(`${BACKEND_URL}/markAttendance`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ sessionId, studentLocation: { latitude: position.coords.latitude, longitude: position.coords.longitude } })
                });
                const data = await response.json();
                toast.dismiss();
                if (response.ok) toast.success(data.message); else toast.error(data.error);
                setShowScanner(false);
            } catch (error) { toast.error(error.message); }
        });
    };

    useEffect(() => {
        let scanner;
        if (showScanner) {
            scanner = new Html5QrcodeScanner("qr-reader", { fps: 5, qrbox: { width: 250, height: 250 } });
            scanner.render((text) => { scanner.clear(); handleScan(text); }, console.warn);
        }
        return () => scanner?.clear();
    }, [showScanner]);

    return (
        <div className="content-section">
            <h2 className="content-title">Welcome, {user.firstName}!</h2>

            {/* Notice Card Removed */}

            <div className="cards-grid">
                <SmartScheduleCard user={user} onOpenAI={onOpenAI} />
                
                <div className="card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <div className="icon-box-modern"><i className="fas fa-qrcode"></i></div>
                        <h3 style={{ margin: 0, color: '#1e3a8a', fontWeight:'700' }}>Live Attendance</h3>
                    </div>
                    {liveSession ? (
                        <>
                            <div className="live-badge pulsate"><div className="dot"></div> <span>SESSION ACTIVE</span></div>
                            <p style={{fontWeight:'bold', margin:'10px 0'}}>{liveSession.subject}</p>
                            <button className="btn-modern-primary" onClick={() => setShowScanner(true)}>Scan Now</button>
                        </>
                    ) : <p style={{textAlign:'center', color:'#64748b'}}>No active sessions.</p>}
                </div>
                
                {showScanner && <div className="card scanner-card"><div id="qr-reader"></div><button className="btn-secondary" onClick={() => setShowScanner(false)}>Cancel</button></div>}

                <div className="card">
                    <h3>Recent History</h3>
                    <div className="recent-attendance-list">
                        {recentAttendance.map(item => (
                            <div key={item.id} className="history-card">
                                <div><p className="history-subject">{item.subject}</p><p className="history-date">{item.timestamp}</p></div>
                                <div className="status-badge-pill">Present</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ------------------------------
//  MAIN COMPONENT
// ------------------------------
export default function StudentDashboard() {
  const [activePage, setActivePage] = useState('dashboard');
  const [user, setUser] = useState(null);
  
  // ✅ Shared State
  const [notices, setNotices] = useState([]); 
  // Read count stored in LocalStorage to persist across refreshes (Permanent removal effect)
  const [readCount, setReadCount] = useState(() => {
      const saved = localStorage.getItem('seenNoticesCount');
      return saved ? parseInt(saved) : 0;
  });

  const isFirstLoad = useRef(true); 
  
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();

  // 1. Real-time User Listener
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (doc) => setUser(doc.data()));
    return () => unsub();
  }, []);

  // 2. ✅ Global Notice Listener (Badge Logic + Login Toast + Realtime Toast)
  useEffect(() => {
      if (!user?.instituteId) return;
      const q = query(collection(db, 'announcements'), where('instituteId', '==', user.instituteId));
      
      const unsub = onSnapshot(q, (snapshot) => {
          // A. Filter & Sort Data
          const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const relevant = all.filter(n => {
               const isDeptMatch = n.department === user.department || n.department === 'General';
               const isYearMatch = n.targetYear === 'All' || n.targetYear === user.year;
               return isDeptMatch && isYearMatch;
          });
          relevant.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          
          setNotices(relevant);

          // B. Handle Login Popups (First Load Only)
          if (isFirstLoad.current) {
              const unread = Math.max(0, relevant.length - readCount);
              if (unread > 0) {
                  // Show summary toast on login
                  toast(`You have ${unread} unread notices!`, {
                      icon: '📬',
                      style: { borderRadius: '10px', background: '#333', color: '#fff', border: '1px solid #555' },
                      duration: 5000
                  });
              }
          } 
          // C. Handle Real-time Popups (New announcements while online)
          else {
              snapshot.docChanges().forEach((change) => {
                  if (change.type === 'added') {
                      const n = change.doc.data();
                      const isDeptMatch = n.department === user.department || n.department === 'General';
                      const isYearMatch = n.targetYear === 'All' || n.targetYear === user.year;

                      if (isDeptMatch && isYearMatch) {
                          toast(`📢 New: ${n.title}`, {
                            icon: '🔔',
                            style: { borderRadius: '10px', background: '#333', color: '#fff', border: '1px solid #555' },
                            duration: 5000
                          });
                      }
                  }
              });
          }

          isFirstLoad.current = false;
      });
      return () => unsub();
  }, [user, readCount]);

  // ✅ 3. Clear Badge Permanently (Update Read Count)
  useEffect(() => {
      if (activePage === 'notices' && notices.length > readCount) {
          const newCount = notices.length;
          setReadCount(newCount);
          localStorage.setItem('seenNoticesCount', newCount.toString());
      }
  }, [activePage, notices, readCount]);

  // Badge Calculation: Total Relevant - Seen Count
  const badgeCount = Math.max(0, notices.length - readCount);

  const handleLogout = async () => { await signOut(auth); navigate('/'); };

  const renderContent = () => {
    if (!user) return <div style={{ textAlign: 'center', paddingTop: 50 }}>Loading...</div>;
    switch (activePage) {
      case 'dashboard': return <DashboardHome user={user} onOpenAI={() => setIsChatOpen(true)} />;
      case 'tasks': return <FreePeriodTasks user={user} />;
      case 'profile': return <Profile user={user} />;
      case 'plans': return <CareerRoadmap user={user} />; 
      case 'leaderboard': return <Leaderboard user={user} />;
      case 'leave': return <LeaveRequestForm user={user} />;
      case 'notices': return <NoticesView notices={notices} />;
      default: return <DashboardHome user={user} onOpenAI={() => setIsChatOpen(true)} />;
    }
  };

  const NavLink = ({ page, iconClass, label, count }) => (
    <li className={activePage === page ? 'active' : ''} onClick={() => {setActivePage(page); setIsMobileNavOpen(false);}}>
        <div style={{display:'flex', alignItems:'center', width:'100%'}}>
            <i className={`fas ${iconClass}`} style={{ width: '24px', textAlign: 'center' }}></i>
            <span>{label}</span>
            {/* ✅ Badge Logic */}
            {count > 0 && <span className="nav-badge" style={{
                background: '#ef4444', 
                color: 'white', 
                fontSize: '10px', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                marginLeft: 'auto',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
            }}>{count}</span>}
        </div>
    </li>
  );

  return (
    <div className="dashboard-container">
      <Toaster position="top-center" />
      {isMobileNavOpen && <div className="nav-overlay" onClick={() => setIsMobileNavOpen(false)} />}
      
      <aside className={`sidebar ${isMobileNavOpen ? 'open' : ''}`}>
        <div className="logo-container"><img src={logo} alt="AcadeX" className="sidebar-logo"/><span className="logo-text">Acadex</span></div>
        {user && (
            <div className="teacher-info" onClick={() => { setActivePage('profile'); setIsMobileNavOpen(false); }} style={{ cursor: 'pointer' }}>
                <h4>{user.firstName} {user.lastName}</h4>
                <p>Roll No: {user.rollNo}</p>
                <p style={{fontSize:'14px', color:'#059669', fontWeight:'700', margin:'4px 0'}}>
                    {user.xp || 0} XP 
                    {user.badges?.map(b => <span key={b} style={{marginLeft:'4px'}}>{b === 'novice' ? '🌱' : '🔥'}</span>)}
                </p>
                {user.year && <p style={{fontSize:'13px', color:'#2563eb', fontWeight:'600', margin:'2px 0'}}>Class: {user.year}</p>}
            </div>
        )}
        <ul className="menu">
            <NavLink page="dashboard" iconClass="fa-home" label="Dashboard" />
            <NavLink page="notices" iconClass="fa-bullhorn" label="Notice Board" count={badgeCount} />
            <NavLink page="tasks" iconClass="fa-check-circle" label="Free Period Tasks" />
            <NavLink page="leaderboard" iconClass="fa-trophy" label="Leaderboard" />
            <NavLink page="plans" iconClass="fa-paper-plane" label="Future Plans" />
            <NavLink page="leave" iconClass="fa-calendar-minus" label="Apply Leave" />
            <NavLink page="profile" iconClass="fa-user" label="Profile" />
        </ul>
        <div className="sidebar-footer"><button onClick={handleLogout} className="logout-btn"><i className="fas fa-sign-out-alt"></i> <span>Logout</span></button></div>
      </aside>

      <main className="main-content">
        <header className="mobile-header">
            <button className="hamburger-btn" onClick={() => setIsMobileNavOpen(true)}><i className="fas fa-bars"></i></button>
            <div className="mobile-brand"><img src={logo} alt="Logo" className="mobile-logo-img" /><span className="mobile-logo-text">AcadeX</span></div>
            <div style={{width:'40px'}}></div>
        </header>
        {renderContent()}
        {user && <AiChatbot user={user} isOpenProp={isChatOpen} onClose={() => setIsChatOpen(false)} />}
      </main>
    </div>
  );
}