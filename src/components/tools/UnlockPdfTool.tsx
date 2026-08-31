"use client";

import { useState, useRef, useEffect } from "react";
import {
  Unlock, AlertCircle, Loader2, Download, Upload, ShieldCheck, Eye, EyeOff, File
} from "lucide-react";
import { cn } from "@/lib/utils";
import { unlockPDF, isPDFEncrypted } from "@/lib/unlockPdf";

export function UnlockPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successFile, setSuccessFile] = useState<{ url: string, name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (successFile?.url) {
        URL.revokeObjectURL(successFile.url);
      }
    };
  }, [successFile]);

  const handleFileUpload = async (uploadedFile: File) => {
    if (uploadedFile.type !== "application/pdf" && !uploadedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }
    setFile(uploadedFile);
    setError(null);
    setSuccessFile(null);
    setPassword("");
    
    // Check encryption status
    try {
      const encrypted = await isPDFEncrypted(uploadedFile);
      setIsEncrypted(encrypted);
    } catch {
      setIsEncrypted(null);
    }
  };

  const handleUnlock = async () => {
    if (!file) return;
    if (!password) {
      setError("Password cannot be empty.");
      return;
    }
    
    setUnlocking(true);
    setError(null);
    
    try {
      // 1. Try instant client-side decryption first
      try {
        const decryptedBytes = await unlockPDF(file, password);
        const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setSuccessFile({
          url,
          name: file.name.replace(/\.pdf$/i, "_unlocked.pdf")
        });
        return;
      } catch (clientErr: any) {
        const errMsg = clientErr?.message?.toLowerCase() || "";
        // If it's a definite incorrect password, report it directly
        if (errMsg.includes("incorrect password") || errMsg.includes("password incorrect")) {
          throw clientErr;
        }

        // Otherwise attempt server-side fallback
        const formData = new FormData();
        formData.append("file", file);
        formData.append("password", password);

        const res = await fetch("/api/unlock-pdf", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to unlock PDF. Please check the password and try again.");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setSuccessFile({
          url,
          name: file.name.replace(/\.pdf$/i, "_unlocked.pdf")
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUnlocking(false);
    }
  };

  if (successFile) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-sm border border-[#E5E5E3] p-10 flex flex-col items-center max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#10B981]/10 flex items-center justify-center mb-6">
            <ShieldCheck className="w-10 h-10 text-[#10B981]" />
          </div>
          <h3 className="text-[24px] font-bold text-foreground mb-2">PDF Successfully Unlocked</h3>
          <p className="text-[14px] text-muted-foreground mb-8">
            The password protection has been completely removed from your document.
          </p>
          
          <div className="w-full bg-muted rounded-xl p-4 mb-8 text-left">
            <div className="flex items-center gap-3 mb-2">
              <File className="w-5 h-5 text-[#E8607A]" />
              <span className="text-[14px] font-bold text-foreground truncate">{successFile.name}</span>
            </div>
            <div className="text-[13px] text-muted-foreground flex items-center gap-2">
              <Unlock className="w-3.5 h-3.5" /> All restrictions removed
            </div>
          </div>
          
          <div className="flex gap-4 w-full">
            <button
              onClick={() => {
                setSuccessFile(null);
                setFile(null);
                setPassword("");
              }}
              className="flex-1 h-12 rounded-xl font-bold text-[14px] bg-muted text-foreground hover:bg-[#E5E5E3] transition-colors"
            >
              Unlock Another
            </button>
            <a
              href={successFile.url}
              download={successFile.name}
              className="flex-1 h-12 rounded-xl font-bold text-[14px] bg-[#E8607A] text-white hover:bg-[#D64E68] transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> Download
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative overflow-hidden">
      {/* ── Left Panel (Upload Area) ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative min-h-[50vh]">
        {!file ? (
          <div 
            className="w-full max-w-2xl bg-card border-2 border-dashed border-[#E5E5E3] rounded-3xl p-12 flex flex-col items-center text-center cursor-pointer hover:border-[#E8607A] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-[#E8607A]" />
            </div>
            <h3 className="text-[22px] font-bold text-foreground mb-2">Upload Protected PDF</h3>
            <p className="text-[15px] text-muted-foreground">
              Drag and drop your encrypted PDF here, or click to browse.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-card border border-[#E5E5E3] shadow-sm rounded-3xl p-8 flex flex-col items-center">
            <div className="w-24 h-32 bg-muted rounded-xl flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
              <File className="w-10 h-10 text-[#E8607A]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-card/90 rounded-full flex items-center justify-center shadow-sm">
                <LockIcon className="w-4 h-4 text-[#E8607A]" />
              </div>
            </div>
            <h3 className="text-[18px] font-bold text-foreground mb-1 truncate max-w-full text-center px-4">{file.name}</h3>
            <p className="text-[14px] text-muted-foreground mb-8">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <button
              onClick={() => setFile(null)}
              className="px-6 py-2 rounded-full font-bold text-[13px] bg-muted text-foreground hover:bg-[#E5E5E3] transition-colors"
            >
              Choose different file
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
          accept=".pdf"
          className="hidden"
        />
      </div>

      {/* ── Right Panel (Settings) ───────────────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[380px] bg-card border-t md:border-t-0 md:border-l border-border flex flex-col flex-shrink-0 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] h-[50vh] md:h-full">
        <div className="px-6 py-5 border-b border-border bg-muted/40 flex items-center gap-3">
          <Unlock className="w-5 h-5 text-[#E8607A]" />
          <h3 className="text-[15px] font-bold text-foreground">Unlock Settings</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#FEF2F2] rounded-xl border border-[#E8607A]/20 text-[#E8607A] shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-[13px] font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-[13px] font-bold text-foreground uppercase tracking-wider">PDF Password</h4>
            <p className="text-[13px] text-muted-foreground">
              Enter the password currently required to open this PDF.
            </p>
            
            <div className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !unlocking && file && password) {
                      handleUnlock();
                    }
                  }}
                  className="w-full h-12 pl-4 pr-12 border border-[#E5E5E3] rounded-xl text-[14px] focus:outline-none focus:border-[#E8607A] bg-card transition-colors"
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#A1A19D] hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[13px] font-bold text-foreground uppercase tracking-wider">Security Information</h4>
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 text-[13px] font-medium text-foreground">
                <AlertCircle className="w-4 h-4 text-[#E8607A]" />
                Password Protected: {!file ? "Waiting for file" : isEncrypted === true ? "Yes (Protected)" : isEncrypted === false ? "No (Not Protected)" : "Protected"}
              </div>
              <div className="flex items-center gap-3 text-[13px] font-medium text-foreground">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                {file ? (password ? "Ready for Unlocking" : "Enter password to proceed") : "Waiting for file"}
              </div>
            </div>
          </div>

        </div>
        
        {/* Action Footer */}
        <div className="p-6 bg-muted/40 border-t border-border flex-shrink-0">
          <button
            onClick={handleUnlock}
            disabled={unlocking || !file || !password}
            className={cn(
              "w-full h-14 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]",
              unlocking
                ? "bg-[#E8607A]/80 text-white cursor-wait"
                : !file || !password
                ? "bg-[#D1D1CE] text-white cursor-not-allowed shadow-none"
                : "bg-[#E8607A] hover:bg-[#D64E68] text-white hover:shadow-lg"
            )}
          >
            {unlocking ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Unlocking...</>
            ) : (
              <><Unlock className="w-6 h-6" /> Unlock PDF</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

// Internal helper for Lock icon if we want a different style in the preview
function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
