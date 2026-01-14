"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // ডিফল্ট হিসেবে ডার্ক মোড অন রাখা হচ্ছে (আপনার আগের HTML লজিক অনুযায়ী)
  const [isDarkMode, setIsDarkMode] = useState(true);

  // অ্যাপ লোড হওয়ার সময় থিম চেক করা
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    
    // যদি 'dark-mode' সেভ করা থাকে অথবা কোনো থিম সেভ না থাকে -> ডার্ক মোড অন
    if (storedTheme === "dark-mode" || !storedTheme) {
      setIsDarkMode(true);
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    } else {
      setIsDarkMode(false);
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
    }
  }, []);

  // থিম টগল ফাংশন
  const toggleTheme = () => {
    setIsDarkMode((prevMode) => {
      const newMode = !prevMode;
      
      if (newMode) {
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");
        localStorage.setItem("theme", "dark-mode");
      } else {
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");
        localStorage.setItem("theme", "light-mode");
      }
      
      return newMode;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// কাস্টম হুক (useTheme) যাতে অন্য পেজে সহজে ব্যবহার করা যায়
export const useTheme = () => {
  return useContext(ThemeContext);
};
