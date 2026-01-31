import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'error' | 'blue' | 'magenta' | 'filledSuccess' | 'filledWarning' | 'filledError';
  className?: string;
  onClick?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '', onClick }) => {
  // Brutalist: rounded-none, uppercase, tracking-wider
  const baseStyles = "inline-flex items-center px-3 py-1 text-[10px] uppercase tracking-wider font-bold transition-all duration-150 border rounded-none";
  
  const variants = {
    default: "bg-zinc-900 border-zinc-700 text-zinc-300",
    outline: "bg-transparent border-zinc-700 text-zinc-400",
    success: "bg-green-950/30 border-green-500/50 text-green-400",
    warning: "bg-yellow-950/30 border-yellow-500/50 text-yellow-400",
    error: "bg-red-950/30 border-red-500/50 text-red-500",
    blue: "bg-blue-950/30 border-blue-500 text-blue-400",
    magenta: "bg-pink-950/30 border-pink-500 text-pink-400",
    
    // Filled variants for high emphasis
    filledSuccess: "bg-green-600 border-green-600 text-black",
    filledWarning: "bg-yellow-500 border-yellow-500 text-black",
    filledError: "bg-red-600 border-red-600 text-white",
  } as any;

  const clickableStyles = onClick ? "cursor-pointer hover:bg-zinc-800 active:translate-y-0.5" : "";

  return (
    <span 
      className={`${baseStyles} ${variants[variant]} ${clickableStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </span>
  );
};
