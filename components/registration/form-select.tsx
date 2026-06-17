import React from "react";

interface FormSelectProps {
  label: string;
  options: string[];
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function FormSelect({
  label,
  options,
  required = false,
  value,
  onChange,
}: FormSelectProps) {
  return (
    <div className="flex flex-col gap-[8px] w-full">
      <label className="text-[14px] text-white" style={{ fontFamily: 'var(--font-body)' }}>
        {label}{" "}
        {required && <span className="text-[#22c55e]">*</span>}
      </label>
      <select
        required={required}
        value={value}
        onChange={onChange}
        className="backdrop-blur-[2.5px] backdrop-filter bg-[rgba(138,138,138,0.2)] border border-[rgba(255,255,255,0.38)] border-solid rounded-[15px] px-[18px] py-[12px] text-white text-[14px] focus:outline-none focus:border-[#22c55e] focus:shadow-[0px_0px_10px_0px_rgba(34,197,94,0.3)] transition-all appearance-none cursor-pointer"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <option value="" className="bg-[#0a0a0a]">
          Select an option
        </option>
        {options.map((option) => (
          <option
            key={option}
            value={option}
            className="bg-[#0a0a0a]"
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

