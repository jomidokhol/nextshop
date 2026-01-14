"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaArrowLeft, FaRegCopy, FaCheck } from "react-icons/fa";

export default function AddMoneyPage() {
  const router = useRouter();

  // State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  
  // Manual Payment Inputs
  const [userNumber, setUserNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Auth & Data Fetching
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchPaymentMethods();
      } else {
        router.push("/login");
      }
    });

    const fetchPaymentMethods = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "paymentMethods"));
        const methods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPaymentMethods(methods);
      } catch (error) {
        console.error("Error fetching payment methods:", error);
      } finally {
        setLoading(false);
      }
    };

    return () => unsubscribeAuth();
  }, [router]);

  // 2. Logic Controllers
  const isGateway = (methodName) => {
    const name = methodName?.toLowerCase() || "";
    return name.includes("bkash") || name.includes("nagad");
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("কপি করা হয়েছে: " + text);
    });
  };

  const handleProcessRequest = async () => {
    const numAmount = parseFloat(amount);
    
    // Validation
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("অনুগ্রহ করে সঠিক অ্যামাউন্ট দিন।");
      return;
    }
    if (!selectedMethod) {
      alert("অনুগ্রহ করে পেমেন্ট মেথড সিলেক্ট করুন।");
      return;
    }

    // Logic for Gateways (bKash/Nagad auto)
    if (isGateway(selectedMethod.name)) {
      const pendingOrder = {
        userId: user.uid,
        gameId: "WALLET_TOPUP",
        gameName: "Add Money",
        packageAmount: numAmount, 
        packagePrice: numAmount,
        quantity: 1,
        totalPrice: numAmount,
        paymentMethodName: selectedMethod.name,
        paymentNumber: selectedMethod.number,
        paymentLogo: selectedMethod.logoUrl,
        orderType: 'add_money',
        playerId: 'Wallet Deposit' 
      };
      
      localStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));

      if (selectedMethod.name.toLowerCase().includes('bkash')) {
        router.push('/bkash-payment');
      } else {
        router.push('/nagad-payment');
      }
      return;
    }

    // Logic for Manual Payment
    if (!userNumber || !trxId) {
      alert("অনুগ্রহ করে পেমেন্ট নম্বর এবং ট্রানজেকশন আইডি দিন।");
      return;
    }

    setIsProcessing(true);

    try {
      await addDoc(collection(db, "moneyRequests"), {
        userId: user.uid,
        amount: numAmount,
        paymentMethod: selectedMethod.name,
        adminNumber: selectedMethod.number,
        userPaymentNumber: userNumber,
        transactionId: trxId,
        status: 'Pending',
        date: serverTimestamp()
      });

      alert("আপনার রিকোয়েস্টটি সফলভাবে পাঠানো হয়েছে!");
      router.push("/wallet");
    } catch (error) {
      alert("রিকোয়েস্ট করতে সমস্যা হয়েছে: " + error.message);
      setIsProcessing(false);
    }
  };

  // --- SKELETON LOADER ---
  if (loading) {
    return (
      <div id="skeleton-loader">
        <div className="flex items-center mb-6 pt-2">
            <div className="skeleton w-10 h-10 rounded-full mr-4"></div>
            <div className="skeleton h-7 w-32 rounded-lg"></div>
        </div>
        <div className="skeleton h-32 w-full rounded-3xl mb-6"></div>
        <div className="skeleton h-7 w-48 mb-5 rounded-lg"></div>
        <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-28 rounded-2xl"></div>
            <div className="skeleton h-28 rounded-2xl"></div>
            <div className="skeleton h-28 rounded-2xl"></div>
            <div className="skeleton h-28 rounded-2xl"></div>
        </div>
        <div className="skeleton h-14 w-full rounded-2xl mt-6"></div>
        
        {/* Skeleton CSS Scoped */}
        <style jsx>{`
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

  return (
    <div>
      <header className="page-header">
        <FaArrowLeft className="back-btn" onClick={() => router.push('/wallet')} />
        <h2>অ্যাড মানি</h2>
      </header>

      {/* Step 1: Amount */}
      <div className="topup-section">
        <h3 className="title"><span className="step-number">1</span>অ্যামাউন্ট লিখুন</h3>
        <div className="input-group"> 
            <input 
                type="number" 
                placeholder="e.g., 500" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            /> 
        </div>
      </div>

      {/* Step 2: Payment Method */}
      <div className="topup-section">
        <h3 className="title"><span className="step-number">2</span>পেমেন্ট মেথড বেছে নিন</h3>
        
        <div className="payment-grid">
            {paymentMethods.map((method) => (
                <div 
                    key={method.id}
                    className={`payment-item ${selectedMethod?.id === method.id ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod(method)}
                >
                    <img src={method.logoUrl} alt={method.name} />
                    <span>{method.name}</span>
                </div>
            ))}
        </div>
        
        {/* Manual Payment Details Form */}
        {selectedMethod && !isGateway(selectedMethod.name) && (
            <div className="mt-5 animate-fadeIn">
                <p className="text-center font-semibold mb-3">
                    নিচের নম্বরে টাকা পাঠান: <br />
                    <strong className="text-[var(--primary-purple)] text-lg mr-2">
                        {selectedMethod.number}
                    </strong>
                    <FaRegCopy 
                        className="copy-btn inline-block" 
                        onClick={() => handleCopy(selectedMethod.number)}
                    />
                </p>
                
                <div className="input-group mt-4">
                    <label>আপনার পেমেন্ট নম্বর</label>
                    <input 
                        type="tel" 
                        placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন" 
                        value={userNumber}
                        onChange={(e) => setUserNumber(e.target.value)}
                    />
                </div>
                
                <div className="input-group">
                    <label>ট্রানজেকশন আইডি</label>
                    <input 
                        type="text" 
                        placeholder="টাকা পাঠানোর পর প্রাপ্ত আইডি"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)} 
                    />
                </div>
            </div>
        )}
      </div>

      {/* Action Button */}
      <button 
        className="btn" 
        onClick={handleProcessRequest} 
        disabled={isProcessing}
      >
        {isProcessing ? "রিকোয়েস্ট পাঠানো হচ্ছে..." : (selectedMethod && isGateway(selectedMethod.name) ? "পরবর্তী ধাপ" : "রিকোয়েস্ট করুন")}
      </button>

      {/* Page Styles */}
      <style jsx>{`
        .page-header { display: flex; align-items: center; margin-bottom: 25px; padding-top: 10px; }
        .back-btn { font-size: 20px; cursor: pointer; margin-right: 15px; color: var(--primary-text-color); background: var(--card-bg-color); padding: 10px; border-radius: 50%; box-shadow: var(--soft-shadow); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;}
        .page-header h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }

        .topup-section { background-color: var(--card-bg-color); border-radius: 20px; padding: 25px; margin-bottom: 25px; box-shadow: var(--soft-shadow); }
        .title { font-size: 16px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; }
        .step-number { background: var(--primary-purple); color: white; border-radius: 50%; width: 26px; height: 26px; display: inline-flex; justify-content: center; align-items: center; font-weight: 700; margin-right: 12px; font-size: 13px; box-shadow: 0 4px 10px rgba(123, 97, 255, 0.4); }

        .input-group { margin-bottom: 20px; position: relative; }
        .input-group label { display: block; margin-bottom: 10px; font-weight: 600; font-size: 14px; color: var(--secondary-text-color); margin-left: 2px;}
        .input-group input { 
            width: 100%; padding: 18px; 
            background-color: var(--background-color); 
            border: 1px solid transparent; 
            border-radius: 14px; 
            font-size: 15px; color: var(--primary-text-color);
            transition: all 0.2s;
        }
        .input-group input:focus { border-color: var(--primary-purple); background-color: var(--card-bg-color); outline: none; box-shadow: 0 0 0 4px rgba(123, 97, 255, 0.1); }

        .payment-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .payment-item { 
            padding: 15px; min-height: 110px; 
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 8px; background-color: var(--background-color); 
            border: 2px solid transparent; border-radius: 14px; 
            cursor: pointer; transition: all 0.2s;
        }
        .payment-item:active { transform: scale(0.98); }
        .payment-item.selected { border-color: var(--primary-purple); background-color: rgba(123, 97, 255, 0.05); position: relative;}
        .payment-item.selected::after {
            content: ""; 
            position: absolute; top: 10px; right: 10px; 
            width: 10px; height: 10px; background: var(--primary-purple); border-radius: 50%;
        }
        .payment-item img { max-height: 45px; width: auto; object-fit: contain; margin-bottom: 5px; }
        .payment-item span { font-size: 13px; font-weight: 600; color: var(--primary-text-color); }

        .copy-btn { cursor: pointer; color: var(--primary-purple); background: rgba(123, 97, 255, 0.1); padding: 5px; border-radius: 6px; font-size: 14px; transition: 0.2s;}
        .copy-btn:active { transform: scale(0.9); }

        .btn { 
            display: block; width: 100%; 
            background: var(--primary-purple); 
            color: white; border: none; 
            padding: 18px; 
            border-radius: 14px; 
            font-size: 16px; font-weight: 600; 
            cursor: pointer; text-align: center; 
            transition: all 0.2s; 
            box-shadow: 0 8px 20px rgba(123, 97, 255, 0.25); 
        }
        .btn:active { transform: scale(0.98); }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
