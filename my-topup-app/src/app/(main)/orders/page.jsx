"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  runTransaction, 
  updateDoc 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { 
  FaReceipt, 
  FaCogs, 
  FaBoxOpen, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaBan, 
  FaRegCopy, 
  FaExclamationTriangle 
} from "react-icons/fa";

export default function OrdersPage() {
  const router = useRouter();

  // State
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ playerId: "", transactionId: "" });
  
  // Toast State
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const EDIT_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

  // 1. Auth & Data Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
        const unsubscribeOrders = onSnapshot(q, (snapshot) => {
          let ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort by date descending
          ordersList.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
          setOrders(ordersList);
          setLoading(false);
        }, (error) => {
          console.error("Error loading orders:", error);
          setLoading(false);
        });

        return () => unsubscribeOrders();
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // Helper: Show Toast
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // Helper: Copy to Clipboard
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast("কপি করা হয়েছে!", "success");
    }).catch(() => {
      showToast("কপি করা সম্ভব হয়নি।", "error");
    });
  };

  // Action: Cancel Order
  const handleCancelOrder = async (orderId, paymentMethod, price) => {
    if (!confirm('আপনি কি নিশ্চিতভাবে এই অর্ডারটি মুছে ফেলতে চান? যদি ওয়ালেট দিয়ে পেমেন্ট করে থাকেন, তবে টাকা ফেরত দেওয়া হবে।')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "orders", orderId);
        const orderDoc = await transaction.get(orderRef);
        
        if (!orderDoc.exists()) throw "অর্ডারটি পাওয়া যায়নি।";
        
        const orderData = orderDoc.data();
        if (orderData.status !== 'Pending' && orderData.status !== 'Approved') {
            throw "এই অর্ডারটি এখন আর ক্যানসেল করা যাবে না।";
        }

        // Refund logic for Wallet
        if (orderData.paymentMethod === 'Wallet' || orderData.paymentMethod === 'My Wallet') {
            const userRef = doc(db, "users", orderData.userId);
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists()) {
                const currentBalance = parseFloat(userDoc.data().walletBalance) || 0;
                const refundAmount = parseFloat(price);
                transaction.update(userRef, { walletBalance: currentBalance + refundAmount });
            }
        }
        
        transaction.update(orderRef, { status: 'Canceled' });
      });
      showToast('অর্ডারটি সফলভাবে বাতিল করা হয়েছে।', 'success');
    } catch (error) {
      showToast('সমস্যা হয়েছে: ' + (error.message || error), 'error');
    }
  };

  // Action: Enable Edit Mode
  const startEditing = (order) => {
    setEditingId(order.id);
    setEditForm({
      playerId: order.playerId || "",
      transactionId: order.transactionId === 'WALLET_PAY' ? "" : (order.transactionId || "")
    });
  };

  // Action: Save Edits
  const saveEdit = async (orderId) => {
    if (!editForm.playerId.trim()) {
        showToast('প্লেয়ার আইডি খালি রাখা যাবে না।', 'error');
        return;
    }

    try {
        const updates = { playerId: editForm.playerId };
        if (editForm.transactionId) {
            updates.transactionId = editForm.transactionId;
        }
        
        await updateDoc(doc(db, "orders", orderId), updates);
        showToast('অর্ডার সফলভাবে আপডেট করা হয়েছে!', 'success');
        setEditingId(null);
    } catch (e) {
        showToast('আপডেট করতে সমস্যা হয়েছে: ' + e.message, 'error');
    }
  };

  // --- RENDER HELPERS ---
  const getStatusColor = (status) => {
    switch(status) {
        case 'Pending': return 'var(--accent-orange)'; // Orange
        case 'Approved': return 'var(--accent-orange)'; // Orange
        case 'Completed': return 'var(--accent-green)'; // Green
        case 'Canceled': return 'var(--accent-red)'; // Red
        case 'Rejected': return 'var(--accent-gray)'; // Gray
        default: return 'var(--secondary-text-color)';
    }
  };

  const getProgressClass = (status) => {
      return status ? status.toLowerCase() : 'pending';
  };

  if (loading) {
    return (
      <div id="skeleton-loader">
        <div className="skeleton h-8 w-40 mx-auto mb-6 rounded-lg"></div>
        {[1, 2].map((i) => (
            <div key={i} className="skeleton-card">
                <div className="flex justify-between items-center mb-4">
                    <div className="skeleton h-6 w-1/3 rounded"></div>
                    <div className="skeleton h-6 w-20 rounded-full"></div>
                </div>
                <div className="skeleton h-4 w-full rounded mb-2"></div>
                <div className="skeleton h-16 w-full rounded mb-4"></div>
                <div className="skeleton h-20 w-full rounded"></div>
            </div>
        ))}
        {/* CSS for Skeleton */}
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
            .skeleton-card {
                background-color: var(--card-bg-color);
                border-radius: 20px; padding: 25px; margin-bottom: 15px;
                box-shadow: var(--soft-shadow);
            }
            @keyframes skeleton-wave { 0% { left: -150%; } 100% { left: 150%; } }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <header className="page-header flex justify-center pt-2 mb-6">
        <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--primary-text-color)]">
            মাই অর্ডার
        </h2>
      </header>

      <div id="orderHistoryContainer">
        {orders.length === 0 ? (
            <div className="empty-state">
                <FaReceipt className="text-5xl mx-auto mb-4 text-[var(--light-purple)]" />
                <p>কোনো অর্ডার পাওয়া যায়নি।</p>
            </div>
        ) : (
            orders.map(order => {
                const orderDate = order.date ? order.date.toDate() : new Date();
                const isEditable = (new Date() - orderDate) < EDIT_WINDOW_MS && order.status === 'Pending';
                const statusClass = getProgressClass(order.status);
                const isCompleted = order.status === 'Completed';
                const isPendingOrApproved = order.status === 'Pending' || order.status === 'Approved';
                
                // Determine icons based on status
                let StatusIcon = FaBoxOpen;
                let statusText = "ডেলিভার্ড";
                if (order.status === 'Completed') { StatusIcon = FaCheckCircle; statusText = "ডেলিভার্ড"; }
                else if (order.status === 'Canceled') { StatusIcon = FaTimesCircle; statusText = "ক্যানসেল"; }
                else if (order.status === 'Rejected') { StatusIcon = FaBan; statusText = "রিজেক্টেড"; }

                return (
                    <div key={order.id} className={`order-tracker-card ${statusClass}`}>
                        
                        {/* Header */}
                        <div className="header">
                            <h1>{order.game}</h1>
                            <span className="status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
                                {order.status}
                            </span>
                        </div>
                        
                        {/* Order ID */}
                        <div className="order-id">
                            <span>#ORD-{order.id.substring(0, 8).toUpperCase()}</span>
                            <span className="copy-icon" onClick={() => handleCopy(order.id)}>
                                <FaRegCopy />
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="progress-bar">
                            <div className="step step-1">
                                <div className="icon"><FaReceipt /></div>
                                <p>রিসিভড</p>
                            </div>
                            <div className="line line-1"><div className="line-fill"></div></div>
                            
                            <div className="step step-2">
                                <div className="icon"><FaCogs /></div>
                                <p>প্রসেসিং</p>
                            </div>
                            <div className="line line-2"><div className="line-fill"></div></div>
                            
                            <div className="step step-3">
                                <div className="icon"><StatusIcon /></div>
                                <p>{statusText}</p>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="order-details">
                            <div className="detail-item">
                                <span>প্যাকেজ</span>
                                <span>{order.package} {order.quantity ? `x ${order.quantity}` : ''}</span>
                            </div>
                            
                            {/* Player ID (Editable) */}
                            <div className="detail-item">
                                <span>{order.inputTypeLabel || 'প্লেয়ার আইডি'}</span>
                                {editingId === order.id ? (
                                    <input 
                                        className="inline-edit-input"
                                        value={editForm.playerId}
                                        onChange={(e) => setEditForm({...editForm, playerId: e.target.value})}
                                    />
                                ) : (
                                    <span style={{wordBreak: 'break-all'}}>{order.playerId}</span>
                                )}
                            </div>

                            {/* Payment Info / TrxID (Editable if manual) */}
                            {order.transactionId === 'WALLET_PAY' ? (
                                <div className="detail-item"><span>Payment</span><span>Wallet</span></div>
                            ) : (
                                <div className="detail-item">
                                    <span>TrxID</span>
                                    {editingId === order.id ? (
                                        <input 
                                            className="inline-edit-input"
                                            value={editForm.transactionId}
                                            onChange={(e) => setEditForm({...editForm, transactionId: e.target.value})}
                                        />
                                    ) : (
                                        <span>{order.transactionId || 'N/A'}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="total-amount">
                            <span>মোট পরিমাণ</span>
                            <span>৳ {parseFloat(order.price).toFixed(2)}</span>
                        </div>
                        
                        <div className="footer">
                            <span>{orderDate.toLocaleDateString('bn-BD')}</span>
                            <span>{orderDate.toLocaleTimeString('bn-BD', { hour: '2-digit', minute:'2-digit' })}</span>
                        </div>

                        {/* Dynamic Footer (Admin Msg / Buttons) */}
                        <div className="dynamic-footer">
                            {/* Admin Code/Note */}
                            {(order.adminNote || order.voucherCode) && isCompleted && (
                                <div className="admin-message">
                                    <div className="admin-message-header">
                                        <p>CODE</p>
                                        <span className="copy-icon" onClick={() => handleCopy(order.adminNote || order.voucherCode)}>
                                            <FaRegCopy />
                                        </span>
                                    </div>
                                    <p className="code-text">{order.adminNote || order.voucherCode}</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {isPendingOrApproved && (
                                <div className="action-buttons">
                                    {isEditable && (
                                        <button 
                                            className="btn btn-edit" 
                                            onClick={() => editingId === order.id ? saveEdit(order.id) : startEditing(order)}
                                        >
                                            {editingId === order.id ? 'সেভ' : 'এডিট'}
                                        </button>
                                    )}
                                    <button 
                                        className="btn btn-cancel" 
                                        onClick={() => handleCancelOrder(order.id, order.paymentMethod, order.price)}
                                    >
                                        অর্ডার বাতিল
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Toast Notification */}
      <div className={`toast-notification ${toast.type} ${toast.show ? 'show' : ''}`}>
        {toast.type === 'success' ? <FaCheckCircle className="mr-2" /> : <FaTimesCircle className="mr-2" />}
        {toast.message}
      </div>

      {/* Styles */}
      <style jsx>{`
        /* Reuse CSS logic from orders.html using standard classes & Styled JSX */
        .empty-state { text-align: center; padding: 60px 20px; color: var(--secondary-text-color); }
        .empty-state p { font-size: 16px; font-weight: 500; }

        /* Card Base */
        .order-tracker-card {
            background-color: var(--card-bg-color);
            border-radius: 20px; padding: 25px; width: 100%;
            box-shadow: var(--soft-shadow); position: relative; overflow: hidden;
            margin-bottom: 15px; transition: all 0.5s ease;
        }
        
        /* Header */
        .order-tracker-card .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .order-tracker-card .header h1 { font-size: 1.5em; font-weight: 600; margin: 0; color: var(--primary-text-color); }
        .status-badge { padding: 5px 14px; border-radius: 20px; font-size: 0.8em; font-weight: 700; color: white; }
        
        .order-id { color: var(--secondary-text-color); font-size: 0.9em; margin-bottom: 25px; display: flex; align-items: center; gap: 8px; }
        .copy-icon { cursor: pointer; padding: 4px; }
        .copy-icon:active { transform: scale(0.9); }

        /* Progress Bar */
        .progress-bar { display: flex; justify-content: space-between; margin-bottom: 35px; padding: 0 5px; }
        .step { text-align: center; position: relative; z-index: 1; width: 60px; }
        .step .icon {
            width: 45px; height: 45px; border-radius: 50%;
            background-color: var(--card-item-bg);
            border: 2px solid var(--card-border-color);
            display: flex; justify-content: center; align-items: center;
            margin: 0 auto 10px; font-size: 1.3em; color: var(--secondary-text-color);
            transition: all 0.5s ease;
        }
        .step p { font-size: 0.75em; color: var(--secondary-text-color); margin: 0; font-weight: 500; }
        
        .line { flex-grow: 1; height: 4px; background-color: var(--card-border-color); position: relative; margin: 0 -20px; top: 22px; }
        .line-fill {
            position: absolute; top: 0; left: 0; height: 100%; width: 100%;
            background-color: var(--accent-green);
            transform-origin: left; transform: scaleX(0); transition: transform 0.5s ease, background-color 0.5s ease;
        }

        /* Order Details */
        .order-details { margin-bottom: 20px; }
        .detail-item { display: flex; justify-content: space-between; align-items: center; padding: 14px; background-color: var(--card-item-bg); border-radius: 12px; margin-bottom: 10px; }
        .detail-item span:first-child { color: var(--secondary-text-color); font-size: 0.9em; }
        .detail-item span:last-child { font-weight: 500; color: var(--primary-text-color); text-align: right; }
        
        .inline-edit-input {
            background-color: var(--card-bg-color); color: var(--primary-text-color);
            border: 1px solid var(--primary-purple); border-radius: 6px;
            text-align: right; width: 100%; max-width: 160px; padding: 4px 8px; outline: none;
        }

        .total-amount { display: flex; justify-content: space-between; padding: 18px; border-radius: 12px; margin-bottom: 20px; font-size: 1.1em; font-weight: bold; transition: background-color 0.5s ease; }
        .footer { display: flex; justify-content: space-between; color: var(--secondary-text-color); font-size: 0.8em; }

        /* Dynamic Footer */
        .dynamic-footer { margin-top: 0; min-height: 0; transition: all 0.4s ease; position: relative; }
        .pending .dynamic-footer { margin-top: 20px; min-height: 60px; }
        .completed .dynamic-footer { margin-top: 20px; min-height: 85px; }

        .admin-message { background-color: rgba(52, 199, 89, 0.1); border: 1px solid rgba(52, 199, 89, 0.5); border-radius: 12px; padding: 15px; text-align: left; margin-bottom: 10px; }
        .admin-message-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .admin-message-header p { margin: 0; color: var(--secondary-text-color); font-size: 0.9em; }
        .code-text { margin: 0; font-size: 1.1em; font-weight: 500; color: var(--primary-text-color); word-break: break-all; }

        .action-buttons { display: flex; gap: 15px; }
        .btn { display: block; width: 100%; border: none; padding: 14px; border-radius: 14px; font-size: 1em; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.2s; }
        .btn-edit { background-color: var(--secondary-text-color); color: white; }
        .btn-cancel { background-color: var(--accent-red); color: white; }

        /* State Specific Styling */
        .pending .total-amount, .approved .total-amount { background-color: rgba(255, 149, 0, 0.15); }
        .pending .step-1 .icon, .pending .step-2 .icon, .approved .step-1 .icon, .approved .step-2 .icon { background-color: var(--accent-orange); border-color: var(--accent-orange); color: white; }
        .pending .line-1 .line-fill, .approved .line-1 .line-fill { transform: scaleX(1); background-color: var(--accent-orange); }
        .pending .step-2 .icon svg { animation: pulse 1.5s infinite ease-in-out; }

        .completed .total-amount { background-color: rgba(52, 199, 89, 0.15); }
        .completed .step .icon { background-color: var(--accent-green); border-color: var(--accent-green); color: white; }
        .completed .line-fill { background-color: var(--accent-green); transform: scaleX(1); }

        .canceled .total-amount { background-color: rgba(255, 59, 48, 0.15); }
        .canceled .step-1 .icon { background-color: var(--accent-green); border-color: var(--accent-green); color: white; }
        .canceled .step-2 .icon, .canceled .step-3 .icon { background-color: var(--accent-red); border-color: var(--accent-red); color: white; }
        .canceled .line-1 .line-fill { transform: scaleX(1); background-color: var(--accent-green); }
        .canceled .line-2 .line-fill { background-color: var(--accent-red); transform: scaleX(1); }

        .rejected .total-amount { background-color: rgba(142, 142, 147, 0.15); }
        /* Similar logic for rejected... skipping distinct colors to save space, using gray */
        
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }

        /* Toast */
        .toast-notification {
            position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(20px);
            background-color: rgba(20, 20, 20, 0.9); color: white;
            padding: 12px 20px; border-radius: 14px;
            box-shadow: var(--soft-shadow); z-index: 9999; font-size: 14px; font-weight: 500;
            opacity: 0; visibility: hidden; transition: all 0.3s;
            display: flex; align-items: center;
        }
        .toast-notification.show { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
        .toast-notification.error { background-color: var(--accent-red); }
        .toast-notification.success { background-color: var(--accent-green); }
      `}</style>
    </div>
  );
}
