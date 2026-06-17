import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FormInputProps {
  label: string;
  type?: string;
  placeholder: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
}

export function FormInput({
  label,
  type = "text",
  placeholder,
  required = false,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordType = type === "password";
  const inputType = isPasswordType && showPassword ? "text" : type;

  return (
    <div className={`flex flex-col gap-[8px] w-full ${disabled ? "opacity-50" : ""}`}>
      <label className="text-[14px] text-white" style={{ fontFamily: 'var(--font-body)' }}>
        {label}{" "}
        {required && <span className="text-[#22c55e]">*</span>}
      </label>
      
      <div className="relative w-full flex items-center">
        <input
          type={inputType}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`backdrop-blur-[2.5px] backdrop-filter bg-[rgba(138,138,138,0.2)] border w-full ${
            error ? "border-[#22c55e]" : "border-[rgba(255,255,255,0.38)]"
          } border-solid rounded-[15px] pl-[18px] pr-[48px] py-[12px] text-white text-[14px] placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:border-[#22c55e] focus:shadow-[0px_0px_10px_0px_rgba(34,197,94,0.3)] transition-all disabled:cursor-not-allowed`}
          style={{ fontFamily: 'var(--font-body)' }}
        />

        {isPasswordType && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-[16px] flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-white select-none cursor-pointer focus:outline-none hover:scale-110 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-[18px] h-[18px]" />
            ) : (
              <Eye className="w-[18px] h-[18px]" />
            )}
          </button>
        )}
      </div>

      {error && (
        <span className="text-[12px] text-[#22c55e]" style={{ fontFamily: 'var(--font-body)' }}>
          {error}
        </span>
      )}
    </div>
  );
}