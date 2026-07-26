"use client";

import React from "react";

interface ToolIconProps {
  slug: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * APPLE HIG DESIGN SYSTEM UTILITIES (SQUIRCLE, SHADOWS, TOP GLASS REFLECTION)
 * ──────────────────────────────────────────────────────────────────────────── */

// Standard Apple App Icon Squircle Base with glossy reflection
function AppleIconBase({
  id,
  gradStart,
  gradEnd,
  children,
  size = 48,
  className,
}: {
  id: string;
  gradStart: string;
  gradEnd: string;
  children?: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        {/* Main Background Gradient */}
        <linearGradient id={`apple_bg_${id}`} x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor={gradStart} />
          <stop offset="1" stopColor={gradEnd} />
        </linearGradient>

        {/* Top Gloss Highlight Reflection */}
        <linearGradient id={`apple_gloss_${id}`} x1="32" y1="4" x2="32" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.02" />
        </linearGradient>

        {/* Ambient Drop Shadow */}
        <filter id={`apple_shadow_${id}`} x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Main Squircle Container */}
      <rect
        x="5"
        y="5"
        width="54"
        height="54"
        rx="13"
        fill={`url(#apple_bg_${id})`}
        filter={`url(#apple_shadow_${id})`}
      />

      {/* Glossy Reflection Overlay */}
      <path
        d="M5 18C5 10.8203 10.8203 5 18 5H46C53.1797 5 59 10.8203 59 18V28C40 28 24 22 5 18Z"
        fill={`url(#apple_gloss_${id})`}
      />

      {/* 1px Fine Metallic Rim Border */}
      <rect
        x="5.5"
        y="5.5"
        width="53"
        height="53"
        rx="12.5"
        stroke="#FFFFFF"
        strokeOpacity="0.25"
        strokeWidth="1"
      />

      {/* Icon Graphic Contents */}
      {children}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 29 APPLE HIG PROFESSIONAL TOOL ICONS
 * ──────────────────────────────────────────────────────────────────────────── */

// 1. Word to PDF
function WordToPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="w2p_w" x1="16" y1="6" x2="16" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0076FF" />
          <stop offset="1" stopColor="#0046B3" />
        </linearGradient>
        <linearGradient id="w2p_p" x1="48" y1="20" x2="48" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3B30" />
          <stop offset="1" stopColor="#C62828" />
        </linearGradient>
      </defs>

      {/* Word App Squircle */}
      <rect x="4" y="8" width="28" height="34" rx="7" fill="url(#w2p_w)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.2))" />
      <rect x="4.5" y="8.5" width="27" height="33" rx="6.5" stroke="#FFFFFF" strokeOpacity="0.2" />
      {/* 'W' Symbol */}
      <path d="M10 18L13.5 30H16.2L18 23L19.8 30H22.5L26 18H23.5L21.2 26.2L19.2 18H16.8L14.8 26.2L12.5 18H10Z" fill="#FFFFFF" />

      {/* Arrow */}
      <path d="M28 32L36 32M36 32L32 28M36 32L32 36" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* PDF App Squircle */}
      <rect x="32" y="22" width="28" height="34" rx="7" fill="url(#w2p_p)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.25))" />
      <rect x="32.5" y="22.5" width="27" height="33" rx="6.5" stroke="#FFFFFF" strokeOpacity="0.2" />
      <text x="46" y="44" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="800" fontSize="10" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.5">PDF</text>
    </svg>
  );
}

