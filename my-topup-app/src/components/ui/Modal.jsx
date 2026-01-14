import React from 'react';

const Modal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const { title, message, imageUrl, buttonLink, buttonText } = data;

  // ব্যাকগ্রাউন্ড ইমেজ স্টাইল লজিক
  const backgroundStyle = imageUrl
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 50%), url('${imageUrl}')`,
      }
    : {};

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div 
        className="popup-container" 
        style={backgroundStyle}
      >
        {title && <div className="popup-title">{title}</div>}
        
        <div className="popup-content">
          <p className="popup-message-text">{message}</p>
          
          {buttonLink && (
            <a 
              href={buttonLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="click-here-btn"
            >
              {buttonText || "CLICK HERE!"}
            </a>
          )}
        </div>

        <div className="close-btn-container">
          <button className="close-btn" onClick={onClose}>
            <span className="close-icon"></span>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
