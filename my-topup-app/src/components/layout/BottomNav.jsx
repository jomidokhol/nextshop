"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaWallet, FaPlus, FaReceipt, FaUser } from "react-icons/fa";

export default function BottomNav() {
  const pathname = usePathname();

  // একটিভ ক্লাস চেক করার ফাংশন
  const isActive = (path) => pathname === path ? "active" : "";

  return (
    <nav className="bottom-nav">
      <Link href="/" className={`nav-item ${isActive("/")}`}>
        <FaHome /> <span>হোম</span>
      </Link>
      
      <Link href="/wallet" className={`nav-item ${isActive("/wallet")}`}>
        <FaWallet /> <span>ওয়ালেট</span>
      </Link>
      
      {/* অ্যাড মানি বাটন (মাঝখানে) */}
      <Link href="/add-money" className="nav-item nav-item-center">
        <div className="icon-bg">
          <FaPlus />
        </div>
        <span>অ্যাড</span>
      </Link>

      <Link href="/orders" className={`nav-item ${isActive("/orders")}`}>
        <FaReceipt /> <span>অর্ডার</span>
      </Link>

      <Link href="/profile" className={`nav-item ${isActive("/profile")}`}>
        <FaUser /> <span>প্রোফাইল</span>
      </Link>
    </nav>
  );
}
