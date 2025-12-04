import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

const BACKEND_URL = "https://acadex-backend-n2wh.onrender.com"; //

export default function SkillBoostDeck({ user }) {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mcqFlipped, setMcqFlipped] = useState(false);
    const [mcqResult, setMcqResult] = useState(null); // 'correct' or 'wrong'
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            // Check LocalStorage first to save API calls (1 set per day)
            const today = new Date().toDateString();
            const cached = localStorage.getItem('dailySkillCards');
            
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.date === today && parsed.user === user.uid) {
                    setCards(parsed.data);
                    setLoading(false);
                    return;
                }
            }

            const res = await fetch(`${BACKEND_URL}/generateSkillCards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    department: user.department || 'General',
                    semester: user.semester || '1',
                    careerGoal: user.careerGoal || 'Engineer'
                })
            });
            const data = await res.json();
            
            if (data.cards) {
                setCards(data.cards);
                localStorage.setItem('dailySkillCards', JSON.stringify({ date: today, user: user.uid, data: data.cards }));
            }
        } catch (err) {
            console.error(err);
            toast.error("Could not load skill cards.");
        } finally {
            setLoading(false);
        }
    };

    const handleMCQAnswer = (selectedOption, correctAnswer) => {
        if (mcqResult) return; // Prevent multiple clicks

        const isCorrect = selectedOption === correctAnswer;
        setMcqResult(isCorrect ? 'correct' : 'wrong');
        setMcqFlipped(true);

        if (isCorrect) {
            toast.success("Correct! +10 XP");
            awardXP(10);
        } else {
            toast.error("Oops! Check the explanation.");
        }
    };

    const awardXP = async (amount) => {
        if (!auth.currentUser) return;
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { xp: increment(amount) });
    };

    const markAllRead = async () => {
        setCompleted(true);
        toast.success("Knowledge Boosted! +20 XP");
        awardXP(20);
    };

    if (loading) return <div className="card" style={{padding:'20px', textAlign:'center', color:'#64748b'}}>⚡ Generating your Daily Skill Boost...</div>;
    if (cards.length === 0) return null;

    return (
        <div style={{ marginTop: '20px', marginBottom: '30px' }}>
             <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px'}}>
                <div className="icon-box-modern" style={{background:'#fef3c7', color:'#d97706'}}><i className="fas fa-bolt"></i></div>
                <h3 style={{margin:0, fontSize:'18px', color:'#92400e'}}>Free Time Skill Boost</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                
                {/* CARD 1: TECH TIP */}
                <div className="card" style={{ background: '#ecfdf5', borderLeft: '4px solid #10b981' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669', textTransform:'uppercase' }}>{cards[0].category}</span>
                    <p style={{ fontSize: '15px', color: '#064e3b', fontWeight: '500', marginTop: '8px' }}>{cards[0].content}</p>
                </div>

                {/* CARD 2: MCQ (FLIPPER) */}
                <div style={{ perspective: '1000px', height: '250px' }}>
                    <motion.div
                        initial={false}
                        animate={{ rotateY: mcqFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6, type: "spring" }}
                        style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d' }}
                    >
                        {/* FRONT */}
                        <div className="card" style={{ 
                            position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', 
                            display:'flex', flexDirection:'column', justifyContent:'space-between', borderLeft: '4px solid #3b82f6' 
                        }}>
                            <div>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb', textTransform:'uppercase' }}>{cards[1].category}</span>
                                <h4 style={{ fontSize: '14px', margin: '8px 0 12px 0' }}>{cards[1].question}</h4>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {cards[1].options.map((opt, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleMCQAnswer(opt, cards[1].correctAnswer)}
                                        className="btn-secondary" 
                                        style={{ fontSize: '11px', padding: '6px' }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* BACK */}
                        <div className="card" style={{ 
                            position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                            background: mcqResult === 'correct' ? '#f0fdf4' : '#fef2f2',
                            borderLeft: mcqResult === 'correct' ? '4px solid #22c55e' : '4px solid #ef4444',
                            display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center'
                        }}>
                             <div style={{ fontSize: '30px', marginBottom: '10px' }}>
                                {mcqResult === 'correct' ? '🎉' : '❌'}
                            </div>
                            <h4 style={{ margin: 0, color: mcqResult === 'correct' ? '#15803d' : '#b91c1c' }}>
                                {mcqResult === 'correct' ? 'Correct!' : 'Incorrect'}
                            </h4>
                            <p style={{ fontSize: '13px', color: '#374151', marginTop: '10px' }}>{cards[1].explanation}</p>
                        </div>
                    </motion.div>
                </div>

                {/* CARD 3: SOFT SKILL */}
                <div className="card" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b', display:'flex', flexDirection:'column' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#d97706', textTransform:'uppercase' }}>{cards[2].category}</span>
                    <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#92400e', marginTop: '10px', flex:1 }}>"{cards[2].content}"</p>
                    
                    {!completed ? (
                        <button onClick={markAllRead} className="btn-primary" style={{ marginTop: '15px', width: '100%', padding:'8px', fontSize:'13px' }}>
                            Claim XP ✅
                        </button>
                    ) : (
                        <div style={{textAlign:'center', marginTop:'15px', color:'#059669', fontSize:'12px', fontWeight:'bold'}}>
                            XP Claimed!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}