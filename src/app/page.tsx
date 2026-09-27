import type { Metadata } from "next";
import HomePage from "./HomeClient";

// The homepage UI is a client component, which can't export metadata, so
// this thin server wrapper declares the homepage's own canonical URL. (The
// canonical used to be set globally in layout.tsx, which made every page
// without an override claim to be the homepage.)
export const metadata: Metadata = {
  alternates: {
    canonical: "https://bloompdf.app",
  },
};

export default function Page() {
  return <HomePage />;
}