// 2. PDF to Word
function PdfToWordIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="p2w_p" x1="18" y1="8" x2="18" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3B30" />
          <stop offset="1" stopColor="#C62828" />
        </linearGradient>
        <linearGradient id="p2w_w" x1="46" y1="20" x2="46" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0076FF" />
          <stop offset="1" stopColor="#0046B3" />
        </linearGradient>
      </defs>

      {/* PDF App Squircle */}
      <rect x="4" y="8" width="28" height="34" rx="7" fill="url(#p2w_p)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.25))" />
      <rect x="4.5" y="8.5" width="27" height="33" rx="6.5" stroke="#FFFFFF" strokeOpacity="0.2" />
      <text x="18" y="30" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="800" fontSize="9" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.5">PDF</text>

      {/* Arrow */}
      <path d="M28 32L36 32M36 32L32 28M36 32L32 36" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Word App Squircle */}
      <rect x="32" y="22" width="28" height="34" rx="7" fill="url(#p2w_w)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.2))" />
      <rect x="32.5" y="22.5" width="27" height="33" rx="6.5" stroke="#FFFFFF" strokeOpacity="0.2" />
      <path d="M38 32L41.5 44H44.2L46 37L47.8 44H50.5L54 32H51.5L49.2 40.2L47.2 32H44.8L42.8 40.2L40.5 32H38Z" fill="#FFFFFF" />
    </svg>
  );
}

// 3. Excel to PDF
function ExcelToPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="e2p_e" x1="18" y1="8" x2="18" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34C759" />
          <stop offset="1" stopColor="#1E8E3E" />
        </linearGradient>
        <linearGradient id="e2p_p" x1="46" y1="20" x2="46" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3B30" />
          <stop offset="1" stopColor="#C62828" />
        </linearGradient>
      </defs>

      {/* Excel App Squircle */}
      <rect x="4" y="8" width="28" height="34" rx="7" fill="url(#e2p_e)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.2))" />
      <rect x="4.5" y="8.5" width="27" height="33" rx="6.5" stroke="#FFFFFF" strokeOpacity="0.2" />
      <path d="M11 18L15 24.5L11 31H14L16.5 26.8L19 31H22L18 24.5L22 18H19L16.5 22.2L14 18H11Z" fill="#FFFFFF" />

      {/* Arrow */}
      <path d="M28 32L36 32M36 32L32 28M36 32L32 36" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* PDF App Squircle */}
      <rect x="32" y="22" width="28" height="34" rx="7" fill="url(#e2p_p)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.25))" />
      <rect x="32.5" y="22.5" width="27" height="33" rx="6.5" stroke="#FFFFFF" strokeOpacity="0.2" />
      <text x="46" y="44" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="800" fontSize="10" fill="#FFFFFF" textAnchor="middle">PDF</text>
    </svg>
  );
}

// 4. PDF to Excel
function PdfToExcelIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="p2e_p" x1="18" y1="8" x2="18" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3B30" />
          <stop offset="1" stopColor="#C62828" />
        </linearGradient>
        <linearGradient id="p2e_e" x1="46" y1="20" x2="46" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34C759" />
          <stop offset="1" stopColor="#1E8E3E" />
        </linearGradient>
      </defs>

      {/* PDF App Squircle */}
      <rect x="4" y="8" width="28" height="34" rx="7" fill="url(#p2e_p)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.25))" />
      <text x="18" y="30" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="800" fontSize="9" fill="#FFFFFF" textAnchor="middle">PDF</text>

      {/* Arrow */}
      <path d="M28 32L36 32M36 32L32 28M36 32L32 36" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Excel App Squircle */}
      <rect x="32" y="22" width="28" height="34" rx="7" fill="url(#p2e_e)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.2))" />
      <path d="M39 32L43 38.5L39 45H42L44.5 40.8L47 45H50L46 38.5L50 32H47L44.5 36.2L42 32H39Z" fill="#FFFFFF" />
    </svg>
  );
}

