import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './Dashboard.css';
import ResumeBuilderModal from '../components/ResumeBuilderModal';
import CodingChallengeModal from '../components/CodingChallengeModal';

const BACKEND_URL = "https://acadex-backend-n2wh.onrender.com";

// ✅ 1. TRULY DIVERSE QUICK PICKS (Tech, Arts, Commerce, Science, etc.)
const ALL_ACTIVITIES = [
    // 💻 ENGINEERING & TECH
    { id: 1, title: 'Daily Coding Challenge', type: 'Coding', xp: 50, color: '#6366f1', icon: 'fa-laptop-code', tags: ['coding', 'computer science', 'tech'] },
    { id: 2, title: 'Debug a React Component', type: 'Coding', xp: 45, color: '#0ea5e9', icon: 'fa-bug', tags: ['frontend', 'react', 'tech'] },
    { id: 3, title: 'SQL Query Optimization', type: 'Coding', xp: 35, color: '#3b82f6', icon: 'fa-database', tags: ['database', 'backend', 'tech'] },
    { id: 4, title: 'Circuit Design Logic', type: 'Puzzle', xp: 40, color: '#eab308', icon: 'fa-microchip', tags: ['electronics', 'hardware', 'engineering'] },
    { id: 5, title: 'Thermodynamics Quiz', type: 'Quiz', xp: 30, color: '#ef4444', icon: 'fa-fire', tags: ['mechanical', 'physics', 'engineering'] },

    // 🏥 MEDICAL & SCIENCE
    { id: 6, title: 'Anatomy Labeling', type: 'Quiz', xp: 30, color: '#ef4444', icon: 'fa-heartbeat', tags: ['medical', 'biology', 'health'] },
    { id: 7, title: 'Medical Case Study', type: 'Reading', xp: 40, color: '#10b981', icon: 'fa-user-md', tags: ['medical', 'doctor', 'nursing'] },
    { id: 8, title: 'Periodic Table Speed Run', type: 'Game', xp: 25, color: '#8b5cf6', icon: 'fa-flask', tags: ['chemistry', 'science'] },
    { id: 9, title: 'Plant Identification', type: 'Puzzle', xp: 20, color: '#15803d', icon: 'fa-leaf', tags: ['biology', 'botany', 'agriculture'] },

    // 💰 COMMERCE & BUSINESS
    { id: 10, title: 'Stock Market Analysis', type: 'Analysis', xp: 35, color: '#10b981', icon: 'fa-chart-line', tags: ['finance', 'business', 'commerce'] },
    { id: 11, title: 'Create a Budget Plan', type: 'Finance', xp: 30, color: '#059669', icon: 'fa-wallet', tags: ['finance', 'accounting', 'commerce'] },
    { id: 12, title: 'Marketing Case Study', type: 'Reading', xp: 30, color: '#f97316', icon: 'fa-bullhorn', tags: ['marketing', 'business', 'mba'] },
    { id: 13, title: 'SWOT Analysis', type: 'Writing', xp: 25, color: '#3b82f6', icon: 'fa-project-diagram', tags: ['business', 'management'] },

    // 🎨 ARTS & HUMANITIES
    { id: 14, title: 'Sketch a Logo', type: 'Creative', xp: 30, color: '#db2777', icon: 'fa-pen-nib', tags: ['design', 'arts', 'creative'] },
    { id: 15, title: 'Color Theory Basics', type: 'Reading', xp: 20, color: '#be185d', icon: 'fa-palette', tags: ['design', 'arts', 'fashion'] },
    { id: 16, title: 'Write a Haiku', type: 'Writing', xp: 15, color: '#d946ef', icon: 'fa-feather-alt', tags: ['literature', 'english', 'arts'] },
    { id: 17, title: 'Historical Trivia', type: 'Quiz', xp: 20, color: '#b45309', icon: 'fa-landmark', tags: ['history', 'humanities'] },
    { id: 18, title: 'Legal Case Review', type: 'Reading', xp: 40, color: '#1e293b', icon: 'fa-gavel', tags: ['law', 'legal'] },

    // 🚀 UNIVERSAL / PRODUCTIVITY (Fallback for everyone)
    { id: 19, title: 'Update Resume', type: 'Career', xp: 50, color: '#2563eb', icon: 'fa-file-alt', tags: ['career', 'job', 'universal'] },
    { id: 20, title: 'Speed Typing Test', type: 'Typing', xp: 20, color: '#f59e0b', icon: 'fa-keyboard', tags: ['productivity', 'universal'] },
    { id: 21, title: 'Mental Math Drill', type: 'Drill', xp: 15, color: '#06b6d4', icon: 'fa-calculator', tags: ['math', 'universal'] },
    { id: 22, title: 'Learn 5 New Words', type: 'Skill', xp: 10, color: '#f43f5e', icon: 'fa-spell-check', tags: ['vocabulary', 'universal'] },
    { id: 23, title: '2-Min Desk Stretch', type: 'Health', xp: 10, color: '#84cc16', icon: 'fa-child', tags: ['health', 'universal'] },
    { id: 24, title: 'Sudoku Challenge', type: 'Brain', xp: 25, color: '#7c3aed', icon: 'fa-puzzle-piece', tags: ['logic', 'universal'] },
    { id: 25, title: 'Draft Cover Letter', type: 'Writing', xp: 35, color: '#0ea5e9', icon: 'fa-envelope', tags: ['career', 'universal'] }
];

