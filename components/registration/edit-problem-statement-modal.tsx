"use client";

import { useState } from "react";
import { ExternalLink, X, Check } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Spinner } from "@/components/ui/spinner";

interface ProblemStatement {
  id: string;
  title: string;
  description?: string;
}

interface EditProblemStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatement: string;
  problemStatements: ProblemStatement[];
  onSubmit: (newStatementId: string, newTitle: string) => Promise<void>;
  isLoading?: boolean;
}

export function EditProblemStatementModal({
  isOpen,
  onClose,
  currentStatement,
  problemStatements,
  onSubmit,
  isLoading = false,
}: EditProblemStatementModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSelect = (ps: ProblemStatement) => {
    setSelectedId(ps.id);
    setSelectedTitle(ps.title);
  };

  const handleSubmit = async () => {
    if (!selectedId) return;
    await onSubmit(selectedId, selectedTitle);
    onClose();
  };

  const handleClose = () => {
    setSelectedId(null);
    setSelectedTitle("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change Problem Statement">
      <div className="flex flex-col gap-[20px]">
        {/* Current Statement */}
        <div className="flex flex-col gap-[8px]">
          <span className="text-[12px] text-white opacity-60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
            Current Selection
          </span>
          <div className="p-[12px] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-[8px]">
            <span className="text-[14px] text-white" style={{ fontFamily: 'var(--font-body)' }}>
              {currentStatement}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[rgba(255,255,255,0.1)]" />

        {/* Problem Statement Grid */}
        <div className="flex flex-col gap-[8px]">
          <span className="text-[12px] text-white opacity-60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
            Select New Problem Statement
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] max-h-[400px] overflow-y-auto pr-[8px]">
            {problemStatements.map((ps) => {
              const isSelected = selectedId === ps.id;
              const isCurrent = ps.title === currentStatement;
              
              return (
                <div
                  key={ps.id}
                  onClick={() => !isCurrent && handleSelect(ps)}
                  className={`
                    relative p-[14px] rounded-[10px] border-2 transition-all duration-200
                    ${isCurrent 
                      ? 'border-[rgba(255,255,255,0.2)] bg-[rgba(138,138,138,0.05)] opacity-70 cursor-not-allowed'
                      : isSelected 
                        ? 'border-[#22c55e] bg-[rgba(34,197,94,0.12)] shadow-[0_0_15px_rgba(34,197,94,0.25)] cursor-pointer' 
                        : 'border-[rgba(255,255,255,0.15)] bg-[rgba(138,138,138,0.08)] hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(138,138,138,0.12)] cursor-pointer'
                    }
                  `}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-[10px] right-[10px] w-[20px] h-[20px] rounded-full bg-[#22c55e] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  
                  {/* Current badge */}
                  {isCurrent && (
                    <div className="absolute top-[10px] right-[10px] px-[8px] py-[2px] rounded-full bg-[rgba(255,255,255,0.1)] text-[10px] text-white opacity-60">
                      Current
                    </div>
                  )}

                  <h4 className="text-[14px] font-semibold text-white mb-[6px] pr-[60px]" style={{ fontFamily: 'var(--font-body)' }}>
                    {ps.title}
                  </h4>
                  
                  {ps.description && (
                    <p className={`text-[12px] text-white opacity-60 ${expandedId === ps.id ? '' : 'line-clamp-2'}`} style={{ fontFamily: 'var(--font-body)' }}>
                      {ps.description}
                    </p>
                  )}
                  
                  {ps.description && ps.description.length > 100 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(expandedId === ps.id ? null : ps.id);
                      }}
                      className="mt-[6px] text-[11px] text-[#4ade80] hover:text-[#22c55e] transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {expandedId === ps.id ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-[12px] justify-end pt-[8px]">
          <Button onClick={handleClose} variant="secondary" disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="primary" 
            disabled={!selectedId || isLoading}
          >
            {isLoading && <Spinner size="sm" className="mr-2" />}
            {isLoading ? 'Saving...' : 'Confirm Change'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
