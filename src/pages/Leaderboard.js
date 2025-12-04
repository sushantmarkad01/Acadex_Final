import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import './Dashboard.css';

const BADGE_ICONS = {
  'novice': '🌱',
  'enthusiast': '🔥',
  'expert': '💎',
  'master': '👑'
};

export default function Leaderboard({ user }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user?.instituteId || !user?.department) return;

      try {
        // Query: Students in same Dept, sorted by XP
        const q = query(
          collection(db, 'users'),
          where('instituteId', '==', user.instituteId),
          where('department', '==', user.department),
          where('role', '==', 'student'),
          orderBy('xp', 'desc'),
          limit(10)
        );

        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeaders(data);
      } catch (err) {
        console.error("Leaderboard Error:", err);
        setLeaders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user]);

  // Helper to get Rank Icon based on index
  const getRankIcon = (index) => {
    if (index === 0) return <span className="lb-rank rank-1">🥇</span>;
    if (index === 1) return <span className="lb-rank rank-2">🥈</span>;
    if (index === 2) return <span className="lb-rank rank-3">🥉</span>;
    return <span className="lb-rank">#{index + 1}</span>;
  };

  return (
    <div className="leaderboard-container">
      
      {/* 🏆 Modern Header Card */}
      <div className="leaderboard-header">
        <p className="lb-title">Your Total XP</p>
        <h1 className="lb-score">{user.xp || 0}</h1>
        <p className="lb-subtitle">Department: {user.department}</p>
      </div>

      <h3 style={{ margin: '0 0 15px 5px', color: '#334155', fontSize: '16px', fontWeight: '700' }}>
        Top Performers
      </h3>

      {loading ? (
        <div className="lb-loading">Loading rankings...</div>
      ) : (
        <div className="lb-list">
          {leaders.map((student, index) => {
            const isMe = student.uid === user.uid; // Check if it's the current user
            
            return (
              <div 
                key={student.id} 
                className={`lb-item ${isMe ? 'is-me' : ''}`}
              >
                {/* 1. Rank Icon */}
                {getRankIcon(index)}

                {/* 2. User Details */}
                <div className="lb-info">
                  <div className="lb-name">
                    {student.firstName} {student.lastName}
                    
                    {/* Badges */}
                    {student.badges && student.badges.map(b => (
                      <span key={b} style={{fontSize: '12px', marginLeft: '4px'}}>{BADGE_ICONS[b]}</span>
                    ))}
                    
                    {/* (You) Tag */}
                    {isMe && <span style={{fontSize:'10px', color:'#a855f7', marginLeft:'4px', fontWeight:'700'}}>(You)</span>}
                  </div>
                  
                  <div className="lb-roll">
                    Roll No: {student.rollNo || '-'}
                  </div>
                </div>

                {/* 3. XP Pill */}
                <div className="lb-xp">
                  {student.xp || 0} XP
                </div>
              </div>
            );
          })}

          {leaders.length === 0 && (
            <div className="lb-loading">
              <i className="fas fa-trophy" style={{ fontSize: '24px', marginBottom: '10px', display:'block', opacity: 0.5 }}></i>
              No ranked students yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}