export default function FreePeriodTasks({ user, isFreePeriod }) {
    const [activeTab, setActiveTab] = useState('assignments'); 
    
    // Auto-switch to Quick Picks if Free Period Detected
    useEffect(() => { 
        if (isFreePeriod) setActiveTab('gamified'); 
    }, [isFreePeriod]);

    // Data States
    const [assignments, setAssignments] = useState([]);
    const [submissions, setSubmissions] = useState({}); 
    const [recommendedTasks, setRecommendedTasks] = useState([]);
    
    // AI & Interactive States
    const [activeModal, setActiveModal] = useState(null); 
    const [taskData, setTaskData] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [aiTask, setAiTask] = useState(null);
    const [loadingAi, setLoadingAi] = useState(false);
    
    // Verification & Modals
    const [verifyModal, setVerifyModal] = useState({ open: false, task: null });
    const [proofText, setProofText] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [submitModal, setSubmitModal] = useState({ open: false, taskId: null });
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    
    const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
    const [isCodingModalOpen, setIsCodingModalOpen] = useState(false);
    const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

    // Interactive Inputs
    const [quizAnswer, setQuizAnswer] = useState(null);
    const [userCode, setUserCode] = useState("");
    const [typingInput, setTypingInput] = useState("");
    const [typingStartTime, setTypingStartTime] = useState(null);

    // Stats State
    const [credits, setCredits] = useState(user?.xp || 0);
    
    // Sync local credits if user prop updates from DB
    useEffect(() => {
        if (user?.xp !== undefined) {
            setCredits(user.xp);
        }
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
            snap.docs.forEach(doc => { const data = doc.data(); subMap[data.assignmentId] = data; });
            setSubmissions(subMap);
        });
        return () => unsub();
    }, []);

    // --- 2. SMART INTEREST FILTER ---
    useEffect(() => {
        if (!user) return;
        
        // Construct a search string from the user's profile
        // Includes: Department, Domain, SubDomain, Skills
        const interestString = `${user.department || ''} ${user.domain || ''} ${user.subDomain || ''} ${user.specificSkills || ''}`.toLowerCase();
        
        // 1. Strict Filter: Only show tasks that match the user's interest OR are 'universal'
        const strictMatches = ALL_ACTIVITIES.filter(task => {
            // Always include universal tasks (Productivity, Resume, etc.)
            if (task.tags.includes('universal')) return true;
            
            // Check if any of the task's tags exist in the user's interest string
            // Example: "biology" tag matches "medical biology" interest
            return task.tags.some(tag => interestString.includes(tag));
        });

        // 2. Prioritize Strict Matches (Relevant tasks first)
        const relevant = strictMatches.filter(t => !t.tags.includes('universal'));
        const universal = strictMatches.filter(t => t.tags.includes('universal'));
        
        // Combine: Relevant First, then Universal fallback
        let finalDisplay = [...relevant, ...universal];

        // 3. Fallback: If list is too short, fill with more universal tasks
        if (finalDisplay.length < 6) {
            const moreUniversal = ALL_ACTIVITIES.filter(t => t.tags.includes('universal') && !finalDisplay.includes(t));
            finalDisplay = [...finalDisplay, ...moreUniversal];
        }

        // Limit to 8 cards to keep UI clean
        setRecommendedTasks(finalDisplay.slice(0, 8));
    }, [user]);

    // --- 3. INTERACTIVE TASK HANDLERS ---
    const startTask = async (taskTitle, taskType) => {
        // Handle External Tools/Modals
        if (taskTitle === 'Update Resume') { setIsResumeModalOpen(true); return; }
        if (taskType === 'Coding' && taskTitle.includes('Daily')) { setIsCodingModalOpen(true); return; }
        
        // Map Task Type to AI Engine
        let engineType = 'Reading'; // Default engine (Quizzes, Articles, Case Studies)
        if (taskType === 'Coding') engineType = 'Coding';
        if (taskType === 'Typing') engineType = 'Typing';
        
        setLoading(true);
        setActiveModal(engineType);
        setTaskData(null);
        setQuizAnswer(null);
        setUserCode("");
        setTypingInput("");
        setTypingStartTime(null);

        try {
            const res = await fetch(`${BACKEND_URL}/startInteractiveTask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskType: engineType, userInterest: taskTitle })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setTaskData(data);
        } catch (err) {
            toast.error("AI Busy: " + err.message);
            setActiveModal(null);
        } finally {
            setLoading(false);
        }
    };

    const submitTask = async () => {
        if (!taskData) return;
        setLoading(true);
        
        let submission = {};
        if (activeModal === 'Reading') {
            if (quizAnswer === null) { toast.error("Select an answer!"); setLoading(false); return; }
            submission = { answerIndex: quizAnswer };
        } 
        else if (activeModal === 'Coding') {
            if (userCode.length < 10) { toast.error("Write code!"); setLoading(false); return; }
            submission = { code: userCode };
        }
        else if (activeModal === 'Typing') {
            const words = typingInput.trim().split(/\s+/).length;
            const timeMins = (Date.now() - typingStartTime) / 60000;
            const wpm = Math.round(words / timeMins) || 0;
            submission = { wpm, accuracy: 100 };
        }

        try {
            const res = await fetch(`${BACKEND_URL}/submitInteractiveTask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid, taskType: activeModal, submission, context: taskData })
            });
            const result = await res.json();
            
            if (result.passed) {
                toast.success(`🎉 ${result.feedback} (+${result.credits} Credits)`);
                setActiveModal(null);
                setCredits(prev => prev + result.credits); 
            } else {
                toast.error(`❌ ${result.feedback}`);
            }
        } catch (err) { toast.error("Submission failed"); } 
        finally { setLoading(false); }
    };

    const generateDeepAiTask = async () => {
        setLoadingAi(true);
        const toastId = toast.loading("Designing Challenge...");
        try {
            const res = await fetch(`${BACKEND_URL}/generateDeepTask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userProfile: user }) 
            });
            const data = await res.json();
            if (res.ok && data.task) { setAiTask(data.task); toast.success("Ready!", { id: toastId }); }
            else { throw new Error("Failed"); }
        } catch (error) { toast.error("AI Busy", { id: toastId }); }
        finally { setLoadingAi(false); }
    };

    const handleTyping = (e) => {
        if (!typingStartTime) setTypingStartTime(Date.now());
        setTypingInput(e.target.value);
    };

    const handleVerifySubmit = async () => {
        if (proofText.length < 15) return toast.error("Proof too short.");
        setVerifying(true);
        try {
            const res = await fetch(`${BACKEND_URL}/verifyQuickTask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    uid: user.uid, 
                    taskTitle: verifyModal.task.title || verifyModal.task.taskTitle,
                    taskType: verifyModal.task.type || "Custom",
                    xpReward: verifyModal.task.xp || verifyModal.task.xpReward || 30,
                    proofText 
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                setVerifyModal({ open: false, task: null });
                setProofText('');
                if (aiTask) setAiTask(null);
            } else { toast.error(data.error); }
        } catch (err) { toast.error("Error"); }
        finally { setVerifying(false); }
    };

    const openVerifyModal = (task) => {
        if (task.title.includes('Typing')) window.open('https://monkeytype.com', '_blank');
        if (task.title.includes('Sudoku')) window.open('https://sudoku.com', '_blank');
        setVerifyModal({ open: true, task });
    };

    const handleSubmitFile = async () => {
        if (!file) return toast.error("Select PDF");
        setUploading(true);
        const formData = new FormData();
        formData.append('studentId', user.uid);
        formData.append('studentName', `${user.firstName} ${user.lastName}`);
        formData.append('rollNo', user.rollNo);
        formData.append('assignmentId', submitModal.taskId);
        formData.append('document', file);
        try {
            await fetch(`${BACKEND_URL}/submitAssignment`, { method: 'POST', body: formData });
            toast.success("Submitted!");
            setSubmitModal({ open: false, taskId: null });
            setFile(null);
        } catch (e) { toast.error("Upload failed"); }
        finally { setUploading(false); }
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

            {/* TAB 1: ASSIGNMENTS */}
            {activeTab === 'assignments' && (
                <div className="tasks-grid">
                    {assignments.length > 0 ? assignments.map((task, index) => {
                         const sub = submissions[task.id]; 
                         const isGraded = sub?.status === 'Graded';
                         return (
                            <motion.div key={task.id} className="task-card modern-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                                <div className="card-top">
                                    <div className="icon-square" style={{ background: '#e0f2fe', color: '#0284c7' }}><i className="fas fa-book-open"></i></div>
                                    <span className={`status-pill ${sub ? (isGraded ? 'graded' : 'submitted') : 'pending'}`}>
                                        {sub ? (isGraded ? `${sub.marks}/100` : 'Submitted') : 'Pending'}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <h3>{task.title}</h3>
                                    <p>{task.description}</p>
                                    <small><i className="far fa-clock"></i> Due: {new Date(task.dueDate).toLocaleDateString()}</small>
                                </div>
                                {!sub && <button className="btn-modern-primary" onClick={() => setSubmitModal({ open: true, taskId: task.id })}>Upload PDF</button>}
                            </motion.div>
                        );
                    }) : (
                        <div className="empty-state-glass"><h3>No Assignments</h3></div>
                    )}
                </div>
            )}

            {/* TAB 2: CURRICULUM & QUICK PICKS */}
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

                    {/* AI Generator Hero Card */}
                    {!aiTask && (
                        <motion.div className="ai-hero-card" onClick={generateDeepAiTask} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                            <div className="ai-content">
                                <div className="ai-icon-circle">{loadingAi ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-magic"></i>}</div>
                                <div>
                                    <h3>{loadingAi ? "AI is Thinking..." : "Generate Deep Challenge"}</h3>
                                    <p>Personalized for <strong>{user.domain || "Your Profile"}</strong></p>
                                </div>
                            </div>
                            <div className="ai-arrow"><i className="fas fa-arrow-right"></i></div>
                        </motion.div>
                    )}

                    {/* AI Generated Task Display */}
                    <AnimatePresence>
                        {aiTask && (
                            <motion.div className="ai-task-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <div className="panel-header">
                                    <span className="difficulty-badge">{aiTask.difficulty}</span>
                                    <h2>{aiTask.taskTitle}</h2>
                                    <button onClick={() => setAiTask(null)} className="close-panel-btn">✖</button>
                                </div>
                                <div className="panel-body">
                                    <h4>Mission:</h4>
                                    <ul>{aiTask.instructions?.map((step, i) => <li key={i}>{step}</li>)}</ul>
                                </div>
                                <div className="panel-footer">
                                    <div className="rewards"><i className="fas fa-star"></i> {aiTask.xpReward} Credits</div>
                                    <button className="btn-modern-primary" onClick={() => openVerifyModal(aiTask)}>Verify Work</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Quick Picks Grid */}
                    <h3 className="section-heading">Quick Picks</h3>
                    <div className="tasks-grid">
                        {recommendedTasks.map((task, index) => (
                            <motion.div key={task.id} className="task-card modern-card" whileHover={{ y: -5 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }}>
                                <div className="card-top">
                                    <div className="icon-square" style={{ background: `${task.color}15`, color: task.color }}>
                                        <i className={`fas ${task.icon}`}></i>
                                    </div>
                                    <span className="xp-pill">+{task.xp} XP</span>
                                </div>
                                <div className="card-body">
                                    <h3>{task.title}</h3>
                                    <div className="tags">
                                        {task.tags.slice(0,2).map(t => <span key={t} className="tiny-tag">#{t}</span>)}
                                    </div>
                                    <p className="time-est"><i className="far fa-clock"></i> {task.time}</p>
                                </div>
                                <button className="btn-modern-outline" onClick={() => startTask(task.title, task.type)}>
                                    Start
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* INTERACTIVE MODAL */}
            {activeModal && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box glass-modal" style={{maxWidth:'600px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                            <h3>{activeModal} Challenge</h3>
                            <button onClick={() => setActiveModal(null)} style={{border:'none', background:'transparent'}}>✖</button>
                        </div>

                        {loading && !taskData ? (
                            <div style={{textAlign:'center', padding:'40px'}}>
                                <i className="fas fa-circle-notch fa-spin" style={{fontSize:'30px', color:'#2563eb'}}></i>
                                <p>AI is generating your challenge...</p>
                            </div>
                        ) : (
                            taskData && (
                                <div>
                                    {/* 1. READING MODE */}
                                    {activeModal === 'Reading' && (
                                        <>
                                            <div className="reading-box">
                                                <h4>Read Carefully:</h4>
                                                <p>{taskData.content}</p>
                                            </div>
                                            <div style={{marginTop:'15px'}}>
                                                <strong>Q: {taskData.question}</strong>
                                                <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'10px'}}>
                                                    {taskData.options.map((opt, i) => (
                                                        <button key={i} onClick={() => setQuizAnswer(i)}
                                                            className={`option-btn ${quizAnswer === i ? 'selected' : ''}`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* 2. CODING MODE */}
                                    {activeModal === 'Coding' && (
                                        <>
                                            <div className="reading-box">
                                                <strong>Problem: {taskData.problemName}</strong>
                                                <p>{taskData.description}</p>
                                            </div>
                                            <textarea 
                                                value={userCode}
                                                onChange={e => setUserCode(e.target.value)}
                                                placeholder={taskData.starterCode || "// Solution..."}
                                                className="code-editor"
                                            />
                                        </>
                                    )}

                                    {/* 3. TYPING MODE */}
                                    {activeModal === 'Typing' && (
                                        <>
                                            <p style={{color:'#64748b', marginBottom:'10px'}}>Type this exactly:</p>
                                            <div className="typing-target">{taskData.textToType}</div>
                                            <textarea 
                                                value={typingInput}
                                                onChange={handleTyping}
                                                placeholder="Start typing..."
                                                className={`typing-input ${typingInput === taskData.textToType ? 'correct' : ''}`}
                                            />
                                        </>
                                    )}

                                    <button className="btn-modern-primary" style={{marginTop:'20px'}} onClick={submitTask} disabled={loading}>
                                        {loading ? 'Verifying...' : 'Submit & Claim Credits'}
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Verification Modal */}
            {verifyModal.open && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box glass-modal">
                        <h3>Verify: {verifyModal.task?.title}</h3>
                        <p style={{fontSize:'13px', color:'#64748b', marginBottom:'15px'}}>To ensure quality, please provide proof of work.</p>
                        <textarea 
                            rows="5" 
                            placeholder="Paste summary or code here..." 
                            value={proofText}
                            onChange={(e) => setProofText(e.target.value)}
                            className="modern-textarea"
                        />
                        <div className="modal-actions">
                            <button className="btn-modern-ghost" onClick={() => setVerifyModal({ open: false, task: null })}>Cancel</button>
                            <button className="btn-modern-primary" onClick={handleVerifySubmit} disabled={verifying}>
                                {verifying ? 'Verifying...' : 'Submit Proof'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Upload Modal */}
            {submitModal.open && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box glass-modal">
                        <h3>Submit Assignment</h3>
                        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
                        <div className="modal-actions">
                            <button className="btn-modern-ghost" onClick={() => setSubmitModal({ open: false, taskId: null })}>Cancel</button>
                            <button className="btn-modern-primary" onClick={handleSubmitFile} disabled={uploading}>Submit</button>
                        </div>
                    </div>
                </div>
            )}
            
            <ResumeBuilderModal isOpen={isResumeModalOpen} onClose={() => setIsResumeModalOpen(false)} user={user} />
            <CodingChallengeModal isOpen={isCodingModalOpen} onClose={() => setIsCodingModalOpen(false)} user={user} />
        </div>
    );
}