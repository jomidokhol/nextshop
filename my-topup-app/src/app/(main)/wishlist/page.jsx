"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  getDoc,
  query,
  where,
  documentId,
  orderBy 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaArrowLeft, FaHeart, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from "react-icons/fa";

export default function WishlistPage() {
  const router = useRouter();

  // State
  const [user, setUser] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // 1. Auth & Data Loading
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadWishlist(currentUser.uid);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // Toast Helper
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // 2. Fetch Wishlist Data
  const loadWishlist = async (uid) => {
    try {
      // A. Get Event Status
      const eventDoc = await getDoc(doc(db, "settings", "event"));
      const isEventActive = eventDoc.exists() && eventDoc.data().isActive;

      // B. Get User's Wishlist
      const wishlistRef = collection(db, "users", uid, "wishlist");
      const q = query(wishlistRef, orderBy("addedAt", "desc"));
      const wishlistSnap = await getDocs(q);

      if (wishlistSnap.empty) {
        setWishlistItems([]);
        setLoading(false);
        return;
      }

      // C. Get unique Game IDs to fetch fresh data (status check)
      const gameIds = [...new Set(wishlistSnap.docs.map(d => {
        const data = d.data();
        // If package, ID format is "gameId_amount_price", split to get gameId
        return data.cardType === 'package' ? data.id.split('_')[0] : data.id;
      }))];

      // D. Fetch Fresh Game Data
      const freshGamesMap = new Map();
      // Firestore 'in' query allows max 10 items, for production with many items need chunking.
      // Assuming logic for standard usage here.
      if (gameIds.length > 0) {
        // Note: For larger arrays, split into chunks of 10
        const gamesQ = query(collection(db, "games"), where(documentId(), "in", gameIds.slice(0, 10)));
        const gamesSnap = await getDocs(gamesQ);
        gamesSnap.forEach(doc => {
            freshGamesMap.set(doc.id, doc.data());
        });
      }

      // E. Process Items
      const processedItems = [];
      wishlistSnap.docs.forEach(docSnap => {
        const item = docSnap.data();
        const gameId = item.cardType === 'package' ? item.id.split('_')[0] : item.id;
        const freshGameData = freshGamesMap.get(gameId);

        // Filter out inactive games
        if (!freshGameData || freshGameData.status === 'inactive') return;

        // Check availability
        const isExpiredEvent = item.category === 'Event' && !isEventActive;
        const isUnavailable = freshGameData.status === 'unavailable';
        
        processedItems.push({
            ...item,
            uniqueKey: docSnap.id,
            isDisabled: isExpiredEvent || isUnavailable,
            freshGameData: { id: gameId, ...freshGameData } // Store for navigation
        });
      });

      setWishlistItems(processedItems);

    } catch (error) {
      console.error("Error loading wishlist:", error);
      showToast("উইশলিস্ট লোড করা যায়নি।", "error");
    } finally {
      setLoading(false);
    }
  };

  // 3. Remove Item
  const handleRemove = async (e, item) => {
    e.stopPropagation(); // Prevent card click
    
    try {
        await deleteDoc(doc(db, "users", user.uid, "wishlist", item.id));
        setWishlistItems(prev => prev.filter(i => i.id !== item.id));
        showToast(`'${item.name || item.amount}' উইশলিস্ট থেকে সরানো হয়েছে`, "error");
    } catch (error) {
        console.error("Error removing item:", error);
        showToast("আইটেমটি সরাতে সমস্যা হয়েছে।", "error");
    }
  };

  // 4. Navigation
  const handleCardClick = (item) => {
    if (item.isDisabled) return;
    localStorage.setItem('selectedGame', JSON.stringify(item.freshGameData));
    router.push('/topup');
  };

  // --- SKELETON LOADER ---
  if (loading) {
    return (
      <div id="skeleton-loader">
        <div className="flex items-center mb-6 pt-2">
            <div className="skeleton w-10 h-10 rounded-full mr-4"></div>
            <div className="skeleton h-7 w-32 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-[220px] rounded-2xl"></div>
            <div className="skeleton h-[220px] rounded-2xl"></div>
            <div className="skeleton h-[220px] rounded-2xl"></div>
            <div className="skeleton h-[220px] rounded-2xl"></div>
        </div>
        
        <style jsx>{`
            .skeleton { background-color: var(--skeleton-bg); position: relative; overflow: hidden; }
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

  return (
    <div>
      <header className="page-header">
        <FaArrowLeft className="back-btn" onClick={() => router.push('/')} />
        <h2>আমার উইশলিস্ট</h2>
      </header>

      <div className="game-grid">
        {wishlistItems.length === 0 ? (
            <div className="col-span-2 text-center py-10 text-[var(--secondary-text-color)]">
                <FaExclamationCircle className="text-4xl mx-auto mb-3 opacity-50" />
                <p>আপনার উইশলিস্টে কোনো আইটেম নেই।</p>
            </div>
        ) : (
            wishlistItems.map((item) => (
                <div 
                    key={item.uniqueKey} 
                    className={`
                        cursor-pointer transition-all duration-200 relative overflow-hidden shadow-sm
                        ${item.cardType === 'image' ? 'game-card' : 'package-item'}
                        ${item.isDisabled ? 'disabled' : ''}
                    `}
                    onClick={() => handleCardClick(item)}
                >
                    {/* Heart Icon (Removal) */}
                    <div 
                        className="wishlist-icon active" 
                        onClick={(e) => handleRemove(e, item)}
                    >
                        <FaHeart />
                    </div>

                    {/* Overlay for disabled items */}
                    {item.isDisabled && (
                        <div className="unavailable-overlay">
                            <img src="/unavailable.png" alt="Unavailable" />
                        </div>
                    )}

                    {/* --- Card Type: IMAGE --- */}
                    {item.cardType === 'image' && (
                        <>
                            <div className="icon-wrapper">
                                <img src={item.logo} alt={item.name} />
                            </div>
                            <div className="game-info-container">
                                <div className="game-name">{item.name}</div>
                                <div className="game-category">{item.category || ''}</div>
                            </div>
                        </>
                    )}

                    {/* --- Card Type: PACKAGE --- */}
                    {item.cardType === 'package' && (
                        <>
                            <div className="amount">{item.amount}</div>
                            <div className="price">৳ {item.price}</div>
                            <div className="category">{item.name}</div>
                        </>
                    )}
                </div>
            ))
        )}
      </div>

      {/* Toast Notification */}
      <div className={`toast-notification ${toast.type} ${toast.show ? 'show' : ''}`}>
        {toast.type === 'success' ? <FaCheckCircle className="mr-2" /> : <FaTimesCircle className="mr-2" />}
        {toast.message}
      </div>

      {/* Styles */}
      <style jsx>{`
        .page-header { display: flex; align-items: center; margin-bottom: 25px; padding-top: 10px; }
        .back-btn { font-size: 20px; cursor: pointer; margin-right: 15px; color: var(--primary-text-color); background: var(--card-bg-color); padding: 10px; border-radius: 50%; box-shadow: var(--soft-shadow); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;}
        .page-header h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }

        .game-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }

        /* Game Card Style */
        .game-card {
            background: var(--card-bg-color); border-radius: 20px;
            text-align: center; display: flex; flex-direction: column;
            border: 1px solid rgba(0,0,0,0.04);
        }
        .game-card:active { transform: scale(0.96); }
        .icon-wrapper { width: 100%; height: 160px; margin: 0 auto; display: flex; align-items: center; justify-content: center; padding: 10px; }
        .icon-wrapper img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
        .game-info-container { padding: 12px; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; border-top: 1px solid rgba(0,0,0,0.03); }
        .game-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; color: var(--primary-text-color); }
        .game-category { font-size: 12px; color: var(--secondary-text-color); }

        /* Package Card Style */
        .package-item { 
            background-color: var(--card-bg-color); 
            border: 1px solid rgba(0,0,0,0.04); border-radius: 20px; padding: 20px 15px; 
            text-align: center; display: flex; flex-direction: column; justify-content: center;
        }
        .package-item:active { transform: scale(0.98); }
        .amount { font-weight: 700; font-size: 16px; margin-bottom: 5px; color: var(--primary-text-color); }
        .price { color: var(--primary-purple); font-weight: 700; font-size: 14px; margin-bottom: 8px;}
        .category { font-size: 11px; color: var(--secondary-text-color); text-transform: uppercase; font-weight: 500; }

        /* Disabled State */
        .disabled { cursor: not-allowed; opacity: 0.7; pointer-events: none; }
        .unavailable-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(255, 255, 255, 0.7); display: flex;
            justify-content: center; align-items: center; z-index: 10;
        }
        .unavailable-overlay img { width: 70%; max-width: 100px; }

        /* Wishlist Icon */
        .wishlist-icon {
            position: absolute; top: 10px; left: 10px;
            width: 32px; height: 32px;
            background-color: rgba(255, 255, 255, 0.5); color: var(--accent-red);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 16px; cursor: pointer; z-index: 10;
            backdrop-filter: blur(5px);
        }
        
        /* Toast Notification */
        .toast-notification {
            position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(20px);
            background-color: rgba(20, 20, 20, 0.9); color: white;
            padding: 12px 20px; border-radius: 14px;
            box-shadow: var(--soft-shadow); z-index: 9999; font-size: 14px; font-weight: 500;
            opacity: 0; visibility: hidden; transition: all 0.3s;
            display: flex; align-items: center; width: max-content; max-width: 90%;
        }
        .toast-notification.show { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
        .toast-notification.error { background-color: var(--accent-red); }
        .toast-notification.success { background-color: var(--accent-green); }
      `}</style>
    </div>
  );
}
