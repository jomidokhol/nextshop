"use client";
import { useState, useEffect, useRef } from "react";
import { FaHeadset, FaPaperPlane, FaArrowLeft, FaUserShield } from "react-icons/fa";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef(null);

  // ইউজার অথেনটিকেশন চেক
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // মেসেজ লোড করা
  useEffect(() => {
    if (!user || !isOpen) return;

    const q = query(
      collection(db, "supportMessages"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => doc.data());
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    if (!user) {
        alert("দয়া করে লগইন করুন।");
        return;
    }

    try {
        await addDoc(collection(db, "supportMessages"), {
          userId: user.uid,
          userName: user.displayName || user.email,
          message: inputText,
          sender: 'user',
          timestamp: serverTimestamp()
        });
        setInputText("");
    } catch (error) {
        console.error("Error sending message:", error);
    }
  };

  return (
    <>
      {/* ফ্লোটিং বাটন */}
      <div 
        className="support-fab" 
        id="supportBtn"
        onClick={() => setIsOpen(true)}
      >
        <FaHeadset />
        <span className="chat-popover show">কোন সমস্যা ?</span>
      </div>

      {/* চ্যাট বক্স মডাল */}
      <div id="supportChatContainer" style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
        <div id="supportChatBox" className={isOpen ? 'open' : ''}>
            
            {/* হেডার */}
            <div className="chat-header">
                <FaArrowLeft className="close-chat-btn" onClick={() => setIsOpen(false)} />
                <div className="center">
                    <div>
                        <div>
                            <div className="pfp"><FaUserShield /></div>
                            <p id="pfpname">Support</p>
                        </div>
                        <p id="support-hours">9:00AM — 11:00PM</p>
                    </div>
                </div>
            </div>

            {/* মেসেজ এরিয়া */}
            <div className="chat-content-area">
                {messages.length === 0 && (
                    <p style={{textAlign:'center', color: '#ccc', marginTop: 'auto', marginBottom: 'auto'}}>
                        আপনার প্রশ্ন এখানে লিখুন
                    </p>
                )}
                
                {messages.map((msg, index) => (
                    <div key={index} className="msg-btn-holder">
                        <div className={`msg-btn ${msg.sender === 'user' ? 'sender-msg' : 'receiver-msg'}`}>
                            <p>{msg.message}</p>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* ফুটার (ইনপুট) */}
            <div className="chat-footer">
                <div>
                    <input 
                        placeholder="Message" 
                        className="text-box" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <div className="send-ico" onClick={sendMessage}>
                        <FaPaperPlane />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}
