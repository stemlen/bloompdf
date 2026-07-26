"use client";

import { useState, useRef, useMemo } from "react";
import {
  Lock, AlertCircle, Loader2, Download, Upload, Shield, Eye, EyeOff, File
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ProtectPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [protecting, setProtecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFile, setSuccessFile] = useState<{ url: string, name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (uploadedFile: File) => {
    if (uploadedFile.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }
    setFile(uploadedFile);
    setError(null);
    setSuccessFile(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleProtect = async () => {
    if (!file) return;
    if (!password) {
      setError("Password cannot be empty.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setProtecting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("password", password);

      const res = await fetch("/api/protect-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to protect PDF.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setSuccessFile({
        url,
        name: file.name.replace(/\.pdf$/i, "_protected.pdf")
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProtecting(false);
    }
  };

  const strength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length > 5) score += 1;
    if (password.length > 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabel = strength === 0 ? "None" : strength < 3 ? "Weak" : strength < 5 ? "Medium" : "Strong";
  const strengthColor = strength === 0 ? "bg-[#E5E5E3]" : strength < 3 ? "bg-[#E8607A]" : strength < 5 ? "bg-[#F59E0B]" : "bg-[#10B981]";

  if (successFile) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-sm border border-[#E5E5E3] p-10 flex flex-col items-center max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#E8607A]/10 flex items-center justify-center mb-6">
            <Shield className="w-10 h-10 text-[#E8607A]" />
          </div>
          <h3 className="text-[24px] font-bold text-foreground mb-2">PDF Protected</h3>
          <p className="text-[14px] text-muted-foreground mb-8">
            Your document has been successfully encrypted and protected with a password.
          </p>
          
          <div className="w-full bg-muted rounded-xl p-4 mb-8 text-left">
            <div className="flex items-center gap-3 mb-2">
              <File className="w-5 h-5 text-[#E8607A]" />
              <span className="text-[14px] font-bold text-foreground truncate">{successFile.name}</span>
            </div>
            <div className="text-[13px] text-muted-foreground flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> 256-bit AES Encryption Applied
            </div>
          </div>
          
          <div className="flex gap-4 w-full">
            <button
              onClick={() => {
                setSuccessFile(null);
                setFile(null);
                setPassword("");
                setConfirmPassword("");
              }}
              className="flex-1 h-12 rounded-xl font-bold text-[14px] bg-muted text-foreground hover:bg-[#E5E5E3] transition-colors"
            >
              Protect Another
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
            <h3 className="text-[22px] font-bold text-foreground mb-2">Upload PDF</h3>
            <p className="text-[15px] text-muted-foreground">
              Drag and drop your PDF here, or click to browse.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-card border border-[#E5E5E3] shadow-sm rounded-3xl p-8 flex flex-col items-center">
            <div className="w-24 h-32 bg-muted rounded-xl flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
              <File className="w-10 h-10 text-[#E8607A]" />
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
          <Shield className="w-5 h-5 text-[#E8607A]" />
          <h3 className="text-[15px] font-bold text-foreground">Security Settings</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#FEF2F2] rounded-xl border border-[#E8607A]/20 text-[#E8607A] shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-[13px] font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-[13px] font-bold text-foreground uppercase tracking-wider">Open Password</h4>
            <p className="text-[13px] text-muted-foreground">
              Users must enter this password to open the PDF.
            </p>
            
            <div className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-4 pr-12 border border-[#E5E5E3] rounded-xl text-[14px] focus:outline-none focus:border-[#E8607A] bg-card transition-colors"
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#A1A19D] hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="space-y-1.5 px-1">
                  <div className="flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                    <span>Password Strength</span>
                    <span className={cn(
                      strength < 3 ? "text-[#E8607A]" : strength < 5 ? "text-[#F59E0B]" : "text-[#10B981]"
                    )}>{strengthLabel}</span>
                  </div>
                  <div className="flex gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-300", strengthColor)} style={{ width: strength > 0 ? "25%" : "0%" }} />
                    <div className={cn("h-full transition-all duration-300", strength > 2 ? strengthColor : "bg-[#E5E5E3]")} style={{ width: strength > 2 ? "25%" : "0%" }} />
                    <div className={cn("h-full transition-all duration-300", strength > 4 ? strengthColor : "bg-[#E5E5E3]")} style={{ width: strength > 4 ? "25%" : "0%" }} />
                    <div className={cn("h-full transition-all duration-300", strength > 5 ? strengthColor : "bg-[#E5E5E3]")} style={{ width: strength > 5 ? "25%" : "0%" }} />
                  </div>
                </div>
              )}

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "w-full h-12 px-4 border rounded-xl text-[14px] focus:outline-none transition-colors",
                  confirmPassword && password !== confirmPassword 
                    ? "border-[#E8607A] bg-[#FEF2F2]/50" 
                    : "border-[#E5E5E3] focus:border-[#E8607A] bg-card"
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[13px] font-bold text-foreground uppercase tracking-wider">Security Summary</h4>
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 text-[13px] font-medium text-foreground">
                <Shield className="w-4 h-4 text-[#10B981]" />
                Encryption Enabled (AES)
              </div>
              <div className="flex items-center gap-3 text-[13px] font-medium text-foreground">
                <Lock className="w-4 h-4 text-[#E8607A]" />
                Password Protection {password ? "Ready" : "Pending"}
              </div>
            </div>
          </div>

        </div>
        
        {/* Action Footer */}
        <div className="p-6 bg-muted/40 border-t border-border flex-shrink-0">
          <button
            onClick={handleProtect}
            disabled={protecting || !file || !password || password !== confirmPassword}
            className={cn(
              "w-full h-14 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]",
              protecting
                ? "bg-[#E8607A]/80 text-white cursor-wait"
                : !file || !password || password !== confirmPassword
                ? "bg-[#D1D1CE] text-white cursor-not-allowed shadow-none"
                : "bg-[#E8607A] hover:bg-[#D64E68] text-white hover:shadow-lg"
            )}
          >
            {protecting ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Protecting...</>
            ) : (
              <><Lock className="w-6 h-6" /> Protect PDF</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
