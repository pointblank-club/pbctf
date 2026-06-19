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
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
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
  onFocus,
  error,
  disabled = false,
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordType = type === "password";
  const inputType = isPasswordType && showPassword ? "text" : type;

  return (
    <div className={`flex flex-col gap-2 w-full ${disabled ? "opacity-50" : ""}`}>
      <label className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-secondary flex items-center gap-1">
        <span className="text-brand opacity-50 leading-none">{">"}</span>
        {label}
        {required && <span className="text-brand">*</span>}
      </label>

      <div className="relative w-full flex items-center">
        <input
          type={inputType}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          className={[
            "w-full px-4 py-3 rounded-md",
            "bg-surface-inset",
            "border",
            error
              ? "border-[var(--danger)]/60"
              : "border-[var(--border-soft)] hover:border-[var(--border-default)]",
            "text-ink text-[14px] font-body",
            "placeholder:text-ink-disabled placeholder:font-light",
            "focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)]",
            "transition-[border-color,box-shadow,background] duration-150",
            "disabled:cursor-not-allowed",
            isPasswordType ? "pr-12" : "",
          ].join(" ")}
        />

        {isPasswordType && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 inline-flex items-center justify-center w-8 h-8 rounded text-ink-muted hover:text-brand transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error && (
        <span className="text-[12px] text-[var(--danger)] font-body flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-[var(--danger)]" />
          {error}
        </span>
      )}
    </div>
  );
}
