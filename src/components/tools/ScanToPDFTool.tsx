"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Script from "next/script";
import {
  X, Download, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  Plus, Trash2, Crop, RotateCw, Image as ImageIcon, SlidersHorizontal,
  GripVertical
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PDFDocument } from "pdf-lib";
import { cn, formatFileSize } from "@/lib/utils";
import { downloadFile } from "@/lib/splitPdf";
import {
  Point,
  ScanFilter,
  loadImageElement,
  detectDocumentEdges,
  processDocumentScan
} from "@/lib/scanner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScannedPage {
  id: string;
  file: File;
  originalImage: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
  corners: Point[];
  filter: ScanFilter;
  rotation: number; // 0, 90, 180, 270
  processedDataUrl: string | null;
}

type ToolState = "idle" | "loading" | "ready" | "processing" | "done" | "error";

// ─── Sortable Item Component ──────────────────────────────────────────────────

interface SortableItemProps {
  id: string;
  page: ScannedPage;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function SortableItem({ id, page, isActive, onClick, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex items-center p-2 rounded-lg border-2 transition-colors bg-card",
        isActive ? "border-[#2563EB]" : "border-transparent hover:border-[#DBEAFE]",
        isDragging && "opacity-50 z-10 shadow-lg border-[#2563EB]"
      )}
      onClick={onClick}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1.5 text-[#A1A19D] hover:text-foreground transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      <div className="w-14 h-16 bg-[#F3F3F2] rounded border border-[#E5E5E3] overflow-hidden flex-shrink-0 flex items-center justify-center ml-1">
        {page.processedDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.processedDataUrl} alt="Thumbnail" className="w-full h-full object-cover" />
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-[#A1A19D]" />
        )}
      </div>

      <div className="ml-3 flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-foreground truncate">{page.file.name}</p>
        <p className="text-[11px] text-[#A1A19D] uppercase mt-0.5">{page.filter}</p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1.5 text-[#A1A19D] hover:text-[#E8607A] hover:bg-[#FEF2F2] rounded-md transition-colors ml-1"
        title="Delete page"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ScanToPDFTool() {
  const [cvLoaded, setCvLoaded] = useState(false);
  const [toolState, setToolState] = useState<ToolState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  // SVG interaction state
  const [draggingCornerIndex, setDraggingCornerIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Active page derived state
  const activePage = pages.find((p) => p.id === activePageId);

  // ── OpenCV initialization ──────────────────────────────────────────────────

  const handleOpenCVLoad = () => {
    const win = window as any;
    if (win.cv && win.cv.getBuildInformation) {
      setCvLoaded(true);
    } else if (win.cv) {
      win.cv.onRuntimeInitialized = () => setCvLoaded(true);
    } else {
      const check = setInterval(() => {
        if (win.cv && win.cv.getBuildInformation) {
          clearInterval(check);
          setCvLoaded(true);
        }
      }, 100);
    }
  };

  // ── Image Processing ───────────────────────────────────────────────────────

  // Generate the processed output whenever corners, filter, or rotation change
  const updateProcessedImage = useCallback(async (pageId: string) => {
    const win = window as any;
    if (!win.cv) return;

    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === pageId);
      if (idx === -1) return prev;
      const page = prev[idx];

      try {
        const dataUrl = processDocumentScan(win.cv, page.originalImage, page.corners, page.filter, page.rotation);
        const next = [...prev];
        next[idx] = { ...page, processedDataUrl: dataUrl };
        return next;
      } catch (err) {
        console.error("Processing failed for page", pageId, err);
        return prev;
      }
    });
  }, []);

  // Add files to the session
  const handleFiles = async (files: FileList | File[]) => {
    if (!cvLoaded) {
      setErrorMessage("Please wait for the OpenCV scanning engine to load.");
      setToolState("error");
      return;
    }

    setToolState("loading");
    setErrorMessage(null);

    const newPages: ScannedPage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      try {
        const imgElement = await loadImageElement(file);
        const win = window as any;
        const corners = detectDocumentEdges(win.cv, imgElement);

        const id = Math.random().toString(36).substring(2, 9);
        
        newPages.push({
          id,
          file,
          originalImage: imgElement,
          naturalWidth: imgElement.naturalWidth,
          naturalHeight: imgElement.naturalHeight,
          corners,
          filter: "enhanced", // default
          rotation: 0,
          processedDataUrl: null, // will generate below
        });
      } catch (err) {
        console.error("Failed to load image", file.name, err);
      }
    }

