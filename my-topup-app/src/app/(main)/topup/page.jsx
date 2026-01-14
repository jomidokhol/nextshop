"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  runTransaction, 
  collection, 
  addDoc, 
  serverTimestamp,
  getDocs,
  deleteDoc,
  setDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  FaArrowLeft, 
  FaHeart, 
  FaRegHeart, 
  FaMinus, 
  FaPlus, 
  FaWallet, 
  FaRegCopy,
  FaCheckCircle,
  FaTimesCircle
} from "react-icons/fa";

export default function TopUpPage() {
  const router = useRouter();

  // State Management
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // Selection State
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [quantity, setQuantity] = useState(1);
  
  // Inputs
  const [playerId, setPlayerId] = useState("");
  const [paymentInputs, setPaymentInputs] = useState({ userNumber: "", trxId: "" });
  
  // Status
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [packageWishlist, setPackageWishlist] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);
  
  // Toast
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // 1. Initial Data Loading
  useEffect(() => {
    // Scroll Listener for Floating Button
    const handleScroll = () => {
        const paymentSection = document.getElementById('paymentSection');
        if (paymentSection) {
            const rect = paymentSection.getBoundingClientRect();
            const triggerPoint = window.innerHeight - 100; 
            if (rect.top <= triggerPoint) setShowFloatingBtn(true);
            else setShowFloatingBtn(false);
        }
    };
    window.addEventListener('scroll', handleScroll);

    // Auth & Data Fetch
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Load Game Data from LocalStorage
        const storedGame = localStorage.getItem('selectedGame');
        if (!storedGame) {
            router.push('/');
            return;
        }
        const parsedGame = JSON.parse(storedGame);
        setGameData(parsedGame);

        // Load Payment Methods
        const paySnap = await getDocs(collection(db, "paymentMethods"));
        setPaymentMethods(paySnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Check Main Game Wishlist
        const wishSnap = await getDoc(doc(db, "users", currentUser.uid, "wishlist", parsedGame.id));
        if (wishSnap.exists()) setIsWishlisted(true);

        // Check Packages Wishlist
        const allWishSnap = await getDocs(collection(db, "users", currentUser.uid, "wishlist"));
        const pkgIds = new Set();
        allWishSnap.forEach(d => {
            if (d.data().cardType === 'package') pkgIds.add(d.id);
        });
        setPackageWishlist(pkgIds);

        setLoading(false);
      } else {
        router.push("/login");
      }
    });

    return () => {
        window.removeEventListener('scroll', handleScroll);
        unsubscribeAuth();
    };
  }, [router]);

  // Toast Helper
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => showToast('নম্বরটি কপি করা হয়েছে!', 'success'));
  };

  // 2. Input Verification
  const verifyInput = () => {
    const value = playerId.trim();
    const inputType = gameData?.inputType || 'userid';
    let isValid = false;
    let msg = '';

    if (!value) {
        msg = 'দয়া করে আপনার তথ্য দিন।';
    } else {
        switch (inputType) {
            case 'mobile_number':
                isValid = !(/\s/.test(value) || !/^\d+$/.test(value) || value.length !== 11);
                msg = 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।';
                break;
            case 'userid':
                isValid = !(/\s/.test(value) || /[a-zA-Z]/.test(value));
                msg = 'প্লেয়ার আইডিতে কোনো স্পেস বা অক্ষর থাকতে পারবে না।';
                break;
            case 'email':
                isValid = /^[a-z0-9]+@[a-z0-9]+\.com$/.test(value);
                msg = "সঠিক ইমেইল দিন।";
                break;
            default:
                isValid = true;
        }
    }

    if (isValid) {
        showToast('আপনার তথ্যটি সঠিক আছে।', 'success');
        return true;
    } else {
        const inputEl = document.getElementById('playerId');
        if(inputEl) inputEl.classList.add('invalid');
        setTimeout(() => inputEl?.classList.remove('invalid'), 2000);
        showToast(msg, 'error');
        return false;
    }
  };

  // 3. Logic: Package & Quantity
  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setQuantity(1);
  };

  const handleQuantityChange = (change) => {
    if (!selectedPackage) return;
    let newQty = quantity + change;
    if (newQty < 1) newQty = 1;

    const stock = parseInt(selectedPackage.stock);
    if (!isNaN(stock) && stock > 0 && newQty > stock) {
        showToast(`দুঃখিত! স্টকে শুধুমাত্র ${stock} টি পণ্য আছে।`, 'error');
        return;
    }
    setQuantity(newQty);
  };

  const totalPrice = selectedPackage ? (parseFloat(selectedPackage.price) * quantity).toFixed(2) : 0;

  // 4. Logic: Wishlist Toggle
  const toggleWishlist = async (e, item, type) => {
    e.stopPropagation();
    if (!user) return;

    // Construct Item ID
    // If package: gameId_amount_price
    const itemId = type === 'package' 
        ? `${gameData.id}_${item.amount.replace(/\s/g, '')}_${item.price}`
        : gameData.id;

    const isExist = type === 'package' ? packageWishlist.has(itemId) : isWishlisted;

    try {
        if (isExist) {
            await deleteDoc(doc(db, "users", user.uid, "wishlist", itemId));
            if (type === 'package') {
                const newSet = new Set(packageWishlist);
                newSet.delete(itemId);
                setPackageWishlist(newSet);
            } else {
                setIsWishlisted(false);
            }
            showToast("উইশলিস্ট থেকে সরানো হয়েছে", "error");
        } else {
            const dataToSave = type === 'package' ? {
                id: itemId, name: gameData.name, logo: gameData.logo,
                category: gameData.category, amount: item.amount, price: item.price,
                cardType: 'package', addedAt: serverTimestamp()
            } : {
                ...gameData, cardType: 'image', addedAt: serverTimestamp()
            };

            await setDoc(doc(db, "users", user.uid, "wishlist", itemId), dataToSave);
            
            if (type === 'package') {
                const newSet = new Set(packageWishlist);
                newSet.add(itemId);
                setPackageWishlist(newSet);
            } else {
                setIsWishlisted(true);
            }
            showToast("উইশলিস্টে যোগ করা হয়েছে", "success");
        }
    } catch (e) {
        console.error(e);
        showToast("সমস্যা হয়েছে", "error");
    }
  };

  // 5. Logic: Process Order (Transaction)
  const processOrder = async () => {
    if (!user) { router.push("/login"); return; }
    if (!verifyInput()) return;
    if (!selectedPackage) { showToast('দয়া করে একটি প্যাকেজ সিলেক্ট করুন।', 'error'); return; }
    if (!selectedPayment) { showToast('দয়া করে পেমেন্ট মেথড সিলেক্ট করুন।', 'error'); return; }

    // Gateway Redirect Logic
    const mName = selectedPayment.name.toLowerCase();
    if (mName.includes('bkash') || mName.includes('nagad')) {
        const pendingOrder = {
            userId: user.uid,
            gameId: gameData.id,
            gameName: gameData.name,
            packageAmount: selectedPackage.amount,
            packagePrice: selectedPackage.price,
            quantity: quantity,
            totalPrice: totalPrice,
            playerId: playerId,
            paymentMethodName: selectedPayment.name,
            paymentNumber: selectedPayment.number,
            paymentLogo: selectedPayment.logoUrl
        };
        localStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));
        router.push(mName.includes('bkash') ? '/bkash-payment' : '/nagad-payment');
        return;
    }

    // Manual / Wallet Logic
    setProcessing(true);
    
    let inputTypeLabel = 'প্লেয়ার আইডি';
    if (gameData.inputType === 'email') inputTypeLabel = 'ইমেইল';
    else if (gameData.inputType === 'mobile_number') inputTypeLabel = 'মোবাইল নম্বর';

    let orderData = {
        userId: user.uid,
        game: gameData.name,
        package: selectedPackage.amount,
        quantity: quantity,
        price: parseFloat(totalPrice),
        playerId: playerId,
        inputTypeLabel: inputTypeLabel,
        paymentMethod: selectedPayment.name,
        status: 'Pending',
        date: serverTimestamp()
    };

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Get Game Doc & Check Stock
            const gameRef = doc(db, "games", gameData.id);
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) throw "এই প্রোডাক্টটি এখন আর পাওয়া যাচ্ছে না।";

            const packages = gameDoc.data().packages || [];
            const pkgIndex = packages.findIndex(p => p.amount === selectedPackage.amount && p.price === selectedPackage.price);
            if (pkgIndex === -1) throw "এই প্যাকেজটি এখন আর পাওয়া যাচ্ছে না।";

            const currentStock = parseInt(packages[pkgIndex].stock);
            if (isNaN(currentStock) || currentStock < quantity) throw "দুঃখিত! স্টকে পর্যাপ্ত পরিমাণ নেই।";

            // 2. Handle Wallet Payment
            if (selectedPayment.type === 'wallet') {
                const userRef = doc(db, "users", user.uid);
                const userDoc = await transaction.get(userRef);
                const currentBalance = parseFloat(userDoc.data().walletBalance) || 0;
                
                if (currentBalance < parseFloat(totalPrice)) throw "আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই।";
                
                transaction.update(userRef, { walletBalance: currentBalance - parseFloat(totalPrice) });
                orderData = { ...orderData, transactionId: 'WALLET_PAY', userPaymentNumber: 'N/A', adminNumber: 'N/A' };
            } 
            // 3. Handle Manual Payment
            else {
                if (!paymentInputs.userNumber || !paymentInputs.trxId) throw "দয়া করে পেমেন্ট নম্বর এবং ট্রানজেকশন আইডি দিন।";
                orderData = { ...orderData, userPaymentNumber: paymentInputs.userNumber, transactionId: paymentInputs.trxId, adminNumber: selectedPayment.number };
            }

            // 4. Update Stock & Create Order
            packages[pkgIndex].stock = currentStock - quantity;
            transaction.update(gameRef, { packages: packages });
            
            // Note: In Firestore transactions, writes must happen after all reads. 
            // Since we can't get ID before creation in transaction easily for new docs without a ref, we create ref first.
            const newOrderRef = doc(collection(db, "orders"));
            transaction.set(newOrderRef, orderData);
        });

        localStorage.setItem('lastOrder', JSON.stringify(orderData));
        router.push('/order-confirmation');

    } catch (error) {
        showToast("সমস্যা হয়েছে: " + (error.message || error), 'error');
        setProcessing(false);
    }
  };


  // --- RENDER SKELETON ---
  if (loading) {
    return (
        <div id="skeleton-loader">
            <div className="flex items-center justify-between mb-6 pt-2">
                <div className="skeleton w-10 h-10 rounded-full"></div>
                <div className="skeleton h-7 w-32 rounded-lg"></div>
                <div className="skeleton w-10 h-10 rounded-full"></div>
            </div>
            <div className="skeleton h-40 w-full rounded-3xl mb-6"></div>
            <div className="skeleton h-14 w-full rounded-2xl mb-6"></div>
            <div className="grid grid-cols-2 gap-4 mb-6">
                {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-2xl"></div>)}
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
        {/* Header */}
        <header className="page-header">
            <div className="header-left">
                <FaArrowLeft className="back-btn" onClick={() => router.push('/')} />
                <h2 className="text-[22px] font-extrabold tracking-tight">{gameData?.name}</h2>
            </div>
            {/* Main Game Wishlist Icon */}
            <div 
                className={`wishlist-icon ${isWishlisted ? 'active' : ''}`} 
                onClick={(e) => toggleWishlist(e, gameData, 'image')}
            >
                {isWishlisted ? <FaHeart /> : <FaRegHeart />}
            </div>
        </header>

        {/* Banner */}
        <img src={gameData?.banner} alt="Banner" className="game-banner" />

        {/* Step 1: Input */}
        <div className="topup-section">
            <h3 className="title">
                <span className="step-number">1</span>
                {gameData?.inputType === 'email' ? 'আপনার ইমেইল দিন' : (gameData?.inputType === 'mobile_number' ? 'আপনার মোবাইল নম্বর দিন' : 'আপনার প্লেয়ার আইডি দিন')}
            </h3>
            <div className="input-group">
                <input 
                    type={gameData?.inputType === 'email' ? 'email' : (gameData?.inputType === 'mobile_number' ? 'tel' : 'text')}
                    id="playerId"
                    placeholder={gameData?.inputType === 'email' ? 'এখানে ইমেইল লিখুন' : 'এখানে আইডি লিখুন'}
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                />
            </div>
            <button className="verify-btn" onClick={verifyInput}>যাচাই করুন</button>
        </div>

        {/* Step 2: Packages */}
        <div className="topup-section">
            <h3 className="title"><span className="step-number">2</span>টপ-আপ অ্যামাউন্ট</h3>
            
            <div className="package-grid">
                {gameData?.packages?.map((pkg, idx) => {
                    const discountPercent = parseFloat(pkg.discountPercent);
                    const hasDiscount = !isNaN(discountPercent) && discountPercent > 0;
                    const originalPrice = hasDiscount ? Math.ceil(parseFloat(pkg.price) / (1 - (discountPercent / 100))) : null;
                    const isStockOut = parseInt(pkg.stock) <= 0;
                    const pkgId = `${gameData.id}_${pkg.amount.replace(/\s/g, '')}_${pkg.price}`;
                    const isPkgWishlisted = packageWishlist.has(pkgId);

                    return (
                        <div 
                            key={idx}
                            className={`package-item ${isStockOut ? 'disabled' : ''} ${selectedPackage === pkg ? 'selected' : ''}`}
                            onClick={() => !isStockOut && handlePackageSelect(pkg)}
                        >
                            <div 
                                className={`wishlist-icon ${isPkgWishlisted ? 'active' : ''}`}
                                style={{position: 'absolute', top: '-10px', left: '-10px', width: '32px', height: '32px', fontSize: '16px'}}
                                onClick={(e) => toggleWishlist(e, pkg, 'package')}
                            >
                                {isPkgWishlisted ? <FaHeart /> : <FaRegHeart />}
                            </div>

                            {hasDiscount && <div className="discount-tag">-{discountPercent}%</div>}
                            
                            <div className="amount">{pkg.amount}</div>
                            <div className="price">
                                ৳ {pkg.price}
                                {hasDiscount && <sub>৳{originalPrice}</sub>}
                            </div>
                            
                            {isStockOut && <span className="stock-tag">Sold Out</span>}
                        </div>
                    );
                })}
            </div>

            {/* Quantity */}
            {selectedPackage && (
                <>
                    <div className="quantity-wrapper animate-fadeIn">
                        <button className="quantity-btn" onClick={() => handleQuantityChange(-1)}><FaMinus /></button>
                        <input type="text" className="quantity-input" value={quantity} readOnly />
                        <button className="quantity-btn" onClick={() => handleQuantityChange(1)}><FaPlus /></button>
                    </div>
                    <p className="text-center mt-1 text-[13px] text-[var(--secondary-text-color)]">পরিমাণ সিলেক্ট করুন</p>
                </>
            )}

            {/* Tutorial Link */}
            {gameData?.tutorialLink && (
                <a href={gameData.tutorialLink} target="_blank" className="how-to-btn">★ কিভাবে টপ-আপ করব?</a>
            )}
        </div>

        {/* Step 3: Payment */}
        <div className="topup-section" id="paymentSection">
            <h3 className="title"><span className="step-number">3</span>পেমেন্ট মেথড বেছে নিন</h3>
            
            <div className="payment-grid">
                {/* Wallet Option */}
                <div 
                    className={`payment-item ${selectedPayment?.type === 'wallet' ? 'selected' : ''}`}
                    onClick={() => setSelectedPayment({ name: 'My Wallet', type: 'wallet' })}
                >
                    <FaWallet style={{ fontSize: '24px', color: 'var(--primary-purple)', marginBottom: '5px' }} />
                    <span>My Wallet</span>
                </div>

                {/* DB Methods */}
                {paymentMethods.map(method => (
                    <div 
                        key={method.id}
                        className={`payment-item ${selectedPayment?.id === method.id ? 'selected' : ''}`}
                        onClick={() => setSelectedPayment({ ...method, type: method.name.toLowerCase().includes('bkash') || method.name.toLowerCase().includes('nagad') ? 'gateway' : 'manual' })}
                    >
                        <img src={method.logoUrl} alt={method.name} />
                        <span>{method.name}</span>
                    </div>
                ))}
            </div>

            {/* Payment Details */}
            {selectedPayment && (
                <div className="mt-5 animate-fadeIn">
                    {selectedPayment.type === 'wallet' ? (
                        <div className="wallet-balance-info">
                            <p>মোট মূল্য: <strong>৳ {totalPrice}</strong></p>
                            <p>আপনার ওয়ালেট থেকে টাকা কাটা হবে।</p>
                        </div>
                    ) : selectedPayment.type === 'manual' ? (
                        <div>
                            <p className="text-center font-semibold mb-2">
                                নিচের নম্বরে টাকা পাঠান: <br/>
                                <span className="text-[var(--primary-purple)] text-lg">{selectedPayment.number}</span>
                                <FaRegCopy className="copy-btn inline-block ml-2" onClick={() => handleCopy(selectedPayment.number)} />
                            </p>
                            <p className="text-center mb-3 text-sm">মোট টাকার পরিমাণ: <strong>৳ {totalPrice}</strong></p>
                            
                            <div className="input-group">
                                <label>আপনার পেমেন্ট নম্বর</label>
                                <input 
                                    type="tel" 
                                    placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন" 
                                    value={paymentInputs.userNumber}
                                    onChange={(e) => setPaymentInputs({...paymentInputs, userNumber: e.target.value})}
                                />
                            </div>
                            <div className="input-group">
                                <label>ট্রানজেকশন আইডি</label>
                                <input 
                                    type="text" 
                                    placeholder="টাকা পাঠানোর পর প্রাপ্ত আইডি"
                                    value={paymentInputs.trxId}
                                    onChange={(e) => setPaymentInputs({...paymentInputs, trxId: e.target.value})}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>

        {/* Description */}
        {gameData?.description && (
            <div className="topup-section">
                <h3 className="title">Rules & Condition</h3>
                <p style={{ fontSize: '14px', color: 'var(--secondary-text-color)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {gameData.description}
                </p>
            </div>
        )}

        {/* Floating Button */}
        <div className={`floating-btn-container ${showFloatingBtn ? 'visible' : ''}`}>
            <button className="btn" onClick={processOrder} disabled={processing}>
                {processing ? "প্রসেস হচ্ছে..." : "Buy"}
            </button>
        </div>

        {/* Toast */}
        <div className={`toast-notification ${toast.type} ${toast.show ? 'show' : ''}`}>
            {toast.type === 'success' ? <FaCheckCircle className="mr-2" /> : <FaTimesCircle className="mr-2" />}
            {toast.message}
        </div>

        {/* CSS Scoped to Page */}
        <style jsx>{`
            .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; padding-top: 10px; }
            .header-left { display: flex; align-items: center; }
            .back-btn { font-size: 20px; cursor: pointer; margin-right: 15px; color: var(--primary-text-color); background: var(--card-bg-color); padding: 10px; border-radius: 50%; box-shadow: var(--soft-shadow); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;}
            
            .game-banner { width: 100%; height: 160px; object-fit: cover; border-radius: 20px; margin-bottom: 25px; box-shadow: var(--soft-shadow); }
            
            .topup-section { background-color: var(--card-bg-color); border-radius: 20px; padding: 25px; margin-bottom: 25px; box-shadow: var(--soft-shadow); }
            .title { font-size: 16px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; }
            .step-number { background: var(--primary-purple); color: white; border-radius: 50%; width: 26px; height: 26px; display: inline-flex; justify-content: center; align-items: center; font-weight: 700; margin-right: 12px; font-size: 13px; box-shadow: 0 4px 10px rgba(123, 97, 255, 0.4); }

            .input-group { margin-bottom: 15px; position: relative; }
            .input-group input { width: 100%; padding: 18px; background-color: var(--background-color); border: 1px solid transparent; border-radius: 14px; font-size: 15px; color: var(--primary-text-color); transition: all 0.2s; }
            .input-group input:focus { border-color: var(--primary-purple); background-color: var(--card-bg-color); outline: none; box-shadow: 0 0 0 4px rgba(123, 97, 255, 0.1); }
            .input-group input.invalid { border-color: var(--accent-red); box-shadow: 0 0 0 4px rgba(255, 59, 48, 0.1); }
            
            .verify-btn { display: block; width: 100%; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; background-color: var(--light-purple); color: var(--primary-purple); border: none; border-radius: 14px; transition: all 0.2s ease; }
            .verify-btn:active { transform: scale(0.98); }

            .package-grid, .payment-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            .package-item, .payment-item { background-color: var(--background-color); border: 2px solid transparent; border-radius: 14px; padding: 20px 15px; cursor: pointer; transition: all 0.2s; position: relative; }
            .package-item:active, .payment-item:active { transform: scale(0.98); }
            .package-item.selected, .payment-item.selected { border-color: var(--primary-purple); background-color: rgba(123, 97, 255, 0.05); }
            
            /* Custom Checkmark for Selected Items */
            .package-item.selected::after, .payment-item.selected::after {
                content: ""; position: absolute; bottom: 10px; right: 10px;
                width: 10px; height: 10px; background: var(--primary-purple); border-radius: 50%;
            }
            .payment-item.selected::after { top: 10px; bottom: auto; }

            .package-item .amount { font-weight: 700; font-size: 16px; text-align: center; margin-bottom: 5px; }
            .package-item .price { color: var(--primary-purple); font-weight: 700; font-size: 14px; text-align: center; line-height: 1.3;}
            .package-item .price sub { display: block; text-decoration: line-through; color: var(--accent-red); font-weight: 500; font-size: 11px; line-height: 1.2; }
            .package-item.disabled { opacity: 0.5; cursor: not-allowed; background-color: rgba(0,0,0,0.05); pointer-events: none; }
            .stock-tag { font-size: 12px; color: var(--accent-red); font-weight: 700; display: block; margin-top: 4px; text-align: center; text-transform: uppercase; }
            .discount-tag { position: absolute; top: -10px; right: -10px; background: rgba(255, 59, 48, 0.1); color: var(--accent-red); padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid rgba(255, 59, 48, 0.2); }

            .payment-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 110px; }
            .payment-item img { max-height: 45px; width: auto; object-fit: contain; margin-bottom: 5px; }
            .payment-item span { font-size: 13px; font-weight: 600; color: var(--primary-text-color); }

            .quantity-wrapper { display: flex; align-items: center; justify-content: center; background: var(--background-color); border-radius: 14px; padding: 10px; width: 100%; margin-top: 15px; }
            .quantity-btn { width: 40px; height: 40px; border-radius: 10px; background: var(--card-bg-color); border: none; font-size: 18px; font-weight: bold; color: var(--primary-purple); cursor: pointer; box-shadow: var(--soft-shadow); display: flex; align-items: center; justify-content: center; }
            .quantity-input { width: 60px; text-align: center; font-size: 18px; font-weight: 700; background: transparent; border: none; color: var(--primary-text-color); outline: none; }

            .how-to-btn {
                display: inline-block; margin-top: 15px; text-decoration: none; font-weight: 700; font-size: 14px;
                background: linear-gradient(90deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
                background-size: 400%; -webkit-background-clip: text; background-clip: text; color: transparent;
                animation: rainbow 5s linear infinite; cursor: pointer; transition: transform 0.2s;
            }
            @keyframes rainbow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

            .wallet-balance-info { background-color: var(--light-purple); padding: 18px; border-radius: 14px; margin-top: 15px; text-align: center; border: 1px solid rgba(123, 97, 255, 0.2); }
            
            .floating-btn-container {
                position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(150%);
                width: 100%; max-width: 480px; padding: 0 20px 20px 20px; z-index: 900; 
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s; opacity: 0; pointer-events: none;
            }
            .floating-btn-container.visible { transform: translateX(-50%) translateY(0); opacity: 1; pointer-events: auto; }
            
            .btn { display: block; width: 100%; background: var(--primary-purple); color: white; border: none; padding: 18px; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.2s; box-shadow: 0 8px 20px rgba(123, 97, 255, 0.25); }
            .btn:active { transform: scale(0.98); }
            .btn:disabled { opacity: 0.7; cursor: not-allowed; }

            .wishlist-icon {
                position: relative; width: 40px; height: 40px; background-color: var(--card-bg-color); color: var(--accent-red);
                border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;
                cursor: pointer; z-index: 10; transition: background-color 0.2s, color 0.2s; box-shadow: var(--soft-shadow);
            }
            .wishlist-icon.active { background-color: var(--accent-red); color: white; }

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
