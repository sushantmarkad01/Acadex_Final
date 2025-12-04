import React, { useState, useRef, useEffect } from 'react';
import './AiChatbot.css';

// ✅ Backend URL
const API_URL = "https://acadex-backend-n2wh.onrender.com"; 

export default function AiChatbot({ user, isOpenProp, onClose }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Core State
    const [activeTopic, setActiveTopic] = useState(null);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    
    // Quiz State
    const [quizMode, setQuizMode] = useState(false);
    const [activeQuiz, setActiveQuiz] = useState(null); 
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [score, setScore] = useState(0);
    const [quizFinished, setQuizFinished] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const chatWindowRef = useRef(null);
    const fabRef = useRef(null);

    // 1. Initialize & Open
    useEffect(() => {
        if (isOpenProp) setIsOpen(true);
        if (messages.length === 0) {
            resetChat();
        }
    }, [isOpenProp]);

    // 2. Click Outside to Close
    useEffect(() => {
        function handleClickOutside(event) {
            if (isOpen && 
                chatWindowRef.current && !chatWindowRef.current.contains(event.target) &&
                fabRef.current && !fabRef.current.contains(event.target)) {
                
                if (!event.target.closest('.quiz-overlay-backdrop')) {
                    setIsOpen(false);
                    if (onClose) onClose();
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    // 3. Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, quizMode]);

    const resetChat = () => {
        setActiveTopic(null);
        setMessages([{ 
            sender: 'bot', 
            text: `Hey ${user.firstName}! 👋\nI'm your AcadeX Coach.\n\n**Type a topic to start!**` 
        }]);
    };

    // --- Core Chat Logic ---

    const handleSend = async () => {
        if (!input.trim()) return;
        const textToSend = input;
        setInput('');
        setShowActionsMenu(false); 

        addMessage('user', textToSend);

        if (!activeTopic) {
            await handleSetTopic(textToSend);
        } else {
            await processMessage(textToSend);
        }
    };

    const addMessage = (sender, text) => {
        setMessages(prev => [...prev, { sender, text }]);
    };

    const handleSetTopic = async (topic) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/storeTopic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, topic: topic })
            });
            if (!res.ok) throw new Error("Failed");

            setActiveTopic(topic);
            // ✅ Updated Message to point to the (+) button
            addMessage('bot', `✅ **Topic Locked: ${topic}**\n\nTap the **(+)** button to generate Notes or Quizzes!`);

        } catch (err) {
            addMessage('bot', "⚠️ Error setting topic.");
        } finally {
            setLoading(false);
        }
    };

    // --- Action Menu Logic ---

    const handleActionClick = async (type) => {
        setShowActionsMenu(false);
        if (!activeTopic) return;
        
        setLoading(true);
        try {
            const endpoint = type === 'notes' ? '/notes' : '/quiz';
            const res = await fetch(`${API_URL}${endpoint}?userId=${user.uid}`);
            const data = await res.json();

            if (!res.ok) throw new Error("Failed");

            if (type === 'notes') {
                addMessage('bot', data.note.content);
            } else if (type === 'quiz') {
                // START QUIZ MODE
                setActiveQuiz(data.quiz);
                startQuizMode(data.quiz);
            }
        } catch (err) {
            addMessage('bot', "⚠️ Error fetching content.");
        } finally {
            setLoading(false);
        }
    };

    // --- Quiz Logic ---

    const startQuizMode = (quizData) => {
        setQuizMode(true);
        setQuizFinished(false);
        setCurrentQuestionIndex(0);
        setScore(0);
        setSelectedOption(null);
        setShowExplanation(false);
        setIsMaximized(true); 
    };

    const handleOptionSelect = (optionIndex, correctIndex) => {
        if (selectedOption !== null) return; 
        
        setSelectedOption(optionIndex);
        setShowExplanation(true);

        if (optionIndex === correctIndex) {
            setScore(prev => prev + 1);
        }
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < activeQuiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowExplanation(false);
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        setQuizFinished(true);
        try {
             fetch(`${API_URL}/quizAttempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    quizId: activeQuiz.hash || 'unknown',
                    score: (score / activeQuiz.questions.length) * 100,
                    answers: [] 
                })
            });
        } catch(e) { console.error(e); }
    };

    const exitQuiz = () => {
        setQuizMode(false);
        setActiveQuiz(null);
        setIsMaximized(false); 
        addMessage('bot', `🏁 **Quiz Results**\nYou scored ${score} points!`);
    };

    const processMessage = async (text) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, userContext: user })
            });
            const data = await res.json();
            addMessage('bot', data.reply);
        } catch (err) {
            addMessage('bot', "⚠️ Connection error.");
        } finally {
            setLoading(false);
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (isOpen && onClose) onClose();
    };

    const toggleMaximize = (e) => {
        e.stopPropagation();
        setIsMaximized(!isMaximized);
    };

    // Renderer
    const renderMessage = (text) => {
        if (!text) return null;
        let cleanText = text.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
        return cleanText.split('\n').map((line, index) => {
            const parts = line.split(/(\*\*.*?\*\*)/g); 
            return (
                <div key={index} style={{ minHeight: '1.4em', marginBottom: '4px', lineHeight: '1.5' }}>
                    {parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i} className="md-bold">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </div>
            );
        });
    };

    return (
        <>
            {/* FAB */}
            {!isOpen && (
                <div className="ai-fab" onClick={toggleChat} ref={fabRef}>
                    <i className="fas fa-robot"></i>
                </div>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className={`ai-chat-window ${isMaximized ? 'maximized' : ''}`} ref={chatWindowRef}>
                    
                    {/* Header */}
                    <div className="ai-modern-header">
                        <div className="header-left">
                            <div className="brand-icon">
                                <i className="fas fa-brain"></i>
                            </div>
                            <div className="brand-text">
                                <h3>AcadeX AI</h3>
                                <span className="status-indicator">
                                    <span className="dot"></span> Online
                                </span>
                            </div>
                        </div>
                        <div className="header-controls">
                            <button className="icon-btn" onClick={toggleMaximize}>
                                <i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'}`}></i>
                            </button>
                            <button className="icon-btn close" onClick={toggleChat}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    {/* CONTENT AREA */}
                    <div className="ai-content-wrapper">
                        
                        {/* 1. Normal Chat View */}
                        {!quizMode && (
                            <>
                                <div className="ai-messages-area">
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`chat-bubble ${msg.sender}`}>
                                            {renderMessage(msg.text)}
                                        </div>
                                    ))}
                                    {loading && (
                                        <div className="chat-bubble bot loading">
                                            <div className="dot-flashing"></div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area (WhatsApp Style) */}
                                <div className="ai-input-wrapper">
                                    {/* Action Menu (Popup) */}
                                    {showActionsMenu && (
                                        <div className="action-menu-popup">
                                            <button onClick={() => handleActionClick('notes')}>
                                                <i className="fas fa-sticky-note"></i> Revision Notes
                                            </button>
                                            <button onClick={() => handleActionClick('quiz')}>
                                                <i className="fas fa-graduation-cap"></i> Take Quiz
                                            </button>
                                        </div>
                                    )}

                                    <div className="whatsapp-input-bar">
                                        {/* Plus Button */}
                                        <button 
                                            className={`plus-btn ${activeTopic ? 'active' : ''}`}
                                            onClick={() => activeTopic && setShowActionsMenu(!showActionsMenu)}
                                            disabled={!activeTopic}
                                        >
                                            <i className={`fas ${showActionsMenu ? 'fa-times' : 'fa-plus'}`}></i>
                                        </button>

                                        {/* Text Input */}
                                        <input 
                                            type="text" 
                                            className="chat-input-field"
                                            placeholder={activeTopic ? "Ask anything..." : "Enter topic..."} 
                                            value={input} 
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                            disabled={loading}
                                        />

                                        {/* Send Button */}
                                        <button 
                                            className={`send-btn ${input.trim() ? 'active' : ''}`} 
                                            onClick={handleSend} 
                                            disabled={loading || !input.trim()}
                                        >
                                            <i className="fas fa-paper-plane"></i>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* 2. QUIZ MODE (Reference Style) */}
                        {quizMode && activeQuiz && (
                            <div className="quiz-overlay-backdrop">
                                <div className="quiz-card-container">
                                    
                                    {/* Top Bar: Progress & Exit */}
                                    <div className="quiz-card-topbar">
                                        <button onClick={exitQuiz} className="quiz-exit-icon">
                                            <i className="fas fa-arrow-left"></i>
                                        </button>
                                        
                                        <div className="quiz-progress-wrapper">
                                            <div className="quiz-progress-bar">
                                                <div 
                                                    className="quiz-progress-fill" 
                                                    style={{ width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="quiz-progress-text">
                                                {currentQuestionIndex + 1}/{activeQuiz.questions.length}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quiz Content */}
                                    {!quizFinished ? (
                                        <div className="quiz-content-scroll">
                                            <h2 className="quiz-question-text">
                                                {activeQuiz.questions[currentQuestionIndex].question}
                                            </h2>

                                            <div className="quiz-options-vertical">
                                                {activeQuiz.questions[currentQuestionIndex].options.map((opt, idx) => {
                                                    let statusClass = "";
                                                    if (selectedOption !== null) {
                                                        if (idx === activeQuiz.questions[currentQuestionIndex].correctIndex) statusClass = "correct";
                                                        else if (idx === selectedOption) statusClass = "wrong";
                                                        else statusClass = "disabled";
                                                    }

                                                    return (
                                                        <button 
                                                            key={idx} 
                                                            className={`quiz-option-card ${statusClass}`}
                                                            onClick={() => handleOptionSelect(idx, activeQuiz.questions[currentQuestionIndex].correctIndex)}
                                                            disabled={selectedOption !== null}
                                                        >
                                                            <div className="opt-indicator">
                                                                {['A','B','C','D'][idx]}
                                                            </div>
                                                            <span className="opt-text-val">{opt}</span>
                                                            {statusClass === 'correct' && <i className="fas fa-check-circle status-icon"></i>}
                                                            {statusClass === 'wrong' && <i className="fas fa-times-circle status-icon"></i>}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Explanation */}
                                            {showExplanation && (
                                                <div className="quiz-explanation-box">
                                                    <h4>Explanation:</h4>
                                                    <p>{activeQuiz.questions[currentQuestionIndex].explanation}</p>
                                                </div>
                                            )}

                                            {/* Next Button (Bottom of Scroll) */}
                                            {showExplanation && (
                                                <button className="quiz-next-fab" onClick={nextQuestion}>
                                                    {currentQuestionIndex < activeQuiz.questions.length - 1 ? 'Next' : 'Finish'} <i className="fas fa-arrow-right"></i>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        // Result View
                                        <div className="quiz-result-view">
                                            <div className="result-emoji">🏆</div>
                                            <h2>Quiz Completed!</h2>
                                            <div className="result-score-box">
                                                <span className="score-val">{score}</span>
                                                <span className="score-total">/ {activeQuiz.questions.length}</span>
                                            </div>
                                            <p>Topic: {activeTopic}</p>
                                            <button className="quiz-home-btn" onClick={exitQuiz}>
                                                Back to Chat
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </>
    );
}