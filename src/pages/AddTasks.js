import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import './Dashboard.css';

export default function AddTasks() {
    const [task, setTask] = useState({ title: '', description: '', link: '', deadline: '', assignTo: 'All Students' });
    const [myTasks, setMyTasks] = useState([]);
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    // 1. Fetch Teacher Info
    useEffect(() => {
        const fetchTeacherData = async () => {
            if (auth.currentUser) {
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    setTeacherInfo(userDoc.data());
                }
            }
        };
        fetchTeacherData();
    }, []);

    // 2. Fetch Recent Tasks
    useEffect(() => {
        if (auth.currentUser) {
            const q = query(
                collection(db, 'tasks'), 
                where('teacherId', '==', auth.currentUser.uid)
            );
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const tasksData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort by created time (newest first)
                tasksData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                setMyTasks(tasksData);
            });
            return () => unsubscribe();
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!teacherInfo) return toast.error("Teacher info not loaded.");
        
        setLoading(true);
        try {
            await addDoc(collection(db, 'tasks'), {
                ...task,
                teacherId: auth.currentUser.uid,
                teacherName: `${teacherInfo.firstName} ${teacherInfo.lastName}`,
                department: teacherInfo.department,
                instituteId: teacherInfo.instituteId,
                createdAt: serverTimestamp()
            });
            toast.success("Task Assigned!");
            setTask({ title: '', description: '', link: '', deadline: '', assignTo: 'All Students' });
        } catch (err) {
            console.error(err);
            toast.error("Failed to assign task.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if(window.confirm("Delete this task?")) {
            await deleteDoc(doc(db, 'tasks', id));
            toast.success("Task removed.");
        }
    };

    return (
        <div className="content-section">
            <h2 className="content-title">Task Management</h2>
            <p className="content-subtitle">Assign homework and projects to your students.</p>

            {/* --- LAYOUT CHANGE: Removed outer 'cards-grid' to allow vertical stacking --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                {/* CARD 1: Assign Task Form */}
                <div className="card">
                    <div style={{borderBottom:'1px solid #f1f5f9', paddingBottom:'15px', marginBottom:'20px'}}>
                        <h3 style={{margin:0, color:'#1e293b'}}>Assign New Task</h3>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Target Audience</label>
                            <select value={task.assignTo} onChange={e => setTask({...task, assignTo: e.target.value})}>
                                <option value="All Students">All Students</option>
                                <option value="FE">First Year (FE)</option>
                                <option value="SE">Second Year (SE)</option>
                                <option value="TE">Third Year (TE)</option>
                                <option value="BE">Final Year (BE)</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label>Task Title</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Complete Lab 3" 
                                value={task.title} 
                                onChange={e => setTask({...task, title: e.target.value})} 
                                required 
                            />
                        </div>

                        <div className="input-group">
                            <label>Description / Instructions</label>
                            <textarea 
                                className="modern-input" 
                                rows="3" 
                                placeholder="Details about the task..."
                                value={task.description}
                                onChange={e => setTask({...task, description: e.target.value})}
                                required 
                            ></textarea>
                        </div>

                        <div style={{display:'flex', gap:'15px', flexWrap:'wrap'}}>
                            <div className="input-group" style={{flex:1}}>
                                <label>Reference Link (Optional)</label>
                                <input 
                                    type="url" 
                                    placeholder="https://..." 
                                    value={task.link} 
                                    onChange={e => setTask({...task, link: e.target.value})} 
                                />
                            </div>
                            <div className="input-group" style={{flex:1}}>
                                <label>Deadline</label>
                                <input 
                                    type="date" 
                                    value={task.deadline} 
                                    onChange={e => setTask({...task, deadline: e.target.value})} 
                                    required 
                                />
                            </div>
                        </div>

                        <button className="btn-primary" disabled={loading}>
                            {loading ? 'Assigning...' : 'Assign Task'}
                        </button>
                    </form>
                </div>

                {/* CARD 2: Active Tasks List (Now separate below the form) */}
                <div>
                    <h3 style={{margin:'0 0 15px 0', color:'#334155'}}>My Active Tasks</h3>
                    
                    <div className="cards-grid">
                        {myTasks.length > 0 ? (
                            myTasks.map(t => (
                                <div key={t.id} className="card" style={{padding:'20px', borderLeft: '4px solid #3b82f6', position:'relative'}}>
                                    
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'10px'}}>
                                        <h4 style={{margin:0, fontSize:'16px', color:'#1e293b'}}>{t.title}</h4>
                                        <span className="status-badge-pill" style={{fontSize:'10px', background:'#eff6ff', color:'#2563eb'}}>
                                            {t.assignTo}
                                        </span>
                                    </div>

                                    <p style={{fontSize:'13px', color:'#64748b', margin:'0 0 15px 0', lineHeight:'1.5'}}>
                                        {t.description}
                                    </p>

                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid #f1f5f9', paddingTop:'12px'}}>
                                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                            <span style={{fontSize:'12px', color:'#94a3b8'}}>
                                                <i className="fas fa-calendar-alt" style={{marginRight:'5px'}}></i>
                                                {t.deadline}
                                            </span>
                                            {t.link && (
                                                <a href={t.link} target="_blank" rel="noreferrer" style={{fontSize:'12px', color:'#2563eb', textDecoration:'none'}}>
                                                    <i className="fas fa-link" style={{marginRight:'4px'}}></i> Link
                                                </a>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => handleDelete(t.id)} 
                                            style={{
                                                background: '#fee2e2', 
                                                color: '#ef4444', 
                                                border:'none', 
                                                borderRadius:'6px', 
                                                padding:'6px 10px', 
                                                cursor:'pointer'
                                            }}
                                            title="Delete Task"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="card" style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>
                                <i className="fas fa-clipboard-check" style={{fontSize:'30px', marginBottom:'10px', opacity:0.5}}></i>
                                <p>No active tasks found.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}