'use client';
import { useState } from 'react';

export default function SmartInput({ value, onChange, type = "text", placeholder = "", className = "" }) {
  const [isComposing, setIsComposing] = useState(false);

  const handleChange = (e) => {
    if (!isComposing) {
      onChange(e);
    }
  };

  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      className={`border border-gray-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      onChange={handleChange}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={(e) => {
        setIsComposing(false);
        onChange(e);
      }}
    />
  );
}
