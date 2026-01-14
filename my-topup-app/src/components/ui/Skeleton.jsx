import React from 'react';

/**
 * Skeleton Component
 * এটি লোডিং স্টেটের জন্য ব্যবহার করা হয়।
 * 
 * ব্যবহারবিধি:
 * <Skeleton className="h-10 w-10 rounded-full" /> // গোল অবতারের জন্য
 * <Skeleton className="h-4 w-full rounded" /> // টেক্সট লাইনের জন্য
 */

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      // 'skeleton' ক্লাসটি globals.css থেকে এনিমেশন এবং ব্যাকগ্রাউন্ড কালার নিবে
      className={`skeleton ${className || ""}`}
      {...props}
    />
  );
};

export default Skeleton;
