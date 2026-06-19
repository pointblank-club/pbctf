"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/registration/button";
import { Download, ArrowLeft, ExternalLink, AlertOctagon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export default function ResumeViewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const rawUrl = params.get("url") || "";
  const ownerName = params.get("name") || "Operator";

  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  const handleBack = () => {
    if (window.history.length <= 1) {
      window.close();
      setTimeout(() => router.push("/dashboard"), 100);
    } else {
      router.back();
    }
  };

  const proxiedUrl = rawUrl
    ? `/api/resume/view?url=${encodeURIComponent(rawUrl)}`
    : "";

  if (!proxiedUrl) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertOctagon className="w-8 h-8 text-[var(--danger)]" />
        <h1 className="font-heading text-[20px] font-semibold text-ink">
          Missing resume URL
        </h1>
        <p className="text-[13px] text-ink-muted font-body max-w-[42ch]">
          The resume viewer needs a resume URL passed as the{" "}
          <code className="font-mono text-brand">?url=</code> query parameter.
        </p>
        <Button onClick={handleBack} variant="secondary">
          <ArrowLeft className="w-3.5 h-3.5" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
            &gt; viewing resume
          </div>
          <h1 className="font-heading text-[22px] sm:text-[26px] font-bold text-ink tracking-tight truncate">
            {ownerName}&apos;s resume
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleBack} variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
          <Button
            onClick={() => window.open(proxiedUrl, "_blank", "noopener,noreferrer")}
            variant="secondary"
            size="sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Raw tab
          </Button>
          <Button
            onClick={() => {
              const link = document.createElement("a");
              link.href = proxiedUrl;
              link.download = `${ownerName.replace(/\s+/g, "_")}_resume.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            variant="primary"
            size="sm"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF frame */}
      <div className="relative w-full rounded-lg border border-[var(--border-soft)] bg-surface-1 shadow-card overflow-hidden">
        {iframeLoading && !iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-surface-1">
            <Spinner size="lg" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-brand opacity-70">
              Decrypting document...
            </span>
          </div>
        )}
        {iframeError && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 px-6 text-center">
            <AlertOctagon className="w-8 h-8 text-[var(--danger)]" />
            <h2 className="font-heading text-[18px] font-semibold text-ink">
              Could not preview the resume
            </h2>
            <p className="text-[13px] text-ink-muted font-body max-w-[44ch]">
              Your browser may have blocked the embed. Try opening the raw tab
              or downloading the PDF.
            </p>
          </div>
        )}
        <iframe
          src={proxiedUrl}
          title={`${ownerName}'s resume`}
          className={[
            "w-full h-[78vh] min-h-[640px] bg-surface-inset",
            iframeError ? "hidden" : "block",
          ].join(" ")}
          onLoad={() => setIframeLoading(false)}
          onError={() => {
            setIframeLoading(false);
            setIframeError(true);
          }}
        />
      </div>
    </div>
  );
}
