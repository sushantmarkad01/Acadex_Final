import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import './Dashboard.css';

// ✅ Import Modals
import ResumeBuilderModal from '../components/ResumeBuilderModal';
import CodingChallengeModal from '../components/CodingChallengeModal';
import TypingTestModal from '../components/TypingTestModal';

const BACKEND_URL = "https://acadex-backend-n2wh.onrender.com";

// --- 1. ORIGINAL CONSTANTS (Preserved) ---
const ALL_ACTIVITIES = [
    { id: 1, title: 'Daily Coding Challenge', type: 'Coding', xp: 50, color: '#6366f1', icon: 'fa-laptop-code', tags: ['coding', 'tech'] },
    { id: 2, title: 'Debug a React Component', type: 'Coding', xp: 45, color: '#0ea5e9', icon: 'fa-bug', tags: ['frontend', 'react'] },
    { id: 3, title: 'SQL Query Optimization', type: 'Coding', xp: 35, color: '#3b82f6', icon: 'fa-database', tags: ['database'] },
    { id: 4, title: 'Circuit Design Logic', type: 'Puzzle', xp: 40, color: '#eab308', icon: 'fa-microchip', tags: ['electronics'] },
    { id: 5, title: 'Thermodynamics Quiz', type: 'Quiz', xp: 30, color: '#ef4444', icon: 'fa-fire', tags: ['mechanical'] },
    { id: 6, title: 'Anatomy Labeling', type: 'Quiz', xp: 30, color: '#ef4444', icon: 'fa-heartbeat', tags: ['medical'] },
    { id: 7, title: 'Medical Case Study', type: 'Reading', xp: 40, color: '#10b981', icon: 'fa-user-md', tags: ['medical'] },
    { id: 8, title: 'Periodic Table Speed Run', type: 'Game', xp: 25, color: '#8b5cf6', icon: 'fa-flask', tags: ['chemistry'] },
    { id: 19, title: 'Update Resume', type: 'Career', xp: 50, color: '#2563eb', icon: 'fa-file-alt', tags: ['career', 'job', 'universal'] },
    { id: 20, title: 'Speed Typing Test', type: 'Typing', xp: 20, color: '#f59e0b', icon: 'fa-keyboard', tags: ['productivity', 'universal'] },
];

