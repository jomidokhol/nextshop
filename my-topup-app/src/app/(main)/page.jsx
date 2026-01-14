"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Footer from "@/components/layout/Footer"; // ফুটার ইম্পোর্ট
import { FaHeart, FaRegHeart } from "react-icons/fa"; // আইকন

export default function HomePage() {
  const router = useRouter();
  
  // State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [sliderImages, setSliderImages] = useState([]);
  const [notice, setNotice] = useState("");
  const [eventData, setEventData] = useState(null);
  const [eventTimeLeft, setEventTimeLeft] = useState("");
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [popupData, setPopupData] = useState(null);

  // 1. Auth & Data Fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchWishlist(currentUser.uid);
      }
    });

    const fetchAllData = async () => {
      try {
        // Fetch Games
        const gamesQ = query(collection(db, "games"), where("status", "in", ["active", "unavailable"]));
        const gamesSnap = await getDocs(gamesQ);
        const gamesList = gamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGames(gamesList);

        // Fetch Slider
        const sliderSnap = await getDoc(doc(db, "settings", "slider"));
        if (sliderSnap.exists()) setSliderImages(sliderSnap.data().imageUrls || []);

        // Fetch Notice
        const noticeSnap = await getDoc(doc(db, "settings", "notice"));
        if (noticeSnap.exists()) setNotice(noticeSnap.data().text || "");

        // Fetch Event
        const eventSnap = await getDoc(doc(db, "settings", "event"));
        if (eventSnap.exists() && eventSnap.data().isActive) {
          setEventData(eventSnap.data());
        }

        // Fetch Popup
        const popupSnap = await getDoc(doc(db, "settings", "popup"));
        if (popupSnap.exists() && popupSnap.data().isActive) {
            const pData = popupSnap.data();
            // Check session storage
            if (!sessionStorage.getItem('popupViewed')) {
                setPopupData(pData);
            }
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    return () => unsubscribe();
  }, []);

  // 2. Slider Logic
  useEffect(() => {
    if (sliderImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [sliderImages]);

  // 3. Event Timer Logic
  useEffect(() => {
    if (!eventData?.endDate) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const endTime = eventData.endDate.toDate().getTime();
      const distance = endTime - now;

      if (distance < 0) {
        setEventTimeLeft("EXPIRED");
        clearInterval(interval);
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const f = (n) => n < 10 ? '0' + n : n;
        setEventTimeLeft(`${days > 0 ? f(days) + 'd ' : ''}${f(hours)}:${f(minutes)}:${f(seconds)}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [eventData]);

  // 4. Wishlist Helper Functions
  const fetchWishlist = async (uid) => {
    const q = collection(db, "users", uid, "wishlist");
    const snap = await getDocs(q);
    const ids = new Set(snap.docs.map(d => d.id));
    setWishlistIds(ids);
  };

  const toggleWishlist = async (e, game) => {
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }

    const newSet = new Set(wishlistIds);
    try {
      if (newSet.has(game.id)) {
        await deleteDoc(doc(db, "users", user.uid, "wishlist", game.id));
        newSet.delete(game.id);
        // Show Toast (Logic handled in layout or separate component, simple alert for now)
        // alert("Removed from wishlist");
      } else {
        await setDoc(doc(db, "users", user.uid, "wishlist", game.id), {
          ...game,
          cardType: 'image',
          addedAt: serverTimestamp()
        });
        newSet.add(game.id);
        // alert("Added to wishlist");
      }
      setWishlistIds(newSet);
    } catch (error) {
      console.error(error);
    }
  };

  // 5. Navigation Handler
  const handleGameClick = (game) => {
    if (game.status === 'unavailable') return;
    // LocalStorage ব্যবহার করা হচ্ছে কারণ পরবর্তী পেজে ডাটা লাগবে
    localStorage.setItem('selectedGame', JSON.stringify(game));
    router.push('/topup'); // Next.js routing -> /topup page (previously topup.html)
  };

  // 6. Group Games by Category
  const groupedGames = games.reduce((acc, game) => {
    const category = game.category || "জনপ্রিয় গেমসমূহ";
    if (!acc[category]) acc[category] = [];
    acc[category].push(game);
    return acc;
  }, {});

  // Sort categories to put "Event" first
  const sortedCategories = Object.keys(groupedGames).sort((a, b) => {
    if (a === 'Event') return -1;
    return 0;
  });

  // --- SKELETON LOADER UI ---
  if (loading) {
    return (
      <div id="skeleton-loader">
        <div className="skeleton h-10 rounded-xl mb-6 bg-[var(--card-bg-color)]"></div> {/* Marquee */}
        <div className="skeleton h-[180px] rounded-2xl mb-8"></div> {/* Slider */}
        <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="skeleton h-32 rounded-xl"></div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Marquee Notice */}
      <div className="marquee-wrapper">
        <div className="marquee-content">
          {notice.split(/([।\.])/).map((part, index) => (
             <span key={index}>
               {part} {part.match(/[।\.]/) && <span className="marquee-separator">|</span>}
             </span>
          ))}
        </div>
      </div>

      {/* Slider */}
      <div className="slider-container">
        <div className="slider" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {sliderImages.map((url, idx) => (
            <div className="slide" key={idx}>
              <img src={url} alt="Banner" />
            </div>
          ))}
        </div>
        <div className="slider-dots">
          {sliderImages.map((_, idx) => (
            <div key={idx} className={`slider-dot ${idx === currentSlide ? 'active' : ''}`} />
          ))}
        </div>
      </div>

      {/* Dynamic Popup Modal */}
      {popupData && (
        <div className="modal" style={{ display: 'flex' }}>
            <div 
                className="popup-container"
                style={popupData.imageUrl ? {
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 50%), url('${popupData.imageUrl}')`
                } : {}}
            >
                <div className="popup-title">{popupData.title}</div>
                <div className="popup-content">
                    <p className="popup-message-text">{popupData.message}</p>
                    {popupData.buttonLink && (
                        <a href={popupData.buttonLink} target="_blank" className="click-here-btn">
                            {popupData.buttonText || "CLICK HERE!"}
                        </a>
                    )}
                </div>
                <div className="close-btn-container">
                    <button className="close-btn" onClick={() => {
                        setPopupData(null);
                        sessionStorage.setItem('popupViewed', 'true');
                    }}>
                        <span className="close-icon"></span> CLOSE
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Game Categories Loop */}
      <div id="homeCategoriesContainer">
        {/* Event Section (if exists) */}
        {eventData && groupedGames['Event'] && (
            <div id="eventSectionContainer">
                <h2 className="section-title">{eventData.title || "Event"}</h2>
                <div className="event-section-wrapper">
                    <div className="event-header-tab">
                        <div className="event-timer">End in <span>{eventTimeLeft}</span></div>
                    </div>
                    <div className="event-content-box">
                        <div className="game-grid">
                            {groupedGames['Event'].map(game => (
                                <GameCard 
                                    key={game.id} 
                                    game={game} 
                                    isWishlisted={wishlistIds.has(game.id)}
                                    onWishlist={(e) => toggleWishlist(e, game)}
                                    onClick={() => handleGameClick(game)}
                                    isDisabled={eventTimeLeft === "EXPIRED"}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Other Categories */}
        {sortedCategories.map(category => {
            if (category === 'Event') return null; // Skip event as handled above
            
            const isGiftCard = category === "Gift Card’s";
            
            return (
                <div key={category} className="category-section">
                    <h2 className="section-title">{category}</h2>
                    <div className={isGiftCard ? "gift-card-grid" : "game-grid"}>
                        {groupedGames[category].map(game => (
                            isGiftCard ? (
                                <GiftCardItem 
                                    key={game.id} 
                                    game={game}
                                    isWishlisted={wishlistIds.has(game.id)}
                                    onWishlist={(e) => toggleWishlist(e, game)}
                                    onClick={() => handleGameClick(game)}
                                />
                            ) : (
                                <GameCard 
                                    key={game.id} 
                                    game={game}
                                    isWishlisted={wishlistIds.has(game.id)}
                                    onWishlist={(e) => toggleWishlist(e, game)}
                                    onClick={() => handleGameClick(game)}
                                />
                            )
                        ))}
                    </div>
                </div>
            );
        })}
      </div>

      <Footer />
    </div>
  );
}

// --- Sub Components for Cards ---

function GameCard({ game, isWishlisted, onWishlist, onClick, isDisabled }) {
    const disabledClass = (game.status === 'unavailable' || isDisabled) ? 'disabled' : '';
    
    return (
        <div className={`game-card ${disabledClass}`} onClick={onClick}>
            <div className={`wishlist-icon ${isWishlisted ? 'active' : ''}`} onClick={onWishlist}>
                {isWishlisted ? <FaHeart /> : <FaRegHeart />}
            </div>
            {(game.status === 'unavailable' || isDisabled) && (
                <div className="unavailable-overlay">
                    <img src="/unavailable.png" alt="Unavailable" /> 
                    {/* Note: Make sure unavailable.png is in public folder */}
                </div>
            )}
            {game.badgeText && <span className="card-badge">{game.badgeText}</span>}
            
            <div className="icon-wrapper">
                <img src={game.logo} alt={game.name} />
            </div>
            <div className="game-info-container">
                <div className="game-name">{game.name}</div>
            </div>
        </div>
    );
}

function GiftCardItem({ game, isWishlisted, onWishlist, onClick }) {
    const disabledClass = game.status === 'unavailable' ? 'disabled' : '';

    return (
        <div className={`game-card gift-card-container ${disabledClass}`} onClick={onClick}>
            <div className={`wishlist-icon ${isWishlisted ? 'active' : ''}`} onClick={onWishlist}>
                {isWishlisted ? <FaHeart /> : <FaRegHeart />}
            </div>
            {game.status === 'unavailable' && (
                <div className="unavailable-overlay">
                    <img src="/unavailable.png" alt="Unavailable" />
                </div>
            )}
            {game.badgeText && <span className="card-badge">{game.badgeText}</span>}

            <div className="gift-card-content">
                <div className="gc-top">
                    <div className="gc-hanger"></div>
                    <h1 className="gc-title">{game.name}</h1>
                    <p className="gc-subtitle">Redeem for apps, games & more</p>
                </div>
                <div className="gc-bottom">
                    <img className="gc-play-logo-img" src={game.logo} alt={game.name} />
                    <span className="gc-brand-name">{game.name}</span>
                </div>
            </div>
        </div>
    );
}
