import "@xyflow/react/dist/style.css";
import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata={title:"Impact Atlas | Change Impact",description:"Dependency mapping and impact analysis"};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
