"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut 
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; 
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function SignUpPage() {
  const router = useRouter();

  // State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appName, setAppName] = useState("Vercel Top Up");

  // Load Branding
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const docRef = doc(db, "settings", "branding");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().appName) {
          setAppName(docSnap.data().appName);
        }
      } catch (error) {
        console.error("Error fetching branding:", error);
      }
    };
    fetchBranding();

    // Auto redirect if already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !googleLoading) {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router, googleLoading]);

  // Handle Sign Up
  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("অনুগ্রহ করে সকল তথ্য পূরণ করুন।");
      return;
    }

    if (password !== confirmPassword) {
      alert("আপনার পাসওয়ার্ড দুটি মিলছে না।");
      return;
    }

    setLoading(true);

    try {
      // 1. Get Default Avatars
      const avatarSettingsRef = doc(db, "settings", "defaultAvatars");
      const avatarSnap = await getDoc(avatarSettingsRef);
      const defaultMaleAvatar = avatarSnap.data()?.maleAvatarUrl || "https://i.ibb.co/74CkxSP/avatar.png";
      const defaultFemaleAvatar = avatarSnap.data()?.femaleAvatarUrl || "https://i.ibb.co/74CkxSP/avatar.png";

      // 2. Determine Avatar (Simple Heuristic)
      let assignedAvatarUrl = defaultMaleAvatar;
      const lowerCaseName = name.toLowerCase();
      const femaleIdentifiers = ['a', 'i', 'akter', 'begum', 'fatima', 'jannat', 'tasnim', 'nisa', 'khatun'];
      
      if (femaleIdentifiers.some(identifier => lowerCaseName.includes(identifier))) {
        assignedAvatarUrl = defaultFemaleAvatar;
      }

      // 3. Create User in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 4. Save User Data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: email,
        profileId: `GS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        walletBalance: 0,
        status: "active",
        createdAt: serverTimestamp(),
        photoURL: assignedAvatarUrl,
        uid: user.uid
      });

      // Redirect handled by onAuthStateChanged
    } catch (error) {
      alert("সাইন আপ করতে সমস্যা হয়েছে: " + error.message);
      setLoading(false);
    }
  };

  // Handle Google Sign Up (Same as Login)
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
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
      } else {
        const userData = userDoc.data();
        if (userData.status === "blocked") {
          await signOut(auth);
          alert("আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে।");
          setGoogleLoading(false);
          return;
        }
      }
      router.push("/");
    } catch (error) {
      console.error(error);
      if (error.code !== "auth/popup-closed-by-user") {
        alert("Google সাইন আপ এরর: " + error.message);
      }
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* CSS Styles (Scoped) */}
      <style jsx>{`
        .auth-container { 
            position: relative; width: 100%; height: 100vh;
            max-width: 480px; margin: auto; overflow: hidden;
            background-color: var(--background-color);
            display: flex; align-items: center; justify-content: center; padding: 25px; 
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
      `}</style>

      <div className="auth-wrapper">
        <div className="auth-logo-container">
          <h1>{appName}</h1>
        </div>
        <div className="auth-form">
          <h2>নতুন অ্যাকাউন্ট</h2>
          
          <div className="input-group">
            <input 
              type="text" 
              placeholder="আপনার সম্পূর্ণ নাম" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
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
              placeholder="নতুন পাসওয়ার্ড দিন" 
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

          <div className="input-group relative">
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="পুনরায় পাসওয়ার্ড দিন" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingRight: "50px" }}
            />
            <span 
              className="password-toggle-icon" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <button 
            className="btn" 
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? "অপেক্ষা করুন..." : "সাইন আপ"}
          </button>

          <div className="divider"><span>অথবা</span></div>
          
          <button 
            className="google-btn" 
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{ opacity: googleLoading ? 0.7 : 1 }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" />
            {googleLoading ? "Processing..." : "Sign in with Google"}
          </button>
          
          <p className="form-link">
            ইতোমধ্যে অ্যাকাউন্ট আছে? <Link href="/login"><span>লগইন করুন</span></Link>
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
    </div>
  );
}
