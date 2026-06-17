import React, { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

interface StickyAlertProps {
  type?: "success" | "error" | "warning" | "info";
  message: string;
  onClose: () => void;
  duration?: number;
}

export function StickyAlert({
  type = "info",
  message,
  onClose,
  duration = 5000,
}: StickyAlertProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    // Auto-hide after duration - errors stay longer so users can read them
    const effectiveDuration = type === 'error' ? Math.max(duration, 10000) : duration; // Errors stay at least 10 seconds
    if (effectiveDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to finish
      }, effectiveDuration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose, type]);

  useEffect(() => {
    // Check scroll position
    const handleScroll = () => {
      setIsAtTop(window.scrollY < 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getTypeClass = () => {
    switch (type) {
      case "success":
        return "bg-[rgba(34,197,94,0.3)] border-[#22c55e]";
      case "error":
        return "bg-black/60 border-[#22c55e]";
      case "warning":
        return "bg-[rgba(34,197,94,0.2)] border-[#4ade80]";
      default:
        return "bg-white/10 border-white/38";
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "success":
        return "text-white";
      case "error":
        return "text-[#22c55e]";
      case "warning":
        return "text-white";
      default:
        return "text-white";
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-[90px] left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-[600px] transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div
        className={`backdrop-blur-[8px] backdrop-filter rounded-[15px] p-[16px] border ${getTypeClass()} flex items-center gap-[12px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.4)] relative`}
      >
        <AlertCircle className={`w-5 h-5 flex-shrink-0 ${getIconColor()}`} />
        <span
          className="font-['Google_Sans_Flex',sans-serif] text-[14px] text-white flex-1"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {message}
        </span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-white hover:text-gray-300 transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

