"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaWallet, FaUserCircle } from "react-icons/fa"; // আইকনের জন্য

export default function Header() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // ১. ইউজার অথেনটিকেশন চেক
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // ২. ইউজারের ওয়ালেট ব্যালেন্স এবং ছবি আনা
        const unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (doc) => {
          setUserData(doc.data());
        });
        return () => unsubUser();
      } else {
        setUserData(null);
      }
    });

    // ৩. অনলাইন স্ট্যাটাস চেক (অ্যাডমিন প্যানেল থেকে নিয়ন্ত্রিত)
    const unsubStatus = onSnapshot(doc(db, "settings", "onlineStatus"), (doc) => {
      if (doc.exists()) {
        setIsOnline(doc.data().isOnline);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubStatus();
    };
  }, []);

  return (
    <header className="header">
      <div className="header-brand">
        <img 
          src="https://i.ibb.co/74CkxSP/avatar.png" 
          alt="Logo" 
          className="header-logo" 
        />
        <h1 className="header-title">Vercel Top Up</h1>
      </div>
      
      <div className="header-right-icons">
        {/* ওয়ালেট ব্যালেন্স - শুধুমাত্র লগইন থাকলে দেখাবে */}
        {user && (
          <Link href="/add-money" id="headerWalletDisplay" style={{ display: 'flex' }}>
            <FaWallet style={{ color: 'var(--primary-purple)' }} />
            <span id="headerWalletBalance">
              ৳ {userData?.walletBalance ? parseFloat(userData.walletBalance).toFixed(2) : "0.00"}
            </span>
          </Link>
        )}

        {/* প্রোফাইল আইকন */}
        <div className="profile-wrapper">
          {user ? (
            <Link href="/profile">
              <img 
                src={userData?.photoURL || user.photoURL || "https://i.ibb.co/74CkxSP/avatar.png"} 
                alt="Avatar" 
                className="profile-avatar" 
              />
            </Link>
          ) : (
            <Link href="/login">
              <FaUserCircle style={{ fontSize: '38px', color: 'var(--secondary-text-color)' }} />
            </Link>
          )}
          
          {/* অনলাইন/অফলাইন ডট */}
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
        </div>
      </div>
    </header>
  );
}
