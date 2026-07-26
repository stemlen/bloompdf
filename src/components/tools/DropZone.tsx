"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface DropZoneProps {
  acceptedTypes: string[];
  acceptMultiple: boolean;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"];
  if (imageExts.includes(ext ?? "")) return ImageIcon;
  return FileText;
}

export function DropZone({
  acceptedTypes,
  acceptMultiple,
  files,
  onFilesChange,
  maxFiles = 20,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      const newFiles: UploadedFile[] = arr
        .slice(0, maxFiles - files.length)
        .map((f) => ({
          id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
          file: f,
          name: f.name,
          size: f.size,
        }));

      if (acceptMultiple) {
        onFilesChange([...files, ...newFiles]);
      } else {
        onFilesChange(newFiles.slice(0, 1));
      }
    },
    [files, acceptMultiple, maxFiles, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const acceptString = acceptedTypes.join(",");
  const hasFiles = files.length > 0;
  const canAddMore = acceptMultiple && files.length < maxFiles;

  return (
    <div className="space-y-3">
      {/* Drop area */}
      {(!hasFiles || canAddMore) && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all select-none",
            hasFiles ? "py-5" : "py-14",
            isDragOver
              ? "border-primary bg-primary/10 scale-[1.005]"
              : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
          )}
          role="button"
          tabIndex={0}
          aria-label="Upload file"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptString}
            multiple={acceptMultiple}
            onChange={handleInputChange}
            className="hidden"
            aria-hidden
          />

          <div
            className={cn(
              "flex flex-col items-center gap-2 pointer-events-none",
              isDragOver && "scale-105 transition-transform"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-colors",
                isDragOver ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}
            >
              <Upload
                className="w-5 h-5 transition-colors"
              />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-foreground">
                {isDragOver ? "Drop files here" : "Drag & drop files here"}
              </p>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                or{" "}
                <span className="text-primary font-medium">browse files</span>
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {acceptedTypes.map((t) => t.toUpperCase().replace(".", "")).join(", ")}
              {acceptMultiple && maxFiles && ` • Up to ${maxFiles} files`}
              {" • Max 50 MB"}
            </p>
          </div>
        </div>
      )}

      {/* File list */}
      {hasFiles && (
        <div className="space-y-2">
          {files.map((f) => {
            const FileIcon = getFileIcon(f.name);
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 bg-card border border-border rounded-lg px-3.5 py-2.5 group animate-slide-up"
              >
                <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                  <FileIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatFileSize(f.size)}</p>
                </div>
                <button
                  onClick={() => removeFile(f.id)}
                  className="w-6 h-6 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { UploadedFile };