// 5. PowerPoint to PDF
function PowerpointToPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="ppt_bg" x1="18" y1="8" x2="18" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF9500" />
          <stop offset="1" stopColor="#C66900" />
        </linearGradient>
        <linearGradient id="ppt_pdf" x1="46" y1="20" x2="46" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3B30" />
          <stop offset="1" stopColor="#C62828" />
        </linearGradient>
      </defs>

      {/* PPT App Squircle */}
      <rect x="4" y="8" width="28" height="34" rx="7" fill="url(#ppt_bg)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.2))" />
      <path d="M12 18H18C20.5 18 22 19.5 22 21.5C22 23.5 20.5 25 18 25H15V31H12V18ZM15 20.5V22.8H17.8C19 22.8 19.5 22.3 19.5 21.65C19.5 21 19 20.5 17.8 20.5H15Z" fill="#FFFFFF" />

      {/* Arrow */}
      <path d="M28 32L36 32M36 32L32 28M36 32L32 36" stroke="#FF9500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* PDF App Squircle */}
      <rect x="32" y="22" width="28" height="34" rx="7" fill="url(#ppt_pdf)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.25))" />
      <text x="46" y="44" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="800" fontSize="10" fill="#FFFFFF" textAnchor="middle">PDF</text>
    </svg>
  );
}

// 6. PDF to PowerPoint
function PdfToPowerpointIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="p2ppt_p" x1="18" y1="8" x2="18" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3B30" />
          <stop offset="1" stopColor="#C62828" />
        </linearGradient>
        <linearGradient id="p2ppt_ppt" x1="46" y1="20" x2="46" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF9500" />
          <stop offset="1" stopColor="#C66900" />
        </linearGradient>
      </defs>

      {/* PDF App Squircle */}
      <rect x="4" y="8" width="28" height="34" rx="7" fill="url(#p2ppt_p)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.25))" />
      <text x="18" y="30" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="800" fontSize="9" fill="#FFFFFF" textAnchor="middle">PDF</text>

      {/* Arrow */}
      <path d="M28 32L36 32M36 32L32 28M36 32L32 36" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* PPT App Squircle */}
      <rect x="32" y="22" width="28" height="34" rx="7" fill="url(#p2ppt_ppt)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.2))" />
      <path d="M40 32H46C48.5 32 50 33.5 50 35.5C50 37.5 48.5 39 46 39H43V45H40V32ZM43 34.5V36.8H45.8C47 36.8 47.5 36.3 47.5 35.65C47.5 35 47 34.5 45.8 34.5H43Z" fill="#FFFFFF" />
    </svg>
  );
}

// 7. Merge PDF
function MergePdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="merge" gradStart="#007AFF" gradEnd="#0040B3" size={size} className={className}>
      {/* Two glass sheets merging with arrow */}
      <rect x="16" y="16" width="20" height="26" rx="3" fill="#FFFFFF" fillOpacity="0.35" />
      <rect x="28" y="22" width="20" height="26" rx="3" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M38 32H26M30 28L26 32L30 36" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </AppleIconBase>
  );
}

// 8. Split PDF
function SplitPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="split" gradStart="#5856D6" gradEnd="#302D96" size={size} className={className}>
      {/* Sheet splitting in two */}
      <rect x="16" y="18" width="13" height="28" rx="2" fill="#FFFFFF" fillOpacity="0.5" />
      <rect x="35" y="18" width="13" height="28" rx="2" fill="#FFFFFF" />
      <line x1="32" y1="14" x2="32" y2="50" stroke="#FFD60A" strokeWidth="2" strokeDasharray="3 3" />
    </AppleIconBase>
  );
}

// 9. Remove Pages
function RemovePagesIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="remove" gradStart="#3A3A3C" gradEnd="#1C1C1E" size={size} className={className}>
      {/* Base doc stack */}
      <rect x="18" y="16" width="24" height="32" rx="3" fill="#FFFFFF" fillOpacity="0.4" />
      {/* Removing Red Minus Badge */}
      <circle cx="42" cy="42" r="10" fill="#FF3B30" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="36" y1="42" x2="48" y2="42" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </AppleIconBase>
  );
}

// 10. Extract Pages
function ExtractPagesIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="extract" gradStart="#34C759" gradEnd="#1E8E3E" size={size} className={className}>
      <rect x="16" y="22" width="22" height="28" rx="3" fill="#FFFFFF" fillOpacity="0.4" />
      <rect x="26" y="14" width="22" height="28" rx="3" fill="#FFFFFF" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))" />
      <path d="M37 22V34M37 22L32 27M37 22L42 27" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </AppleIconBase>
  );
}