export default function FreePeriodTasks({ user, isFreePeriod }) {
    const [activeTab, setActiveTab] = useState('assignments'); 
    
    useEffect(() => { 
        if (isFreePeriod) setActiveTab('gamified'); 
    }, [isFreePeriod]);

    // Data States
    const [assignments, setAssignments] = useState([]);
    const [submissions, setSubmissions] = useState({}); 
    const [recommendedTasks, setRecommendedTasks] = useState([]);
    
    // AI & Interactive States
    const [loading, setLoading] = useState(false);
    const [activeAiTask, setActiveAiTask] = useState(null); 
    
    // Verification & Modals
    const [submitModal, setSubmitModal] = useState({ open: false, taskId: null });
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

    // Stats State
    const [credits, setCredits] = useState(user?.xp || 0);
    
    useEffect(() => {
        if (user?.xp !== undefined) setCredits(user.xp);
    }, [user?.xp]);

    const cgpaBoost = (credits / 5000).toFixed(2);

    // --- 1. FETCH ASSIGNMENTS ---
    useEffect(() => {
        const fetchAssignments = async () => {
            if (!user) return;
            try {
                const res = await fetch(`${BACKEND_URL}/getAssignments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ department: user.department, year: user.year || 'All' })
                });
                const data = await res.json();
                setAssignments(data.tasks || []);
            } catch (err) { console.error(err); }
        };
        fetchAssignments();
    }, [user]);

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'submissions'), where('studentId', '==', auth.currentUser.uid));
        const unsub = onSnapshot(q, (snap) => {
            const subMap = {};
            snap.docs.forEach(doc => { 
                const data = doc.data(); 
                subMap[data.assignmentId] = data; 
            });
            setSubmissions(subMap);
        });
        return () => unsub();
    }, []);

    // --- 2. RECOMMENDATION LOGIC ---
    useEffect(() => {
        if (!user) return;
        const interestString = `${user.department || ''} ${user.domain || ''}`.toLowerCase();
        const strictMatches = ALL_ACTIVITIES.filter(task => {
            if (task.tags.includes('universal')) return true;
            return task.tags.some(tag => interestString.includes(tag));
        });
        setRecommendedTasks(strictMatches.slice(0, 8));
    }, [user]);

    // --- 3. TASK HANDLERS ---
    const startTask = async (task) => {
        if (task.title === 'Update Resume') { setIsResumeModalOpen(true); return; }
        
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/generatePersonalizedTasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userProfile: { 
                        domain: user.domain || "General", 
                        subDomain: user.subDomain || "Technology",
                        specificSkills: user.specificSkills || "General"
                    },
                    forceType: task.type 
                })
            });

            const data = await res.json();
            let generatedTask = data.tasks.find(t => t.type === task.type) || { type: 'Coding', title: task.title, content: { problemStatement: "Sample Problem", starterCode: "// Code here" }, xp: task.xp };
            setActiveAiTask(generatedTask);

        } catch (err) {
            toast.error("AI Busy, try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleAiTaskComplete = async (earnedCredits) => {
        setActiveAiTask(null);
        toast.success(`🎉 +${earnedCredits} XP Earned!`);
        if (auth.currentUser) {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, { xp: increment(earnedCredits) });
            setCredits(prev => prev + earnedCredits);
        }
    };

    const handleSubmitFile = async () => {
        if (!file || !submitModal.taskId) return toast.error("Please select a file.");
        if (file.size > 5 * 1024 * 1024) return toast.error("File is too large. Max 5MB.");

        setUploading(true);
        const toastId = toast.loading("Uploading & Submitting...");

        try {
            const formData = new FormData();
            formData.append('document', file); 
            formData.append('assignmentId', submitModal.taskId);
            formData.append('studentId', user.uid);
            formData.append('studentName', `${user.firstName} ${user.lastName}`);
            formData.append('rollNo', user.rollNo || 'N/A');

            const res = await fetch(`${BACKEND_URL}/submitAssignment`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error("Submission failed");

            toast.success("Assignment Submitted!", { id: toastId });
            
            const tempFileUrl = URL.createObjectURL(file);
            setSubmissions(prev => ({
                ...prev,
                [submitModal.taskId]: { 
                    status: 'Pending', 
                    submittedAt: new Date(),
                    documentUrl: tempFileUrl, 
                    fileName: file.name
                } 
            }));

            setSubmitModal({ open: false, taskId: null });
            setFile(null);

        } catch (error) {
            console.error(error);
            toast.error(error.message, { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="content-section">
            <div className="tasks-header">
                <div>
                    <h2 className="content-title">My Tasks</h2>
                    <p className="content-subtitle">Earn <span className="highlight-text">Academic Credits</span>.</p>
                </div>
                <div className="credits-display">
                    <div className="credits-count">{credits} <span>XP</span></div>
                    <div className="cgpa-pill">📈 +{cgpaBoost} Projected CGPA</div>
                </div>
            </div>
            
            <div className="glass-tabs">
                <button className={`glass-tab ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>
                    <i className="fas fa-book"></i> Assignments
                </button>
                <button className={`glass-tab ${activeTab === 'gamified' ? 'active' : ''}`} onClick={() => setActiveTab('gamified')}>
                    <i className="fas fa-rocket"></i> Quick Picks
                    {isFreePeriod && <span className="tab-badge pulse">LIVE</span>}
                </button>
            </div>

            {/* TAB 1: ASSIGNMENTS (UPDATED UI) */}
            {activeTab === 'assignments' && (
                <div className="tasks-grid">
                    <AnimatePresence>
                        {assignments.length > 0 ? assignments.map((task, index) => {
                            const sub = submissions[task.id]; 
                            const isSubmitted = !!sub; 
                            const isGraded = sub?.status === 'Graded';
                            
                            let statusText = 'Pending';
                            let statusClass = 'status-pending';
                            
                            if (isGraded) {
                                statusText = `${sub.marks}/100`;
                                statusClass = 'status-graded';
                            } else if (isSubmitted) {
                                statusText = 'Submitted';
                                statusClass = 'status-submitted';
                            }

                            return (
                                <motion.div 
                                    key={task.id} 
                                    className="task-card-modern"
                                    initial={{ opacity: 0, y: 20 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="card-header-row">
                                        <div className="task-icon-circle">
                                            <i className="fas fa-book-open"></i>
                                        </div>
                                        <span className={`modern-status-pill ${statusClass}`}>
                                            {statusText}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="modern-title">{task.title}</h3>
                                        <div className="modern-meta">
                                            <i className="far fa-calendar-alt"></i> 
                                            Due: {new Date(task.dueDate).toLocaleDateString()}
                                        </div>
                                        <p className="modern-desc">{task.description}</p>
                                    </div>
                                    
                                    <div className="action-area">
                                        {isGraded ? (
                                             <div className="submitted-area">
                                                <i className="fas fa-star"></i> Graded
                                                <div style={{marginTop:'5px', color:'#1e293b'}}>Feedback: "{sub.feedback}"</div>
                                             </div>
                                        ) : isSubmitted ? (
                                            <div className="submitted-area">
                                                <i className="fas fa-check-circle"></i> Submission Sent
                                                {sub.documentUrl && (
                                                    <a href={sub.documentUrl} target="_blank" rel="noreferrer" className="submitted-link">
                                                        View Document
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <button className="btn-upload-glow" onClick={() => setSubmitModal({ open: true, taskId: task.id })}>
                                                <i className="fas fa-cloud-upload-alt"></i> Upload PDF
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        }) : (
                            <div className="empty-state-glass"><h3>No Assignments</h3></div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* TAB 2: QUICK PICKS (Preserved) */}
            {activeTab === 'gamified' && (
                <div>
                    {isFreePeriod && (
                        <motion.div className="free-period-alert" initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
                            <div className="alert-icon"><i className="fas fa-bolt"></i></div>
                            <div className="alert-content">
                                <h3>Free Period Detected</h3>
                                <p>Time to boost your CGPA.</p>
                            </div>
                        </motion.div>
                    )}
                    <h3 className="section-heading">Quick Picks</h3>
                    <div className="tasks-grid">
                        {recommendedTasks.map((task, index) => (
                            <motion.div 
                                key={task.id} 
                                className="task-card-modern"
                                whileHover={{ y: -5 }} 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                            >
                                <div className="card-header-row">
                                    <div className="task-icon-circle" style={{background: `${task.color}15`, color: task.color}}>
                                        <i className={`fas ${task.icon}`}></i>
                                    </div>
                                    <span className="xp-badge">+{task.xp} XP</span>
                                </div>
                                <div>
                                    <h3 className="modern-title">{task.title}</h3>
                                    <div className="tags">
                                        {task.tags.slice(0,2).map(t => <span key={t} className="tiny-tag">#{t}</span>)}
                                    </div>
                                </div>
                                <button className="btn-modern-outline" style={{marginTop:'auto'}} onClick={() => startTask(task)} disabled={loading}>
                                    {loading ? '...' : 'Start Activity'}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}
            <AnimatePresence>
                {submitModal.open && (
                    <div className="custom-modal-overlay">
                        <motion.div className="custom-modal-box glass-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                            <div style={{textAlign:'center'}}>
                                <div className="task-icon-circle" style={{margin:'0 auto 20px auto', background:'#eff6ff', color:'#2563eb'}}>
                                    <i className="fas fa-file-upload"></i>
                                </div>
                                <h3 style={{fontSize:'22px', margin:'0 0 10px 0'}}>Submit Assignment</h3>
                                <p style={{color:'#64748b', marginBottom:'20px'}}>Upload your work for evaluation.</p>
                            </div>
                            
                            <div className="file-drop-zone" style={{position:'relative'}}>
                                <input 
                                    type="file" 
                                    accept=".pdf,.doc,.docx" 
                                    onChange={(e) => setFile(e.target.files[0])} 
                                    style={{opacity:0, position:'absolute', inset:0, cursor:'pointer'}} 
                                />
                                <i className="fas fa-cloud-upload-alt" style={{fontSize:'30px', marginBottom:'10px'}}></i>
                                <p>{file ? file.name : "Click to Browse or Drag File"}</p>
                            </div>

                            <div className="modal-actions" style={{marginTop:'25px'}}>
                                <button className="btn-modern-ghost" onClick={() => setSubmitModal({ open: false, taskId: null })}>Cancel</button>
                                <button className="btn-upload-glow" style={{width:'auto', padding:'10px 30px'}} onClick={handleSubmitFile} disabled={uploading}>
                                    {uploading ? 'Uploading...' : 'Submit Now'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ResumeBuilderModal isOpen={isResumeModalOpen} onClose={() => setIsResumeModalOpen(false)} user={user} />
            {activeAiTask?.type === 'Coding' && <CodingChallengeModal isOpen={true} task={activeAiTask} onClose={() => setActiveAiTask(null)} onComplete={handleAiTaskComplete} />}
            {activeAiTask?.type === 'Typing' && <TypingTestModal isOpen={true} task={activeAiTask} onClose={() => setActiveAiTask(null)} onComplete={handleAiTaskComplete} />}
        </div>
    );
}