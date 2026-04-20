import type { Metadata } from "next";
//import { Geist, Geist_Mono } from "next/font/google";
import { Asap } from "next/font/google";
import "./globals.css";
import { SessionWatcher } from "@/components/sessao-expirada-login/sessao-expirada-login";
import Footer from "@/components/footer/footer";

{/*const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
*/}

const asap = Asap({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Intranet",
  description: "Nova intranet da Cressem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body
        className={`${asap.className} antialiased`}
      >
        <SessionWatcher />
        {children}
      </body>
    </html>
  );
}
