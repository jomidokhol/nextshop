"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { 
  doc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  updateDoc, 
  getDoc 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaSpinner, FaFileInvoiceDollar, FaExclamationTriangle } from "react-icons/fa";

export default function WalletPage() {
  const router = useRouter();
  
  // State
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({ 
    name: "...", 
    walletBalance: 0, 
    photoURL: "https://i.ibb.co/74CkxSP/avatar.png" 
  });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const EDIT_WINDOW_MS = 3 * 60 * 1000; // 3 minutes for edit

  // 1. Auth & Data Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Listener for User Balance & Profile
        const unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              name: data.name || currentUser.displayName || "User",
              walletBalance: data.walletBalance || 0,
              photoURL: data.photoURL || currentUser.photoURL || "https://i.ibb.co/74CkxSP/avatar.png"
            });
          }
        });

        // Listener for Money Requests History
        const q = query(collection(db, "moneyRequests"), where("userId", "==", currentUser.uid));
        const unsubRequests = onSnapshot(q, (snapshot) => {
          let reqList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort descending
          reqList.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
          setRequests(reqList);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching requests:", error);
          setLoading(false);
        });

        return () => {
          unsubUser();
          unsubRequests();
        };
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // Actions
  const handleDelete = async (id) => {
    if (confirm('আপনি কি নিশ্চিতভাবে এই রিকোয়েস্টটি মুছে ফেলতে চান?')) {
      try {
        await deleteDoc(doc(db, "moneyRequests", id));
        alert('রিকোয়েস্টটি সফলভাবে মুছে ফেলা হয়েছে।');
      } catch (e) {
        alert('সমস্যা হয়েছে: ' + e.message);
      }
    }
  };

  const handleEdit = async (id) => {
    try {
      const docRef = doc(db, "moneyRequests", id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) { 
        alert('রিকোয়েস্ট পাওয়া যায়নি!'); 
        return; 
      }
      
      const request = docSnap.data();
      
      const newAmount = prompt('নতুন অ্যামাউন্ট লিখুন:', request.amount);
      const newNumber = prompt('নতুন পেমেন্ট নম্বর দিন:', request.userPaymentNumber);
      const newTransactionId = prompt('নতুন ট্রানজেকশন আইডি দিন:', request.transactionId);

      const updates = {};
      if (newAmount && parseFloat(newAmount) > 0 && parseFloat(newAmount) !== request.amount) {
        updates.amount = parseFloat(newAmount);
      }
      if (newNumber && newNumber.trim() !== '' && newNumber !== request.userPaymentNumber) {
        updates.userPaymentNumber = newNumber;
      }
      if (newTransactionId && newTransactionId.trim() !== '' && newTransactionId !== request.transactionId) {
        updates.transactionId = newTransactionId;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(docRef, updates);
        alert('রিকোয়েস্ট সফলভাবে আপডেট করা হয়েছে!');
      }
    } catch (e) {
      alert('আপডেট করতে সমস্যা হয়েছে: ' + e.message);
    }
  };

  // --- SKELETON LOADER UI ---
  if (loading) {
    return (
      <div id="skeleton-loader">
        <div className="skeleton h-8 w-32 mx-auto mb-6 rounded-lg"></div>
        <div className="skeleton h-[225px] w-full rounded-3xl mb-8"></div>
        <div className="skeleton h-6 w-48 mb-4 rounded-lg"></div>
        <div className="skeleton h-32 w-full rounded-2xl mb-4"></div>
        <div className="skeleton h-32 w-full rounded-2xl mb-4"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Internal Page Header */}
      <header className="page-header flex items-center justify-center mb-6 pt-2">
        <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--primary-text-color)]">
          আমার ওয়ালেট
        </h2>
      </header>

      {/* Wallet Card Component */}
      <div className="card-section-wrapper">
        <div className="new-card-container">
          <div className="card front-face">
            <div className="ghost-element ghost-1"></div>
            <div className="ghost-element ghost-2"></div>
            
            <header className="flex items-center justify-between">
              <span className="logo flex items-center">
                <img 
                  id="walletProfileImage" 
                  src={userData.photoURL} 
                  alt="profile_image" 
                  className="w-12 h-12 rounded-full mr-2 object-cover"
                />
                <h5 className="text-white text-base font-normal">{userData.name}</h5>
              </span>
            </header>
    
            <div className="card-balance flex-grow flex flex-col items-center justify-center text-center">
                <h5 className="text-white text-base font-normal">আপনার বর্তমান ব্যালেন্স</h5>
                <div className="balance-details flex flex-row items-center mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 fill-white mr-2">
                        <path d="M21 7H3C2.44772 7 2 7.44772 2 8V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V9C22 7.89543 21.1046 7 20 7H21ZM20 9V18H4V8L20 8V9ZM18 14C18 15.1046 17.1046 16 16 16C14.8954 16 14 15.1046 14 14C14 12.8954 14.8954 12 16 12C17.1046 12 18 12.8954 18 14ZM5 6H19V4H5V6Z"></path>
                    </svg>
                    <h5 className="amount text-3xl font-medium mr-1 text-white">
                        {parseFloat(userData.walletBalance).toFixed(2)}
                    </h5>
                    <span className="currency text-3xl font-medium text-white">৳</span>
                </div>
                <Link href="/add-money" className="add-money-btn mt-3 px-4 py-1.5 bg-white/15 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
                    এড মানি
                </Link>
            </div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <h3 className="text-lg font-bold mb-4 ml-1 text-[var(--primary-text-color)]">মানি রিকোয়েস্ট হিস্টোরি</h3>
      
      <div id="moneyRequestHistory">
        {requests.length === 0 ? (
          <div className="empty-state text-center py-10 text-[var(--secondary-text-color)]">
            <FaFileInvoiceDollar className="text-5xl mx-auto mb-4 text-[var(--light-purple)]" />
            <p className="font-medium">কোনো রিকোয়েস্ট খুঁজে পাওয়া যায়নি।</p>
          </div>
        ) : (
          requests.map((request) => {
            const requestDate = request.date ? request.date.toDate() : new Date();
            const isEditable = (new Date() - requestDate) < EDIT_WINDOW_MS && request.status === 'Pending';
            
            // Status Color Logic
            let statusColor = "#FF9500"; // Pending (Orange)
            if(request.status === 'Approved') statusColor = "#34C759"; // Green
            if(request.status === 'Rejected') statusColor = "#FF3B30"; // Red

            return (
              <div key={request.id} className="bg-[var(--card-bg-color)] p-6 rounded-2xl mb-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg text-[var(--primary-text-color)]">৳ {request.amount}</span>
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: statusColor }}
                    >
                      {request.status}
                    </span>
                </div>
                
                <div className="space-y-1.5">
                    <div className="flex justify-between text-sm text-[var(--secondary-text-color)]">
                        <span>পেমেন্ট মেথড:</span><strong>{request.paymentMethod}</strong>
                    </div>
                    <div className="flex justify-between text-sm text-[var(--secondary-text-color)]">
                        <span>পেমেন্ট নম্বর:</span><strong>{request.userPaymentNumber}</strong>
                    </div>
                    <div className="flex justify-between text-sm text-[var(--secondary-text-color)]">
                        <span>TrxID:</span><strong>{request.transactionId}</strong>
                    </div>
                    <div className="flex justify-between text-sm text-[var(--secondary-text-color)]">
                        <span>তারিখ:</span><strong>{requestDate.toLocaleString('bn-BD')}</strong>
                    </div>
                </div>

                {request.status === 'Pending' && (
                  <div className="flex gap-3 mt-5">
                    {isEditable && (
                        <button 
                            onClick={() => handleEdit(request.id)}
                            className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-[var(--secondary-text-color)]"
                        >
                            এডিট
                        </button>
                    )}
                    <button 
                        onClick={() => handleDelete(request.id)}
                        className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-[var(--accent-red)]"
                    >
                        মুছে ফেলুন
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CSS for the Card (Scoped to this component) */}
      <style jsx>{`
        .card-section-wrapper {
            perspective: 1000px;
            margin-bottom: 30px;
            font-family: "Poppins", sans-serif;
        }
        .new-card-container {
            position: relative;
            height: 225px;
            width: 100%; 
            transform-style: preserve-3d;
        }
        .card {
            position: absolute;
            height: 100%;
            width: 100%;
            padding: 25px;
            border-radius: 25px;
            background: linear-gradient(to right, rgba(156, 39, 176, 0.9), rgba(123, 97, 255, 0.8));
            box-shadow: 0 25px 45px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        /* Dark Mode Override logic handled via globals.css variables if needed, 
           but inline style here keeps the purple theme consistent */
        
        .ghost-element {
            position: absolute;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            z-index: 0;
        }
        .ghost-1 { height: 180px; width: 180px; right: -60px; top: -70px; }
        .ghost-2 { height: 120px; width: 120px; left: -40px; bottom: -50px; }
        
        .front-face header, .card-balance { z-index: 10; }
        
        /* Skeleton Animation */
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
