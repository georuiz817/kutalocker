import type { Metadata } from "next";
import { Dela_Gothic_One, Nunito } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import MarqueeBanner from "@/components/MarqueeBanner";
import Nav from "@/components/Nav";
import ShowMarqueeOnHome from "@/components/ShowMarqueeOnHome";
import "@/styles/globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const delaGothicOne = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

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
    <html
      lang="en"
      className={`${nunito.variable} ${delaGothicOne.variable}`}
    >
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
