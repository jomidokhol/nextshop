"use client";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FaWhatsapp, FaTelegramPlane } from "react-icons/fa";

export default function Footer() {
  const [contactInfo, setContactInfo] = useState({});
  const [appInfo, setAppInfo] = useState({});
  const [terms, setTerms] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const contactSnap = await getDoc(doc(db, "settings", "contact"));
        if (contactSnap.exists()) setContactInfo(contactSnap.data());

        const appSnap = await getDoc(doc(db, "settings", "app"));
        if (appSnap.exists()) setAppInfo(appSnap.data());

        const termsSnap = await getDoc(doc(db, "settings", "terms"));
        if (termsSnap.exists()) setTerms(termsSnap.data());
      } catch (error) {
        console.error("Error fetching footer data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Terms Section */}
        {terms && terms.text && (
          <div id="termsContainer">
            <h3 id="termsTitle">{terms.title || "Terms & Conditions"}</h3>
            <p id="termsText" style={{ whiteSpace: "pre-wrap" }}>{terms.text}</p>
          </div>
        )}

        <h3>STAY CONNECTED</h3>
        <span className="brand-name" id="footerBrandName">VERCEL TOP UP</span>
        <p id="footerAddress">{contactInfo.address || "Lalpur Road # 17, Natore, Rajshahi"}</p>

        <h3>OUR MOBILE APP</h3>
        <p>Download our official app</p>
        <a 
          href={appInfo.playStoreLink || "#"} 
          target="_blank" 
          className="play-store-btn"
          style={{ display: appInfo.playStoreLink ? 'inline-block' : 'none' }}
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" />
        </a>

        <h3>SUPPORT CENTER</h3>

        <a href={contactInfo.whatsappLink || "#"} className="support-box" target="_blank">
          <div className="icon"><FaWhatsapp /></div>
          <div className="divider"></div>
          <div className="text-content">
            <span className="time-text">Status: {contactInfo.whatsappStatus || "Offline"}</span>
            <span className="support-text">WhatsApp Live Support</span>
          </div>
        </a>

        <a href={contactInfo.telegramLink || "#"} className="support-box" target="_blank">
          <div className="icon"><FaTelegramPlane /></div>
          <div className="divider"></div>
          <div className="text-content">
            <span className="time-text">Status: {contactInfo.telegramStatus || "Offline"}</span>
            <span className="support-text">Telegram Live Support</span>
          </div>
        </a>
      </div>

      <div className="footer-copyright">
        &copy; <span id="copyrightYear">{new Date().getFullYear()}</span> <span className="copyright-brand-highlight">Vercel Top Up</span>. All Rights Reserved.
      </div>
    </footer>
  );
}