    if (newPages.length > 0) {
      setPages((prev) => {
        const combined = [...prev, ...newPages];
        if (!activePageId) setActivePageId(newPages[0].id);
        return combined;
      });
      setToolState("ready");

      // Kick off processing for new images
      for (const p of newPages) {
        updateProcessedImage(p.id);
      }
    } else {
      if (pages.length === 0) setToolState("idle");
      else setToolState("ready");
    }
  };

  // ── Drag & Drop Handlers ───────────────────────────────────────────────────

  const handleDropzoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // ── Corner Manipulation ────────────────────────────────────────────────────

  const handleSvgPointerDown = (index: number) => {
    setDraggingCornerIndex(index);
  };

  const handleSvgPointerMove = (e: React.PointerEvent) => {
    if (draggingCornerIndex === null || !activePage || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    
    // Mouse position relative to the container
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // The image might be scaled to fit via object-contain. We need to calculate the actual displayed rect.
    const nw = activePage.naturalWidth;
    const nh = activePage.naturalHeight;
    const scale = Math.min(rect.width / nw, rect.height / nh);
    const displayedW = nw * scale;
    const displayedH = nh * scale;
    
    // Offsets if it's centered
    const offsetX = (rect.width - displayedW) / 2;
    const offsetY = (rect.height - displayedH) / 2;

    // Map mouse position to natural coordinates
    let nx = (mx - offsetX) / scale;
    let ny = (my - offsetY) / scale;

    // Clamp
    nx = Math.max(0, Math.min(nw, nx));
    ny = Math.max(0, Math.min(nh, ny));

    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === activePageId);
      if (idx === -1) return prev;
      
      const newCorners = [...prev[idx].corners];
      newCorners[draggingCornerIndex] = { x: nx, y: ny };
      
      const next = [...prev];
      next[idx] = { ...next[idx], corners: newCorners };
      return next;
    });
  };

  const handleSvgPointerUp = () => {
    if (draggingCornerIndex !== null && activePageId) {
      setDraggingCornerIndex(null);
      updateProcessedImage(activePageId);
    }
  };

  // ── Page Actions ───────────────────────────────────────────────────────────

  const changeFilter = (f: ScanFilter) => {
    if (!activePageId) return;
    setPages((prev) => prev.map((p) => p.id === activePageId ? { ...p, filter: f } : p));
    updateProcessedImage(activePageId);
  };

  const rotateActive = () => {
    if (!activePageId) return;
    setPages((prev) => prev.map((p) => p.id === activePageId ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
    updateProcessedImage(activePageId);
  };

  const deletePage = (id: string) => {
    setPages((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activePageId === id) {
        setActivePageId(next.length > 0 ? next[0].id : null);
      }
      if (next.length === 0) setToolState("idle");
      return next;
    });
  };

  // ── PDF Generation ─────────────────────────────────────────────────────────

  const handleGeneratePDF = async () => {
    if (pages.length === 0) return;
    setToolState("processing");
    setErrorMessage(null);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const page of pages) {
        if (!page.processedDataUrl) continue;

        const res = await fetch(page.processedDataUrl);
        const imgBytes = await res.arrayBuffer();

        const image = await pdfDoc.embedJpg(imgBytes);
        const dims = image.scale(1);

        const pdfPage = pdfDoc.addPage([dims.width, dims.height]);
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: dims.width,
          height: dims.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      downloadFile(pdfBytes, "Scanned_Document.pdf");
      setToolState("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate PDF");
      setToolState("error");
    }
  };

  // ── Helpers for rendering SVG overlay ──────────────────────────────────────

  const getSvgPolygonPoints = () => {
    if (!activePage || !containerRef.current) return "";
    
    const rect = containerRef.current.getBoundingClientRect();
    const nw = activePage.naturalWidth;
    const nh = activePage.naturalHeight;
    const scale = Math.min(rect.width / nw, rect.height / nh);
    
    const displayedW = nw * scale;
    const displayedH = nh * scale;
    const offsetX = (rect.width - displayedW) / 2;
    const offsetY = (rect.height - displayedH) / 2;

    return activePage.corners.map((pt) => {
      const sx = pt.x * scale + offsetX;
      const sy = pt.y * scale + offsetY;
      return `${sx},${sy}`;
    }).join(" ");
  };

  const getSvgHandlePos = (pt: Point) => {
    if (!activePage || !containerRef.current) return { cx: 0, cy: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const scale = Math.min(rect.width / activePage.naturalWidth, rect.height / activePage.naturalHeight);
    
    const displayedW = activePage.naturalWidth * scale;
    const displayedH = activePage.naturalHeight * scale;
    const offsetX = (rect.width - displayedW) / 2;
    const offsetY = (rect.height - displayedH) / 2;

    return { cx: pt.x * scale + offsetX, cy: pt.y * scale + offsetY };
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <Script
        src="https://docs.opencv.org/4.8.0/opencv.js"
        strategy="lazyOnload"
        onLoad={handleOpenCVLoad}
      />

      {/* ── Initial Empty State ────────────────────────────────────────────── */}
      {toolState === "idle" && (
        <div
          onDrop={handleDropzoneDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
          role="button" tabIndex={0}
          className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D1D1CE] bg-muted/40 hover:border-[#2563EB] hover:bg-[#EFF6FF] transition-all select-none py-16 cursor-pointer"
        >
          <input ref={inputRef} type="file" multiple accept="image/*" onChange={handleInputChange} className="hidden" />
          
          <div className="w-14 h-14 rounded-full bg-card shadow-sm flex items-center justify-center mb-4">
            {cvLoaded ? <Crop className="w-6 h-6 text-[#2563EB]" /> : <Loader2 className="w-6 h-6 text-[#A1A19D] animate-spin" />}
          </div>
          
          <h3 className="text-[16px] font-bold text-foreground">
            {cvLoaded ? "Upload images to scan" : "Loading Scanner Engine..."}
          </h3>
          <p className="text-[13px] text-[#6B7280] mt-1">
            Drag & drop JPG, PNG images here
          </p>
        </div>
      )}

      {/* ── Main Interface ─────────────────────────────────────────────────── */}
      {(toolState === "ready" || toolState === "processing" || toolState === "done") && (
        <div className="flex flex-col md:flex-row gap-5">
          
          {/* Left Panel: Pages List (25%) */}
          <div className="w-full lg:w-[260px] flex-shrink-0 flex flex-col gap-3">
             <div className="bg-card border border-[#E5E5E3] rounded-xl flex flex-col h-[500px]">
                <div className="px-4 py-3 border-b border-[#E5E5E3] bg-[#F8F8F7] flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foreground">Scanned Pages</span>
                  <span className="text-[11px] font-medium bg-card border border-[#E5E5E3] px-2 py-0.5 rounded-full text-[#6B7280]">
                    {pages.length}
                  </span>
                </div>
                
                <div className="p-3 flex-1 overflow-y-auto space-y-2">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
                      {pages.map((page) => (
                        <SortableItem
                          key={page.id}
                          id={page.id}
                          page={page}
                          isActive={page.id === activePageId}
                          onClick={() => setActivePageId(page.id)}
                          onDelete={() => deletePage(page.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>

                <div className="p-3 border-t border-[#E5E5E3] bg-muted/40">
                   <button
                     onClick={() => inputRef.current?.click()}
                     className="w-full h-9 flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E3] bg-card text-foreground text-[12px] font-semibold hover:border-[#2563EB] hover:text-[#2563EB] transition-colors shadow-sm"
                   >
                     <Plus className="w-3.5 h-3.5" />
                     Add More Pages
                   </button>
                   <input ref={inputRef} type="file" multiple accept="image/*" onChange={handleInputChange} className="hidden" />
                </div>
             </div>
          </div>

          {/* Center Panel: Editor Canvas (50%) */}
          <div className="flex-1 bg-[#1A1A1A] rounded-xl border border-[#333] overflow-hidden flex flex-col relative min-h-[500px]">
             {/* Canvas Header */}
             <div className="h-12 bg-[#222] border-b border-[#333] flex items-center px-4 justify-between">
                <span className="text-[12px] font-medium text-[#A1A19D]">Adjust document boundaries</span>
                {toolState === "processing" && (
                  <span className="flex items-center gap-1.5 text-[11px] text-[#2563EB] font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                  </span>
                )}
             </div>

             {/* Canvas Area */}
             <div
               ref={containerRef}
               className="flex-1 relative w-full h-full flex items-center justify-center p-4 touch-none"
               onPointerMove={handleSvgPointerMove}
               onPointerUp={handleSvgPointerUp}
               onPointerLeave={handleSvgPointerUp}
             >
                {activePage && (
                   <div className="relative w-full h-full">
                      {/* Base Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activePage.originalImage.src}
                        alt="Original"
                        draggable={false}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80"
                      />
                      
                      {/* Overlay SVG for Cropping Handles */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                         <polygon
                           points={getSvgPolygonPoints()}
                           fill="rgba(37, 99, 235, 0.15)"
                           stroke="#2563EB"
                           strokeWidth="2"
                         />
                         {activePage.corners.map((pt, i) => {
                            const pos = getSvgHandlePos(pt);
                            return (
                               <circle
                                 key={i}
                                 cx={pos.cx}
                                 cy={pos.cy}
                                 r={8}
                                 fill="#FFFFFF"
                                 stroke="#2563EB"
                                 strokeWidth="3"
                                 className="pointer-events-auto cursor-move hover:scale-125 transition-transform"
                                 onPointerDown={(e) => {
                                   e.stopPropagation();
                                   if ((e.target as Element).setPointerCapture) (e.target as Element).setPointerCapture(e.pointerId);
                                   handleSvgPointerDown(i);
                                 }}
                               />
                            );
                         })}
                      </svg>
                   </div>
                )}
             </div>
          </div>

          {/* Right Panel: Controls & Result Preview (25%) */}
          <div className="w-full lg:w-[280px] flex-shrink-0 flex flex-col gap-4">
             {/* Controls Box */}
             <div className="bg-card border border-[#E5E5E3] rounded-xl p-5 space-y-6">
                <div>
                   <label className="text-[11px] font-semibold text-[#A1A19D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                     <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                   </label>
                   <div className="grid grid-cols-2 gap-2">
                     {(
                       [
                         { id: "original", label: "Original" },
                         { id: "enhanced", label: "Enhanced" },
                         { id: "color",    label: "Color" },
                         { id: "grayscale",label: "Grayscale" },
                         { id: "bw",       label: "B&W" },
                       ] as const
                     ).map((f) => (
                       <button
                         key={f.id}
                         onClick={() => changeFilter(f.id)}
                         className={cn(
                           "py-1.5 px-2 rounded border text-[11px] font-semibold transition-colors",
                           activePage?.filter === f.id
                             ? "bg-[#2563EB] text-white border-[#2563EB]"
                             : "bg-muted/40 text-[#6B7280] border-[#E5E5E3] hover:border-[#A1A19D]"
                         )}
                       >
                         {f.label}
                       </button>
                     ))}
                   </div>
                </div>

                <div>
                   <label className="text-[11px] font-semibold text-[#A1A19D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                     <RotateCw className="w-3.5 h-3.5" /> Rotation
                   </label>
                   <button
                     onClick={rotateActive}
                     className="w-full h-9 flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E3] bg-muted/40 text-foreground text-[12px] font-semibold hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                   >
                     <RotateCw className="w-4 h-4" /> Rotate 90°
                   </button>
                </div>
             </div>

             {/* Output Action */}
             <div className="bg-card border border-[#E5E5E3] rounded-xl p-4 shadow-sm">
                {toolState === "done" ? (
                   <div className="space-y-3">
                     <div className="flex items-center gap-2 text-[#10B981] bg-[#ECFDF5] p-2 rounded-lg border border-[#10B981]/20">
                       <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                       <span className="text-[11px] font-semibold">PDF generated successfully!</span>
                     </div>
                     <button
                        onClick={() => { setToolState("ready"); setPages([]); setActivePageId(null); }}
                        className="w-full h-10 bg-[#F3F3F2] hover:bg-[#E5E5E3] text-foreground rounded-lg font-semibold text-[13px] transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Scan More
                      </button>
                   </div>
                ) : (
                  <button
                    onClick={handleGeneratePDF}
                    disabled={pages.length === 0 || toolState === "processing" || pages.some(p => !p.processedDataUrl)}
                    className={cn(
                      "w-full h-11 rounded-lg font-semibold text-[14px] flex items-center justify-center gap-2 transition-all",
                      toolState === "processing"
                        ? "bg-[#2563EB]/80 text-white cursor-wait"
                        : pages.length === 0
                        ? "bg-[#F3F3F2] text-[#A1A19D] cursor-not-allowed"
                        : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm hover:shadow-md active:scale-[0.98]"
                    )}
                  >
                    {toolState === "processing" ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                    ) : (
                      <><Download className="w-4 h-4" /> Generate PDF</>
                    )}
                  </button>
                )}
             </div>

          </div>
        </div>
      )}
    </div>
  );
}