// 11. Organize PDF
function OrganizePdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="organize" gradStart="#007AFF" gradEnd="#5856D6" size={size} className={className}>
      {/* 2x2 Clean Apple Tiles */}
      <rect x="17" y="17" width="13" height="13" rx="3" fill="#FFFFFF" />
      <rect x="34" y="17" width="13" height="13" rx="3" fill="#FFFFFF" fillOpacity="0.6" />
      <rect x="17" y="34" width="13" height="13" rx="3" fill="#FFFFFF" fillOpacity="0.6" />
      <rect x="34" y="34" width="13" height="13" rx="3" fill="#FFFFFF" />
    </AppleIconBase>
  );
}

// 12. Scan to PDF
function ScanToPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="scan" gradStart="#32ADE6" gradEnd="#0082BA" size={size} className={className}>
      <rect x="18" y="16" width="28" height="32" rx="3" fill="#FFFFFF" fillOpacity="0.3" />
      <path d="M14 22V14H22M42 14H50V22M50 42V50H42M22 50H14V42" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="32" x2="52" y2="32" stroke="#64D2FF" strokeWidth="3" />
    </AppleIconBase>
  );
}

// 13. Compress PDF
function CompressPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="compress" gradStart="#30B0C7" gradEnd="#007D94" size={size} className={className}>
      <rect x="20" y="20" width="24" height="24" rx="4" fill="#FFFFFF" />
      <path d="M32 12V20M32 52V44M12 32H20M52 32H44" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <text x="32" y="35" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="900" fontSize="9" fill="#007D94" textAnchor="middle">-50%</text>
    </AppleIconBase>
  );
}

// 14. Repair PDF
function RepairPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="repair" gradStart="#007AFF" gradEnd="#1D4ED8" size={size} className={className}>
      <rect x="18" y="16" width="28" height="32" rx="3" fill="#FFFFFF" />
      <path d="M26 24L38 36M28 36L36 28" stroke="#34C759" strokeWidth="3" strokeLinecap="round" />
    </AppleIconBase>
  );
}

// 15. OCR PDF
function OcrPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="ocr" gradStart="#AF52DE" gradEnd="#7B2CBF" size={size} className={className}>
      <rect x="18" y="16" width="28" height="32" rx="3" fill="#FFFFFF" fillOpacity="0.25" stroke="#FFFFFF" strokeWidth="1.5" />
      <rect x="22" y="22" width="20" height="6" rx="1.5" fill="#FFFFFF" fillOpacity="0.8" />
      <circle cx="42" cy="42" r="9" fill="#5856D6" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M39 42C39 42 40.5 40 42 40C43.5 40 45 42 45 42C45 42 43.5 44 42 44C40.5 44 39 42 39 42Z" stroke="#FFFFFF" strokeWidth="1.2" />
    </AppleIconBase>
  );
}

// 16. JPG to PDF
function JpgToPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="jpg2p" gradStart="#FF2D55" gradEnd="#D81B43" size={size} className={className}>
      <rect x="16" y="18" width="22" height="26" rx="3" fill="#FFFFFF" />
      <circle cx="23" cy="25" r="2.5" fill="#FF2D55" />
      <path d="M19 38L25 30L31 38H19Z" fill="#FF2D55" />
      <path d="M35 24L45 24M45 24L41 20M45 24L41 28" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </AppleIconBase>
  );
}

// 17. PDF to JPG
function PdfToJpgIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="p2jpg" gradStart="#FF3B30" gradEnd="#C62828" size={size} className={className}>
      <text x="24" y="36" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="900" fontSize="10" fill="#FFFFFF" textAnchor="middle">PDF</text>
      <rect x="36" y="24" width="16" height="20" rx="2.5" fill="#FFFFFF" />
      <circle cx="41" cy="29" r="2" fill="#FF3B30" />
      <path d="M38 39L42 33L46 39H38Z" fill="#FF3B30" />
    </AppleIconBase>
  );
}

