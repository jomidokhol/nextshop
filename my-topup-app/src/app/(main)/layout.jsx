import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import SupportChat from "@/components/features/SupportChat";

export default function MainLayout({ children }) {
  return (
    <div className="app-container relative min-h-screen bg-[var(--background-color)]">
      
      {/* মাস্টার হেডার (index.html থেকে) */}
      <Header />

      {/* পেজ কন্টেন্ট (এখানে অন্যান্য পেজ লোড হবে) */}
      {/* প্যাডিং টপ এবং বটম দেওয়া হয়েছে যাতে হেডার ও ন্যাভবারের নিচে কন্টেন্ট না ঢাকা পড়ে */}
      <main style={{ paddingTop: '80px', paddingBottom: '100px' }}>
        {children}
      </main>

      {/* সাপোর্ট চ্যাট বাটন এবং মডাল */}
      <SupportChat />
      
      {/* মাস্টার বটম নেভিগেশন (index.html থেকে) */}
      <BottomNav />
      
    </div>
  );
}
