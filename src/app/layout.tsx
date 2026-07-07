import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";
import { Toaster } from "react-hot-toast";

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-roboto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arca Finanzas - Control de Gastos Inteligente",
  description: "Toma el control absoluto de tus finanzas: espacios de trabajo, presupuestos con alertas, transacciones recurrentes, metas de ahorro y avisos por correo.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Arca Finanzas",
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  }
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${roboto.variable} font-sans antialiased bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark');}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
        <RegisterSW />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f172a', // slate-900
              color: '#f8fafc', // slate-50
              border: '1px solid #1e293b', // slate-800
              fontSize: '12px',
              fontFamily: 'var(--font-roboto), sans-serif'
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
