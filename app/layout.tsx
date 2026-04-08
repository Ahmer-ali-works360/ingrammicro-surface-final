import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ToasterClient from "./components/ToasterClient";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Script from "next/script"; 

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ingram Micro Surface",
  description: "Ingram Micro Surface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${inter.variable} font-sans antialiased flex flex-col min-h-screen`}
      >
        <ToasterClient />
        <AuthProvider>
          <CartProvider>
            <Navbar />
               <main className="flex-1">  
              {children}
            </main>
            <Footer />
          </CartProvider>
        </AuthProvider>

          <Script
          id="tawkto"
          src="https://embed.tawk.to/646260b0ad80445890ed1274/1h0g4jd2n"
          strategy="lazyOnload"
        />

      </body>
    </html>
  );
}