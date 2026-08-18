import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "warning";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  children,
  className = "",
  ...props
}) => {
  const baseStyles = "px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 inline-flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#2F6A55] hover:bg-[#245342] text-white shadow-sm shadow-[#2F6A55]/20",
    secondary: "bg-[#1F2A24] hover:bg-[#141C18] text-white shadow-sm",
    outline: "bg-white border border-[#E2E0D8] text-[#1F2A24] hover:bg-[#F5F3EE] hover:border-[#D5D2C8]",
    danger: "bg-[#B8483F] hover:bg-[#9A3B33] text-white shadow-sm shadow-[#B8483F]/20",
    warning: "bg-[#B8863B] hover:bg-[#996F2F] text-white shadow-sm shadow-[#B8863B]/20",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