// 18. HTML to PDF
function HtmlToPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="html" gradStart="#007AFF" gradEnd="#0051B3" size={size} className={className}>
      <rect x="16" y="18" width="32" height="28" rx="4" fill="#FFFFFF" fillOpacity="0.2" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M22 34L26 30L22 26M34 34L30 30L34 26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </AppleIconBase>
  );
}

// 19. Markdown to PDF
function MarkdownToPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="md" gradStart="#2C2C2E" gradEnd="#1C1C1E" size={size} className={className}>
      <path d="M18 24V40M18 24L24 32L30 24M30 24V40M40 24V34M36 31L40 36L44 31" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </AppleIconBase>
  );
}

// 20. Text to PDF
function TextToPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="txt" gradStart="#636366" gradEnd="#3A3A3C" size={size} className={className}>
      <rect x="18" y="16" width="28" height="32" rx="3" fill="#FFFFFF" />
      <line x1="24" y1="24" x2="40" y2="24" stroke="#636366" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="30" x2="36" y2="30" stroke="#636366" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="36" x2="38" y2="36" stroke="#636366" strokeWidth="2" strokeLinecap="round" />
    </AppleIconBase>
  );
}

// 21. PDF to PDF/A
function PdfToPdfaIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="pdfa" gradStart="#FF9500" gradEnd="#C67300" size={size} className={className}>
      <path d="M32 16L44 22V32C44 40 32 46 32 46C32 46 20 40 20 32V22L32 16Z" fill="#FFFFFF" fillOpacity="0.25" stroke="#FFFFFF" strokeWidth="2" />
      <text x="32" y="36" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="900" fontSize="13" fill="#FFFFFF" textAnchor="middle">A</text>
    </AppleIconBase>
  );
}

// 22. Edit PDF
function EditPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="edit" gradStart="#FF3B30" gradEnd="#D81B60" size={size} className={className}>
      <rect x="16" y="18" width="24" height="30" rx="3" fill="#FFFFFF" fillOpacity="0.3" />
      {/* Apple Pencil */}
      <g transform="translate(18, 4) rotate(15)">
        <path d="M30 10L36 16L20 32H14V26L30 10Z" fill="#FFFFFF" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
      </g>
    </AppleIconBase>
  );
}

// 23. Rotate PDF
function RotatePdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="rotate" gradStart="#007AFF" gradEnd="#0040B3" size={size} className={className}>
      <rect x="22" y="20" width="20" height="24" rx="3" fill="#FFFFFF" />
      <path d="M46 22C51 28 50 38 42 45C34 52 22 50 16 42" stroke="#FFD60A" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 48L16 41L23 42" stroke="#FFD60A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </AppleIconBase>
  );
}

// 24. Add Page Numbers
function AddPageNumbersIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="pagenum" gradStart="#5856D6" gradEnd="#3B38B3" size={size} className={className}>
      <rect x="18" y="16" width="28" height="32" rx="3" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="24" y="36" width="16" height="8" rx="2" fill="#FFFFFF" />
      <text x="32" y="43" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="900" fontSize="8" fill="#5856D6" textAnchor="middle"># 12</text>
    </AppleIconBase>
  );
}

// 25. Add Watermark
function AddWatermarkIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="watermark" gradStart="#32ADE6" gradEnd="#007AFF" size={size} className={className}>
      <rect x="18" y="16" width="28" height="32" rx="3" fill="#FFFFFF" fillOpacity="0.3" />
      <g transform="translate(32, 32) rotate(-25)">
        <rect x="-20" y="-5" width="40" height="10" rx="2" fill="#FFFFFF" fillOpacity="0.9" />
        <text x="0" y="2.5" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="900" fontSize="6" fill="#007AFF" textAnchor="middle">SAMPLE</text>
      </g>
    </AppleIconBase>
  );
}

