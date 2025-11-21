import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import './Dashboard.css';

export default function AddTasks() {
    const [task, setTask] = useState({ title: '', description: '', deadline: '', assignTo: 'All Students' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setLoading(true);
        const toastId = toast.loading("Assigning Task...");

        try {
            await addDoc(collection(db, 'tasks'), {
                ...task,
                teacherId: auth.currentUser.uid,
                createdAt: serverTimestamp(),
                status: 'active'
            });
            toast.success("Task Assigned Successfully!", { id: toastId });
            setTask({ title: '', description: '', deadline: '', assignTo: 'All Students' });
        } catch (error) {
            toast.error("Error: " + error.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="content-section">
            <h2 className="content-title">Assign Task</h2>
            <p className="content-subtitle">Create new assignments for your class.</p>

            <div className="card" style={{ maxWidth: '600px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Task Title</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Data Structures Assignment 1" 
                            required 
                            value={task.title} 
                            onChange={e => setTask({...task, title: e.target.value})} 
                        />
                    </div>

                    <div className="input-group">
                        <label>Description</label>
                        <textarea 
                            rows="4" 
                            placeholder="Enter task details..." 
                            required 
                            value={task.description} 
                            onChange={e => setTask({...task, description: e.target.value})} 
                        />
                    </div>

                    <div className="input-group">
                        <label>Deadline</label>
                        <input 
                            type="datetime-local" 
                            required 
                            value={task.deadline} 
                            onChange={e => setTask({...task, deadline: e.target.value})} 
                        />
                    </div>

                    <div className="input-group">
                        <label>Assign To</label>
                        <select 
                            value={task.assignTo} 
                            onChange={e => setTask({...task, assignTo: e.target.value})}
                        >
                            <option>All Students</option>
                            <option>Specific Roll Numbers (Coming Soon)</option>
                        </select>
                    </div>

                    <button className="btn-primary" disabled={loading}>
                        {loading ? 'Assigning...' : 'Assign Task'}
                    </button>
                </form>
            </div>
        </div>
    );
}