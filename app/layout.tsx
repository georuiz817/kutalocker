import type { Metadata } from "next";
import { CartProvider } from "@/components/CartProvider";
import MarqueeBanner from "@/components/MarqueeBanner";
import Nav from "@/components/Nav";
import ShowMarqueeOnHome from "@/components/ShowMarqueeOnHome";
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
        <CartProvider>
          <ShowMarqueeOnHome>
            <MarqueeBanner />
          </ShowMarqueeOnHome>
          <Nav />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