// 26. Crop PDF
function CropPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="crop" gradStart="#5856D6" gradEnd="#2B2B8C" size={size} className={className}>
      <rect x="20" y="20" width="24" height="24" rx="2" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3 2" />
      <path d="M16 20H24M20 16V24M40 20H48M44 16V24M16 44H24M20 40V48M40 44H48M44 40V48" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </AppleIconBase>
  );
}

// 27. PDF Forms
function PdfFormsIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="forms" gradStart="#007AFF" gradEnd="#0040B3" size={size} className={className}>
      <rect x="18" y="16" width="28" height="32" rx="3" fill="#FFFFFF" />
      <rect x="22" y="22" width="6" height="6" rx="1.5" fill="#34C759" />
      <path d="M23.5 25L25 26.5L27 23.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="31" y1="25" x2="40" y2="25" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="36" x2="40" y2="36" stroke="#007AFF" strokeWidth="1.5" strokeDasharray="2 2" />
    </AppleIconBase>
  );
}

// 28. Protect PDF
function ProtectPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="protect" gradStart="#FF9500" gradEnd="#B36B00" size={size} className={className}>
      <path d="M26 28V22C26 18.6863 28.6863 16 32 16C35.3137 16 38 18.6863 38 22V28" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      <rect x="22" y="28" width="20" height="20" rx="4" fill="#FFFFFF" />
      <circle cx="32" cy="37" r="2.5" fill="#FF9500" />
    </AppleIconBase>
  );
}

// 29. Unlock PDF
function UnlockPdfIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <AppleIconBase id="unlock" gradStart="#34C759" gradEnd="#1E8E3E" size={size} className={className}>
      <path d="M26 20V18C26 14.6863 28.6863 12 32 12C35.3137 12 38 14.6863 38 18" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      <rect x="22" y="28" width="20" height="20" rx="4" fill="#FFFFFF" />
      <circle cx="32" cy="37" r="2.5" fill="#34C759" />
    </AppleIconBase>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * MAIN MAPPER COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "word-to-pdf": WordToPdfIcon,
  "pdf-to-word": PdfToWordIcon,
  "excel-to-pdf": ExcelToPdfIcon,
  "pdf-to-excel": PdfToExcelIcon,
  "powerpoint-to-pdf": PowerpointToPdfIcon,
  "pdf-to-powerpoint": PdfToPowerpointIcon,
  "merge-pdf": MergePdfIcon,
  "split-pdf": SplitPdfIcon,
  "remove-pages": RemovePagesIcon,
  "extract-pages": ExtractPagesIcon,
  "organize-pdf": OrganizePdfIcon,
  "scan-to-pdf": ScanToPdfIcon,
  "compress-pdf": CompressPdfIcon,
  "repair-pdf": RepairPdfIcon,
  "ocr-pdf": OcrPdfIcon,
  "jpg-to-pdf": JpgToPdfIcon,
  "pdf-to-jpg": PdfToJpgIcon,
  "html-to-pdf": HtmlToPdfIcon,
  "markdown-to-pdf": MarkdownToPdfIcon,
  "text-to-pdf": TextToPdfIcon,
  "pdf-to-pdfa": PdfToPdfaIcon,
  "edit-pdf": EditPdfIcon,
  "rotate-pdf": RotatePdfIcon,
  "add-page-numbers": AddPageNumbersIcon,
  "add-watermark": AddWatermarkIcon,
  "crop-pdf": CropPdfIcon,
  "pdf-forms": PdfFormsIcon,
  "protect-pdf": ProtectPdfIcon,
  "unlock-pdf": UnlockPdfIcon,
};

export function ToolIcon({ slug, className, size = 48, style }: ToolIconProps) {
  const IconComponent = iconMap[slug];

  if (!IconComponent) {
    return (
      <AppleIconBase id="default" gradStart="#FF3B30" gradEnd="#C62828" size={size} className={className}>
        <text x="32" y="38" fontFamily="SF Pro Display, -apple-system, sans-serif" fontWeight="900" fontSize="12" fill="#FFFFFF" textAnchor="middle">PDF</text>
      </AppleIconBase>
    );
  }

  return <IconComponent size={size} className={className} />;
}
