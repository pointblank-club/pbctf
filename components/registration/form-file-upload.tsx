import React from "react";
import { Upload } from "lucide-react";

interface FormFileUploadProps {
  label: string;
  accept?: string;
  required?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentFile?: string;
}

interface FormFileUploadProps {
  label: string;
  accept?: string;
  required?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentFile?: string;
  maxSizeMB?: number;
}

export function FormFileUpload({
  label,
  accept,
  required = false,
  onChange,
  currentFile,
  maxSizeMB = 1,
}: FormFileUploadProps) {
  const truncateFileName = (fileName: string, maxLength: number = 25): string => {
    if (fileName.length <= maxLength) {
      return fileName;
    }
    
    // Get file extension
    const lastDotIndex = fileName.lastIndexOf('.');
    const hasExtension = lastDotIndex !== -1;
    const extension = hasExtension ? fileName.substring(lastDotIndex) : '';
    const nameWithoutExt = hasExtension ? fileName.substring(0, lastDotIndex) : fileName;
    
    // Calculate available length for the name part (excluding extension and ellipsis)
    const ellipsisLength = 3; // '...'
    const availableLength = maxLength - extension.length - ellipsisLength;
    
    if (nameWithoutExt.length <= availableLength) {
      return fileName;
    }
    
    // Split available length in half for beginning and end
    // Make sure we always show some characters from both ends
    const frontLength = Math.max(1, Math.floor(availableLength / 2));
    const backLength = Math.max(1, availableLength - frontLength);
    
    // Get beginning and end parts of the name (before extension)
    const frontPart = nameWithoutExt.substring(0, frontLength);
    const backPart = nameWithoutExt.substring(nameWithoutExt.length - backLength);
    
    // Combine: front + ... + back + extension (extension always preserved)
    return frontPart + '...' + backPart + extension;
  };

  return (
    <div className="flex flex-col gap-[8px] w-full">
      <label className="text-[14px] text-white" style={{ fontFamily: 'var(--font-body)' }}>
        {label}{" "}
        {required && <span className="text-[#22c55e]">*</span>}
        <span className="text-[12px] text-white/60 ml-2">(Max {maxSizeMB}MB)</span>
      </label>
      <div className="backdrop-blur-[2.5px] backdrop-filter bg-[rgba(138,138,138,0.2)] border border-[rgba(255,255,255,0.38)] border-solid rounded-[15px] px-[18px] py-[12px] cursor-pointer hover:border-[#22c55e] transition-all relative">
        <input
          type="file"
          accept={accept}
          required={required}
          onChange={onChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="flex items-center gap-[12px] text-[rgba(255,255,255,0.7)]">
          <Upload className="w-5 h-5 flex-shrink-0" />
          <span className="text-[14px] truncate" style={{ fontFamily: 'var(--font-body)' }} title={currentFile}>
            {currentFile
              ? truncateFileName(currentFile)
              : "Click to upload or drag and drop"}
          </span>
        </div>
      </div>
    </div>
  );
}

