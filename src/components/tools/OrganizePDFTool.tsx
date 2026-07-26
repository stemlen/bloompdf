"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  X,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  RotateCw,
  RotateCcw,
  Trash2,
  FilePlus,
  ArrowUpToLine,
  ArrowDownToLine,
  CheckSquare,
  Square,
  GripVertical,
  Upload,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validatePDFFile, downloadFile } from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";
import { organizePDF, type PageOperation, type RotationAngle } from "@/lib/organizePdf";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolState =
  | "idle"
  | "loading_thumbnails"
  | "ready"
  | "processing"
  | "done"
  | "error";

interface PageItem {
  id: string; // Unique ID for React keys and DND
  type: "original" | "blank";
  originalIndex?: number; // 0-based index in the original file
  rotation: RotationAngle; // Cumulative visual rotation
  selected: boolean;
  dataUrl?: string; // Rendered thumbnail
}

interface PDFInfo {
  file: File;
  name: string;
  size: number;
  totalPages: number;
}

interface DoneSnapshot {
  outputPages: number;
  outputBytes: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function addRotation(current: RotationAngle, delta: 90 | 270): RotationAngle {
  return ((current + delta) % 360) as RotationAngle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrganizePDFTool() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [isDragOverDropZone, setIsDragOverDropZone] = useState(false);
  const [toolState, setToolState] = useState<ToolState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pages & Thumbnails
  const [pages, setPages] = useState<PageItem[]>([]);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [zoom, setZoom] = useState(100);

  // Drag and Drop State
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Processing Results
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [doneSnapshot, setDoneSnapshot] = useState<DoneSnapshot | null>(null);

  const abortRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Abort on unmount
  useEffect(() => () => { abortRef.current = true; }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const selectedCount = pages.filter((p) => p.selected).length;
  const canProcess = toolState === "ready" && pages.length > 0;

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFiles = async (raw: FileList | File[]) => {
    const file = raw[0];
    if (!file) return;
    const err = validatePDFFile(file);
    if (err) { setErrorMessage(err); setToolState("error"); return; }

    setPdfInfo(null);
    setPages([]);
    setResultBytes(null);
    setDoneSnapshot(null);
    setErrorMessage(null);
    setToolState("loading_thumbnails");
    setThumbProgress(0);
    abortRef.current = false;

    try {
      const pdfDoc = await loadPdfForRendering(file);
      const total = pdfDoc.numPages;
      setPdfInfo({ file, name: file.name, size: file.size, totalPages: total });

      for (let i = 1; i <= total; i++) {
        if (abortRef.current) break;
        let dataUrl = "";
        try {
          dataUrl = await renderPageToDataURL(pdfDoc, i, 0.35);
        } catch {
          const canvas = document.createElement("canvas");
          canvas.width = 80; canvas.height = 110;
          const ctx = canvas.getContext("2d");
          if (ctx) { ctx.fillStyle = "#F3F3F2"; ctx.fillRect(0, 0, 80, 110); }
          dataUrl = canvas.toDataURL();
        }
        
        setPages((prev) => [
          ...prev,
          {
            id: generateId(),
            type: "original",
            originalIndex: i - 1,
            rotation: 0,
            selected: false,
            dataUrl,
          },
        ]);
        
        setThumbProgress(Math.round((i / total) * 100));
        await new Promise<void>((r) => setTimeout(r, 8));
      }
      if (!abortRef.current) setToolState("ready");
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setErrorMessage(
        m.toLowerCase().includes("password") || m.toLowerCase().includes("encrypt")
          ? "This PDF is password-protected. Please unlock it first."
          : "Could not load the PDF. It may be corrupted or in an unsupported format."
      );
      setToolState("error");
    }
  };

  // ── Drop zone handlers ─────────────────────────────────────────────────────

  const handleDropFiles = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOverDropZone(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleDragOverFiles = (e: React.DragEvent) => { e.preventDefault(); setIsDragOverDropZone(true); };
  const handleDragLeaveFiles = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOverDropZone(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  };

  // ── Sorting Drag and Drop logic ────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (toolState !== "ready") return;
    dragItem.current = index;
    // Set dragged element visuals
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    if (toolState !== "ready" || !isDragging) return;
    e.preventDefault();
    dragOverItem.current = index;
    
    // Reorder array in real time
    const draggedItemIndex = dragItem.current;
    const targetItemIndex = dragOverItem.current;
    
    if (draggedItemIndex === null || targetItemIndex === null) return;
    if (draggedItemIndex === targetItemIndex) return;

    setPages(prevPages => {
      const newPages = [...prevPages];
      const draggedItemContent = newPages[draggedItemIndex];
      // Remove item
      newPages.splice(draggedItemIndex, 1);
      // Insert item
      newPages.splice(targetItemIndex, 0, draggedItemContent);
      return newPages;
    });

    // Update dragItem to the new index
    dragItem.current = targetItemIndex;
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
    setIsDragging(false);
  };

  // ── Page Actions ───────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    if (toolState !== "ready") return;
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, selected: !p.selected } : p));
  };
  
  const selectAll = () => setPages(p => p.map(item => ({ ...item, selected: true })));
  const deselectAll = () => setPages(p => p.map(item => ({ ...item, selected: false })));

  const rotateSelected = (angle: 90 | 270) => {
    if (toolState !== "ready") return;
    setPages(prev => prev.map(p => p.selected ? { ...p, rotation: addRotation(p.rotation, angle) } : p));
  };

  const rotatePage = (id: string, angle: 90 | 270) => {
    if (toolState !== "ready") return;
    setPages(prev => prev.map(p => p.id === id ? { ...p, rotation: addRotation(p.rotation, angle) } : p));
  };

  const deleteSelected = () => {
    if (toolState !== "ready") return;
    setPages(prev => prev.filter(p => !p.selected));
  };

  const deletePage = (id: string) => {
    if (toolState !== "ready") return;
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const insertBlankPage = () => {
    if (toolState !== "ready") return;
    // Find the last selected page index to insert after
    let insertIndex = pages.length;
    for (let i = pages.length - 1; i >= 0; i--) {
      if (pages[i].selected) {
        insertIndex = i + 1;
        break;
      }
    }

    const newBlankPage: PageItem = {
      id: generateId(),
      type: "blank",
      rotation: 0,
      selected: false
    };

    setPages(prev => {
      const updated = [...prev];
      updated.splice(insertIndex, 0, newBlankPage);
      return updated;
    });
  };

  const moveSelectedToBeginning = () => {
    if (toolState !== "ready") return;
    setPages(prev => {
      const selected = prev.filter(p => p.selected);
      const unselected = prev.filter(p => !p.selected);
      return [...selected, ...unselected];
    });
  };

  const moveSelectedToEnd = () => {
    if (toolState !== "ready") return;
    setPages(prev => {
      const selected = prev.filter(p => p.selected);
      const unselected = prev.filter(p => !p.selected);
      return [...unselected, ...selected];
    });
  };

  // ── Reset / file remove ────────────────────────────────────────────────────

  const handleRemoveFile = () => {
    abortRef.current = true;
    setPdfInfo(null); setPages([]); setResultBytes(null); setDoneSnapshot(null);
    setToolState("idle"); setErrorMessage(null);
  };
  const handleReset = () => handleRemoveFile();
  const handleDismissError = () => {
    setErrorMessage(null);
    setToolState(pdfInfo && pages.length > 0 ? "ready" : "idle");
  };

  // ── Processing ─────────────────────────────────────────────────────────────

  const handleApplyChanges = async () => {
    if (!pdfInfo || !canProcess) return;
    setToolState("processing");
    setErrorMessage(null);
    setResultBytes(null);
    setDoneSnapshot(null);

    const operations: PageOperation[] = pages.map((p) => ({
      id: p.id,
      type: p.type,
      originalIndex: p.originalIndex,
      rotation: p.rotation,
    }));

    try {
      const bytes = await organizePDF(pdfInfo.file, operations);
      setResultBytes(bytes);
      setDoneSnapshot({
        outputPages: operations.length,
        outputBytes: bytes.byteLength
      });
      setToolState("done");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "An error occurred during processing.");
      setToolState("error");
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !pdfInfo) return;
    const base = pdfInfo.name.replace(/\.pdf$/i, "");
    downloadFile(resultBytes, `${base}_organized.pdf`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleInputChange} className="hidden" aria-hidden />

      {/* ── Left Panel: Sidebar ────────────────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">Organize PDF</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Reorder, delete, or rotate pages</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] flex items-center justify-center mb-3">
                 <GripVertical className="w-5 h-5 text-[#10B981]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to start organizing</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 p-5">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[#ECFDF5] rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{pdfInfo.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {formatFileSize(pdfInfo.size)} 
                      <span className="text-[#D1D1CE]">•</span> 
                      {pages.length} pages
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={toolState === "processing"}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#10B981] hover:bg-[#ECFDF5] transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {toolState !== "done" && (
                <>
                  {/* Selection Status */}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg border border-border">
                    <span className="text-[12px] font-bold text-muted-foreground">Selected pages</span>
                    <span className="text-[13px] font-bold text-foreground">
                       <span className={cn(selectedCount > 0 && "text-[#10B981]")}>{selectedCount}</span> / {pages.length}
                    </span>
                  </div>

                  {/* Actions Grid */}
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Page Actions
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => rotateSelected(270)}
                        disabled={selectedCount === 0 || toolState !== "ready"}
                        className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-[#111111]/30 transition-all disabled:opacity-40"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-[11px] font-bold text-center leading-tight">Rotate<br/>Left</span>
                      </button>
                      <button
                        onClick={() => rotateSelected(90)}
                        disabled={selectedCount === 0 || toolState !== "ready"}
                        className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-[#111111]/30 transition-all disabled:opacity-40"
                      >
                        <RotateCw className="w-4 h-4" />
                        <span className="text-[11px] font-bold text-center leading-tight">Rotate<br/>Right</span>
                      </button>
                      <button
                         onClick={deleteSelected}
                         disabled={selectedCount === 0 || toolState !== "ready"}
                         className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl border border-border bg-card text-muted-foreground hover:bg-primary/10 hover:text-[#E8607A] hover:border-[#E8607A]/50 transition-all disabled:opacity-40"
                      >
                         <Trash2 className="w-4 h-4" />
                         <span className="text-[12px] font-bold">Delete Pages</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Document Actions */}
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Document Actions
                    </p>
                    <div className="space-y-2">
                      <button
                         onClick={insertBlankPage}
                         disabled={toolState !== "ready"}
                         className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-[#111111]/30 transition-all disabled:opacity-50"
                      >
                         <span className="text-[12px] font-bold">Insert Blank Page</span>
                         <FilePlus className="w-4 h-4" />
                      </button>
                      <button
                         onClick={moveSelectedToBeginning}
                         disabled={selectedCount === 0 || toolState !== "ready"}
                         className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-[#111111]/30 transition-all disabled:opacity-50"
                      >
                         <span className="text-[12px] font-bold">Move to Beginning</span>
                         <ArrowUpToLine className="w-4 h-4" />
                      </button>
                      <button
                         onClick={moveSelectedToEnd}
                         disabled={selectedCount === 0 || toolState !== "ready"}
                         className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-[#111111]/30 transition-all disabled:opacity-50"
                      >
                         <span className="text-[12px] font-bold">Move to End</span>
                         <ArrowDownToLine className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Selection Toggles */}
                  {toolState === "ready" && (
                    <div className="flex bg-[#F3F3F2] rounded-xl p-1 border border-border mt-2">
                       <button
                         onClick={selectAll}
                         className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold text-muted-foreground hover:bg-card hover:text-foreground transition-all disabled:opacity-50"
                       >
                         <CheckSquare className="w-3.5 h-3.5" />
                         Select All
                       </button>
                       <button
                         onClick={deselectAll}
                         disabled={selectedCount === 0}
                         className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold text-muted-foreground hover:bg-card hover:text-foreground transition-all disabled:opacity-50"
                       >
                         <Square className="w-3.5 h-3.5" />
                         Clear All
                       </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Canvas & Action Bar ───────────────────────────────── */}
      <div 
         className="flex-1 flex flex-col relative min-h-0 h-full bg-muted"
         onDrop={handleDropFiles}
         onDragOver={handleDragOverFiles}
         onDragLeave={handleDragLeaveFiles}
      >
        {isDragOverDropZone && (
          <div className="absolute inset-0 z-50 bg-[#10B981]/5 backdrop-blur-[2px] border-4 border-dashed border-[#10B981] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#D1FAE5]">
              <Upload className="w-8 h-8 text-[#10B981] mb-2 animate-bounce" />
              <p className="text-[15px] font-bold text-foreground">Drop PDF here</p>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative custom-scrollbar">
           
           {!pdfInfo ? (
              <div className="absolute inset-0 flex items-center justify-center">
                 <button 
                   onClick={() => inputRef.current?.click()}
                   className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#10B981] hover:bg-card/50 transition-all cursor-pointer group"
                 >
                    <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                       <GripVertical className="w-7 h-7 text-[#10B981]" />
                    </div>
                    <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a PDF to start organizing</h3>
                    <p className="text-[14px] text-muted-foreground">Drag & drop your file anywhere in this space</p>
                 </button>
              </div>
           ) : toolState === "done" && doneSnapshot ? (
             <div className="max-w-xl mx-auto py-10 space-y-6">
                <div className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center">
                   <div className="w-16 h-16 rounded-full bg-[#ECFDF5] flex items-center justify-center mx-auto mb-4">
                     <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                   </div>
                   <h2 className="text-[24px] font-bold text-foreground mb-2">PDF Organized Successfully!</h2>
                   <p className="text-muted-foreground text-[14px] mb-6">{doneSnapshot.outputPages} pages · {formatFileSize(doneSnapshot.outputBytes)}</p>
                   
                   <button
                     onClick={handleDownload}
                     className="h-12 px-8 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl font-bold text-[15px] transition-all shadow-md mx-auto flex items-center gap-2"
                   >
                     <Download className="w-5 h-5" />
                     Download Organized PDF
                   </button>
                </div>
             </div>
           ) : (
             <div 
               className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 max-w-6xl mx-auto py-4"
               style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", transition: "transform 0.2s ease" }}
             >
                {pages.map((page, index) => {
                  const isSelected = page.selected;
                  const isInteractive = toolState === "ready";
                  const isBlank = page.type === "blank";

                  return (
                    <div
                      key={page.id}
                      draggable={isInteractive}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className={cn(
                        "relative flex flex-col group transition-all duration-200 rounded-xl overflow-hidden",
                        isInteractive && "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <div 
                        className={cn(
                          "relative aspect-[1/1.4] bg-card rounded-xl shadow-sm overflow-hidden transition-all border-2",
                          isSelected 
                            ? "border-[#10B981] ring-2 ring-[#10B981]/20 shadow-[0_4px_16px_rgba(16,185,129,0.15)]" 
                            : "border-border",
                          isInteractive && !isSelected && "hover:border-[#10B981]/50 hover:shadow-md"
                        )}
                        onClick={() => isInteractive && toggleSelect(page.id)}
                      >
                        {isBlank ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/50">
                            <FilePlus className="w-6 h-6 text-[#A1A19D] mb-2 opacity-50" />
                            <span className="text-[10px] text-[#A1A19D] font-medium uppercase tracking-wider">Blank Page</span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={page.dataUrl}
                            alt={`Page`}
                            draggable={false}
                            className="w-full h-full object-cover transition-transform duration-300 ease-in-out pointer-events-none"
                            style={{ transform: `rotate(${page.rotation}deg)` }}
                          />
                        )}

                        {/* Top-left Quick Actions (Visible on hover when interactive) */}
                        {isInteractive && (
                          <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                              onClick={(e) => { e.stopPropagation(); rotatePage(page.id, 90); }}
                              className="w-7 h-7 bg-card/90 backdrop-blur shadow-sm border border-border rounded-md flex items-center justify-center hover:text-[#10B981] hover:border-[#10B981]/50"
                              title="Rotate"
                              aria-label="Rotate Page"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                             <button
                              onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                              className="w-7 h-7 bg-card/90 backdrop-blur shadow-sm border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-[#E8607A] hover:border-[#E8607A]/50 hover:bg-primary/10"
                              title="Delete"
                              aria-label="Delete Page"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Selection checkbox */}
                        {isSelected && (
                           <div className="absolute top-2 left-2 w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center shadow-md animate-scale-in">
                              <CheckSquare className="w-4 h-4 text-white" />
                           </div>
                        )}

                        {!isSelected && isInteractive && (
                          <div className="absolute inset-0 bg-[#10B981]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        )}
                      </div>

                      {/* Page label */}
                      <div className="py-2 flex items-center justify-center">
                         <span
                           className={cn(
                             "text-[12px] font-bold px-2 py-0.5 rounded-full transition-colors inline-flex items-center gap-1",
                             isSelected
                               ? "bg-[#ECFDF5] text-[#10B981]"
                               : "bg-muted text-muted-foreground",
                             isInteractive && !isSelected && "group-hover:bg-[#E4E4E2] group-hover:text-foreground"
                           )}
                         >
                           {index + 1}
                         </span>
                      </div>
                    </div>
                  );
                })}

                {/* Skeletons */}
                {toolState === "loading_thumbnails" &&
                  pages.length < (pdfInfo?.totalPages ?? 0) &&
                  Array.from({
                    length: Math.min((pdfInfo?.totalPages ?? 0) - pages.length, 6),
                  }).map((_, i) => (
                    <div key={`skel-${i}`} className="flex flex-col gap-2 rounded-xl">
                      <div className="relative aspect-[1/1.4] bg-[#E4E4E2] rounded-xl shadow-sm overflow-hidden animate-pulse" />
                      <div className="py-2 flex justify-center">
                        <div className="w-12 h-5 bg-[#E4E4E2] rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))}
             </div>
           )}
        </div>

        {/* Sticky Action Bar */}
        <div className="bg-card border-t border-border h-[80px] px-6 flex items-center justify-between flex-shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] z-30 relative">
          
          {errorMessage && toolState === "error" && (
            <div className="absolute -top-16 right-6 flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-[#E8607A]/20 shadow-lg animate-slide-up max-w-sm">
              <AlertCircle className="w-5 h-5 text-[#E8607A] flex-shrink-0" />
              <p className="text-[12px] font-semibold text-foreground leading-tight">
                {errorMessage}
              </p>
              <button onClick={handleDismissError} className="p-1 hover:bg-[#FFC5D3] rounded-lg text-[#E8607A]">
                 <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Left Controls (Zoom) */}
          <div className="flex items-center gap-3">
             {pdfInfo && toolState !== "done" && (
               <div className="hidden sm:flex items-center bg-muted border border-border rounded-lg p-1">
                  <button 
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card rounded-md transition-all"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[12px] font-bold text-foreground w-12 text-center tabular-nums">{zoom}%</span>
                  <button 
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card rounded-md transition-all"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
               </div>
             )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {toolState === "done" ? (
              <button
                onClick={handleReset}
                className="h-11 px-5 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-[14px] transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <RefreshCw className="w-4 h-4" />
                Start over
              </button>
            ) : (
              <button
                onClick={handleApplyChanges}
                disabled={!canProcess}
                className={cn(
                  "flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all w-full sm:w-auto",
                  toolState === "processing"
                    ? "bg-[#10B981]/80 text-white cursor-wait"
                    : !canProcess
                    ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                    : "bg-[#111111] hover:bg-[#333333] text-white shadow-md active:scale-[0.98]"
                )}
              >
                {toolState === "processing" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <>Apply Changes</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
