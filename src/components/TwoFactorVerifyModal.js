import React, { useState } from 'react';
import './TwoFactorVerifyModal.css';

const TwoFactorVerifyModal = ({ isOpen, onClose, onVerify, isLoading }) => {
    const [code, setCode] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (code.length === 6) {
            onVerify(code);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="tfa-verify-card">
                <div className="tfa-verify-icon">🔐</div>
                <h2>Security Check</h2>
                <p>Enter the 6-digit code from your Authenticator App to continue.</p>
                
                <form onSubmit={handleSubmit}>
                    <input 
                        type="text" 
                        className="verify-input"
                        placeholder="000 000"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                        autoFocus
                    />
                    
                    <div className="verify-actions">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-confirm" disabled={code.length !== 6 || isLoading}>
                            {isLoading ? 'Verifying...' : 'Verify'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TwoFactorVerifyModal;