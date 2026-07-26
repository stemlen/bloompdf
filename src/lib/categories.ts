export interface Category {
  id: string;
  label: string;
  description: string;
  color: string;
  lightBg: string;
  darkBg: string;
  midBg: string;
  textColor: string;
  borderColor: string;
  iconBg: string;
  bgColor: string;
  gradient: string;
}

export const categories: Category[] = [
  {
    id: "organize",
    label: "Organize PDF",
    description: "Merge, split, reorder, and manage your PDF pages",
    color: "#2563EB",
    lightBg: "#EFF6FF",
    darkBg: "rgba(37,99,235,0.16)",
    midBg: "#DBEAFE",
    bgColor: "bg-[#EFF6FF]",
    textColor: "text-[#2563EB]",
    borderColor: "border-[#2563EB]",
    iconBg: "bg-[#EFF6FF]",
    gradient: "from-[#EFF6FF] to-[#DBEAFE]",
  },
  {
    id: "optimize",
    label: "Optimize PDF",
    description: "Compress, repair, and enhance your PDF files",
    color: "#0D9488",
    lightBg: "#F0FDFA",
    darkBg: "rgba(13,148,136,0.16)",
    midBg: "#CCFBF1",
    bgColor: "bg-[#F0FDFA]",
    textColor: "text-[#0D9488]",
    borderColor: "border-[#0D9488]",
    iconBg: "bg-[#F0FDFA]",
    gradient: "from-[#F0FDFA] to-[#CCFBF1]",
  },
  {
    id: "convert-to",
    label: "Convert to PDF",
    description: "Transform documents and images into PDF format",
    color: "#16A34A",
    lightBg: "#F0FDF4",
    darkBg: "rgba(22,163,74,0.16)",
    midBg: "#DCFCE7",
    bgColor: "bg-[#F0FDF4]",
    textColor: "text-[#16A34A]",
    borderColor: "border-[#16A34A]",
    iconBg: "bg-[#F0FDF4]",
    gradient: "from-[#F0FDF4] to-[#DCFCE7]",
  },
  {
    id: "convert-from",
    label: "Convert from PDF",
    description: "Export your PDF to other document formats",
    color: "#EA580C",
    lightBg: "#FFF7ED",
    darkBg: "rgba(234,88,12,0.16)",
    midBg: "#FED7AA",
    bgColor: "bg-[#FFF7ED]",
    textColor: "text-[#EA580C]",
    borderColor: "border-[#EA580C]",
    iconBg: "bg-[#FFF7ED]",
    gradient: "from-[#FFF7ED] to-[#FED7AA]",
  },
  {
    id: "edit",
    label: "Edit PDF",
    description: "Modify, annotate, and transform your PDF content",
    color: "#7C3AED",
    lightBg: "#F5F3FF",
    darkBg: "rgba(124,58,237,0.16)",
    midBg: "#EDE9FE",
    bgColor: "bg-[#F5F3FF]",
    textColor: "text-[#7C3AED]",
    borderColor: "border-[#7C3AED]",
    iconBg: "bg-[#F5F3FF]",
    gradient: "from-[#F5F3FF] to-[#EDE9FE]",
  },
  {
    id: "security",
    label: "PDF Security",
    description: "Protect, sign, and manage PDF forms",
    color: "#DC2626",
    lightBg: "#FEF2F2",
    darkBg: "rgba(220,38,38,0.16)",
    midBg: "#FEE2E2",
    bgColor: "bg-[#FEF2F2]",
    textColor: "text-[#DC2626]",
    borderColor: "border-[#DC2626]",
    iconBg: "bg-[#FEF2F2]",
    gradient: "from-[#FEF2F2] to-[#FEE2E2]",
  },
  {
    id: "intelligence",
    label: "PDF Intelligence",
    description: "AI-powered text recognition and extraction",
    color: "#4F46E5",
    lightBg: "#EEF2FF",
    darkBg: "rgba(79,70,229,0.16)",
    midBg: "#E0E7FF",
    bgColor: "bg-[#EEF2FF]",
    textColor: "text-[#4F46E5]",
    borderColor: "border-[#4F46E5]",
    iconBg: "bg-[#EEF2FF]",
    gradient: "from-[#EEF2FF] to-[#E0E7FF]",
  },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getCategoryBgStyle(category?: Category) {
  if (!category) return {};
  return {
    backgroundColor: `var(--cat-${category.id}-bg, ${category.lightBg})`,
  };
}

