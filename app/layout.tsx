import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "kuraMart",
  description: "kuraMart",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
