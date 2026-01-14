"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { 
  FaWallet, 
  FaReceipt, 
  FaHeart, 
  FaCogs, 
  FaSignOutAlt 
} from "react-icons/fa";

export default function ProfilePage() {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({
    name: "Loading...",
    profileId: "...",
    photoURL: "https://i.ibb.co/74CkxSP/avatar.png"
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 1. Theme Management (Load on mount)
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    // Default to dark mode if nothing is stored
    if (storedTheme === "dark-mode" || !storedTheme) {
      setIsDarkMode(true);
      document.body.classList.add("dark-mode");
    } else {
      setIsDarkMode(false);
      document.body.classList.remove("dark-mode");
    }
  }, []);

  // Theme Toggle Handler
  const handleThemeToggle = (e) => {
    const isChecked = e.target.checked;
    setIsDarkMode(isChecked);
    
    if (isChecked) {
      document.body.classList.remove("light-mode");
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
      localStorage.setItem("theme", "light-mode");
    }
  };

  // 2. Auth & Data Fetching
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Firestore Listener
        const unsubscribeDb = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              name: data.name || currentUser.displayName || "User",
              profileId: data.profileId || currentUser.email || "N/A",
              photoURL: data.photoURL || currentUser.photoURL || "https://i.ibb.co/74CkxSP/avatar.png"
            });
          }
          setLoading(false);
        });

        return () => unsubscribeDb();
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // Logout Function
  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // --- SKELETON LOADER ---
  if (loading) {
    return (
      <div id="skeleton-loader">
        {/* Skeleton styles are reused from global or defined here */}
        <div className="skeleton h-[200px] w-full rounded-[20px] mb-[30px] bg-[var(--card-bg-color)]"></div>
        <div className="flex gap-[15px] mb-[15px]">
            <div className="skeleton h-[68px] w-1/2 rounded-[14px]"></div>
            <div className="skeleton h-[68px] w-1/2 rounded-[14px]"></div>
        </div>
        <div className="skeleton h-[68px] w-full rounded-[14px] mb-[15px]"></div>
        <div className="skeleton h-[68px] w-full rounded-[14px] mb-[15px]"></div>
        <div className="skeleton h-[68px] w-full rounded-[14px]"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Watermark Background */}
      <div 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[60%] max-w-[300px] aspect-square bg-no-repeat bg-center bg-contain opacity-50 pointer-events-none z-0 filter grayscale brightness-0 dark:brightness-[1000%]"
        style={{ backgroundImage: "url('https://i.ibb.co/74CkxSP/avatar.png')" }}
      ></div>

      {/* Main Profile Content */}
      <div className="relative z-10">
        
        {/* Profile Card */}
        <div className="profile-card">
          <img 
            src={userData.photoURL} 
            alt="User Avatar" 
            className="profile-avatar-large" 
          />
          <h3 className="profile-name">Hi, {userData.name}</h3>
          <p className="profile-id">{userData.profileId.toUpperCase()}</p>
        </div>
        
        {/* Menu Grid */}
        <div className="profile-menu">
          <Link href="/wallet" className="profile-menu-item half-width">
            <div className="icon-container"><FaWallet /></div>
            <span>ওয়ালেট</span>
          </Link>
          
          <Link href="/orders" className="profile-menu-item half-width">
            <div className="icon-container"><FaReceipt /></div>
            <span>অর্ডার</span>
          </Link>
          
          <Link href="/wishlist" className="profile-menu-item wishlist">
            <div className="icon-container wishlist-icon-bg"><FaHeart color="white" /></div>
            <span>আমার উইশলিস্ট</span>
          </Link>
          
          <div className="profile-menu-item" onClick={() => setShowSettings(!showSettings)}>
            <div className="icon-container"><FaCogs /></div>
            <span>থিম ও সেটিংস</span>
          </div>
          
          <div className="profile-menu-item" onClick={handleLogout}>
            <div className="icon-container"><FaSignOutAlt /></div>
            <span>লগ আউট</span>
          </div>
        </div>
        
        {/* Settings Toggle Section */}
        {showSettings && (
          <div className="settings-section mt-4 animate-fadeIn">
            <div className="bg-[var(--card-bg-color)] p-6 rounded-[20px] shadow-sm">
              <h3 className="text-base font-bold mb-5 flex items-center text-[var(--primary-text-color)]">থিম পরিবর্তন করুন</h3>
              <div className="flex justify-between items-center">
                <span className="text-[var(--primary-text-color)]">ডার্ক মোড</span>
                <label className="theme-switch">
                  <input 
                    type="checkbox" 
                    checked={isDarkMode} 
                    onChange={handleThemeToggle} 
                  />
                  <span className="slider-track"></span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Page Specific Styles */}
      <style jsx>{`
        .profile-card { 
            text-align: center; margin-bottom: 30px; padding: 30px 20px;
            background-color: var(--card-bg-color);
            border-radius: 20px;
            position: relative;
            overflow: hidden;
            box-shadow: var(--soft-shadow);
            background-image:
                radial-gradient(circle at 100% 0%, rgba(123, 97, 255, 0.15) 0%, transparent 45%),
                radial-gradient(circle at 0% 100%, rgba(255, 105, 180, 0.1) 0%, transparent 45%);
            background-repeat: no-repeat;
        }
        .profile-card::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
            background: linear-gradient(90deg, #8A2BE2, #FF69B4, #F77062);
            z-index: 2; 
        }
        .profile-avatar-large { 
            width: 100px; height: 100px;
            border-radius: 50%; object-fit: cover; margin: 0 auto 15px; 
            border: 4px solid var(--card-bg-color);
            box-shadow: none; position: relative; z-index: 1;
        }
        .profile-name { 
            font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 5px;
            position: relative; z-index: 1; color: var(--primary-text-color);
        }
        .profile-id { 
            font-size: 14px; color: var(--secondary-text-color); font-weight: 500; 
            position: relative; z-index: 1;
        }

        .profile-menu { display: flex; flex-wrap: wrap; gap: 15px; }
        
        .profile-menu-item { 
            display: flex; align-items: center; 
            background-color: var(--card-bg-color); 
            padding: 15px; border-radius: 14px; 
            cursor: pointer; box-shadow: var(--soft-shadow);
            transition: all 0.2s; width: 100%;
            text-decoration: none; color: var(--primary-text-color);
        }
        .profile-menu-item.half-width { width: calc(50% - 7.5px); }
        .profile-menu-item.wishlist { background-color: var(--light-purple); } /* using var logic */
        
        .profile-menu-item:active { transform: scale(0.98); }
        
        .icon-container {
            width: 38px; height: 38px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 10px; margin-right: 15px;
            background-color: var(--light-purple);
            color: var(--primary-purple);
            font-size: 18px;
        }
        .wishlist-icon-bg { background-color: #8A2BE2; } /* Override for wishlist icon bg */
        
        /* Toggle Switch */
        .theme-switch { position: relative; display: inline-block; width: 50px; height: 30px; }
        .theme-switch input { opacity: 0; width: 0; height: 0; }
        .slider-track { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #E9E9EA; transition: .4s; border-radius: 30px; }
        body.dark-mode .slider-track { background-color: #39393D; }
        .slider-track:before { position: absolute; content: ""; height: 26px; width: 26px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        input:checked + .slider-track { background-color: var(--primary-purple); }
        input:checked + .slider-track:before { transform: translateX(20px); }
        
        .skeleton {
            background-color: var(--skeleton-bg);
            position: relative; overflow: hidden;
        }
        .skeleton::before {
            content: ''; position: absolute; top: 0; left: -150%; height: 100%; width: 150%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            animation: skeleton-wave 1.5s infinite;
        }
        @keyframes skeleton-wave { 0% { left: -150%; } 100% { left: 150%; } }
      `}</style>
    </div>
  );
}
