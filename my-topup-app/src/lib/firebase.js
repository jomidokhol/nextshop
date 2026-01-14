import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// আপনার HTML ফাইল থেকে নেওয়া কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyCZrkWD_5YQW0P-3SYhAzSE4pbCyTqvYu8",
  authDomain: "topupshopnur.firebaseapp.com",
  projectId: "topupshopnur",
  storageBucket: "topupshopnur.firebasestorage.app",
  messagingSenderId: "25262245834",
  appId: "1:25262245834:web:5a867f0516b120bfbcb133",
  measurementId: "G-QR5PYZDCG8"
};

// Next.js এ সার্ভার সাইড রেন্ডারিং (SSR) এর সময় যাতে বারবার অ্যাপ ইনিশিয়ালাইজ না হয়, 
// তাই আমরা চেক করে নিচ্ছি অ্যাপটি আগে থেকেই আছে কিনা।
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// অথেনটিকেশন এবং ডাটাবেস সার্ভিস এক্সপোর্ট করা হলো
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
