"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // নিশ্চিত করুন এই পাথে firebase.js আছে
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function LoginPage() {
  const router = useRouter();
  
  // State Management
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appName, setAppName] = useState("Vercel Top Up");
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load Branding & Check Auth
  useEffect(() => {
    // 1. Branding Load
    const fetchBranding = async () => {
      try {
        const docRef = doc(db, "settings", "branding");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().appName) {
          setAppName(docSnap.data().appName);
        }
      } catch (error) {
        console.error("Error fetching branding:", error);
      } finally {
        setDataLoaded(true); // Branding loaded implies page is ready to show
      }
    };

    fetchBranding();

    // 2. Auth State Listener (Auto Redirect)
    const unsubscribe = auth.onAuthStateChanged((user) => {
      // যদি ইউজার লগইন অবস্থায় থাকে এবং গুগল লগইন প্রসেস না চলে
      if (user && !googleLoading) {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router, googleLoading]);

  // Handle Manual Login
  const handleLogin = async () => {
    if (!email || !password) {
      alert("অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড দিন।");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check Block Status
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().status === "blocked") {
        await signOut(auth);
        alert("আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।");
        setLoading(false);
      } else {
        // Successful Login - onAuthStateChanged will handle redirect
      }
    } catch (error) {
      alert("লগইন করতে সমস্যা হয়েছে: " + error.message);
      setLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setGoogleLoading(true); // Flag to prevent premature redirect
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // New User Creation
        await setDoc(userRef, {
          name: user.displayName || "No Name",
          email: user.email,
          profileId: `GS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          walletBalance: 0,
          status: "active",
          createdAt: serverTimestamp(),
          photoURL: user.photoURL || "https://i.ibb.co/74CkxSP/avatar.png",
          uid: user.uid,
        });
        console.log("New Google user created in Firestore");
      } else {
        // Existing User: Check Block Status
        const userData = userDoc.data();
        if (userData.status === "blocked") {
          await signOut(auth);
          alert("আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে।");
          setGoogleLoading(false);
          return;
        }
      }

      // Manual Redirect after DB operations
      router.push("/");
      
    } catch (error) {
      console.error(error);
      if (error.code !== "auth/popup-closed-by-user") {
        alert("Google সাইন ইন এরর: " + error.message);
      }
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Styles specific to Auth pages (You can move these to a CSS module later) */}
      <style jsx>{`
        .auth-container { 
            position: relative; width: 100%; height: 100vh;
            max-width: 480px; margin: auto; overflow: hidden;
            background-color: var(--background-color);
            display: flex;
            align-items: center; justify-content: center; padding: 25px; 
        }
        .auth-wrapper { width: 100%; }
        .auth-logo-container { text-align: center; margin-bottom: 40px; }
        .auth-logo-container h1 { font-size: 36px; font-weight: 800; color: var(--primary-purple); letter-spacing: -1px; }
        
        .auth-form { width: 100%; padding: 35px 25px; border-radius: var(--border-radius-large); background-color: var(--card-bg-color); box-shadow: var(--soft-shadow); }
        .auth-form h2 { text-align: center; margin-bottom: 30px; font-weight: 700; color: var(--primary-text-color); font-size: 24px; }
        
        .input-group { margin-bottom: 20px; position: relative; }
        .input-group input { 
            width: 100%; padding: 18px; 
            background-color: var(--background-color); 
            border: 1px solid transparent; 
            border-radius: var(--border-radius-medium); 
            font-size: 15px; 
            color: var(--primary-text-color);
            transition: all 0.2s;
        }
        .input-group input:focus { border-color: var(--primary-purple); background-color: var(--card-bg-color); outline: none; box-shadow: 0 0 0 4px rgba(123, 97, 255, 0.1); }
        
        .password-toggle-icon {
            position: absolute; top: 50%; right: 18px; transform: translateY(-50%);
            color: var(--secondary-text-color); cursor: pointer;
        }
        
        .form-link { text-align: center; margin-top: 25px; font-size: 14px; color: var(--secondary-text-color); }
        .form-link span { color: var(--primary-purple); cursor: pointer; font-weight: 600; }
        
        .btn { 
            display: block; width: 100%; 
            background: var(--primary-purple); 
            color: white; border: none; 
            padding: 18px; 
            border-radius: var(--border-radius-medium); 
            font-size: 16px; font-weight: 600; 
            cursor: pointer; text-align: center; 
            transition: all 0.2s; 
            box-shadow: 0 8px 20px rgba(123, 97, 255, 0.25); 
        }
        .btn:active { transform: scale(0.98); }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .google-btn {
            display: flex; align-items: center; justify-content: center;
            width: 100%; background: var(--card-bg-color); color: var(--primary-text-color);
            border: 1px solid #dadce0; border-radius: var(--border-radius-medium);
            padding: 15px; font-size: 15px; font-weight: 500;
            cursor: pointer; margin-top: 15px; transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .google-btn:hover { background-color: var(--background-color); border-color: var(--primary-purple); }
        .google-btn img { width: 20px; height: 20px; margin-right: 12px; }
        
        .divider { text-align: center; margin: 20px 0; position: relative; }
        .divider span { background-color: var(--card-bg-color); padding: 0 10px; color: var(--secondary-text-color); font-size: 12px; position: relative; z-index: 1; }
        .divider::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; border-top: 1px solid #e0e0e0; z-index: 0; }
        
        /* Skeleton Styles */
        .skeleton {
            background-color: var(--skeleton-bg);
            position: relative; overflow: hidden; border-radius: 8px;
        }
        .skeleton::before {
            content: ''; position: absolute; top: 0; left: -150%; height: 100%; width: 150%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            animation: skeleton-wave 1.5s infinite;
        }
        @keyframes skeleton-wave { 0% { left: -150%; } 100% { left: 150%; } }
        .skeleton-logo-text { height: 40px; width: 200px; margin: 0 auto 40px auto; border-radius: 12px; }
        .skeleton-form { background-color: var(--card-bg-color); box-shadow: var(--soft-shadow); padding: 35px 25px; border-radius: var(--border-radius-large); }
        .skeleton-title { height: 28px; width: 150px; margin: 0 auto 30px auto; }
        .skeleton-input { height: 58px; border-radius: var(--border-radius-medium); margin-bottom: 20px; }
        .skeleton-btn { height: 58px; border-radius: var(--border-radius-medium); }
      `}</style>

      {/* Skeleton Loader */}
      {!dataLoaded ? (
        <div id="skeleton-loader" style={{ width: "100%" }}>
          <div className="skeleton skeleton-logo-text"></div>
          <div className="skeleton-form">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-input"></div>
            <div className="skeleton skeleton-input"></div>
            <div className="skeleton skeleton-btn"></div>
          </div>
        </div>
      ) : (
        /* Main Content */
        <div className="auth-wrapper" id="main-content">
          <div className="auth-logo-container">
            <h1>{appName}</h1>
          </div>
          <div className="auth-form">
            <h2>স্বাগতম</h2>
            
            <div className="input-group">
              <input 
                type="email" 
                placeholder="আপনার ইমেইল" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="input-group relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="আপনার পাসওয়ার্ড" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: "50px" }}
              />
              <span 
                className="password-toggle-icon" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <button 
                className="btn" 
                onClick={handleLogin} 
                disabled={loading}
            >
              {loading ? "অপেক্ষা করুন..." : "লগ ইন"}
            </button>

            {/* Google Button */}
            <div className="divider"><span>অথবা</span></div>
            <button 
                className="google-btn" 
                onClick={handleGoogleLogin} 
                style={{ opacity: googleLoading ? 0.7 : 1 }}
                disabled={googleLoading}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" />
              {googleLoading ? "Processing..." : "Sign in with Google"}
            </button>

            <p className="form-link">
              অ্যাকাউন্ট নেই? <Link href="/signup"><span>সাইন আপ করুন</span></Link>
            </p>

            <p className="form-link" style={{ marginTop: "15px", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "15px" }}>
              <Link href="/">
                <span style={{ color: "var(--secondary-text-color)", fontWeight: 500, fontSize: "13px" }}>
                  গেস্ট হিসেবে ফিরে যান
                </span>
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
