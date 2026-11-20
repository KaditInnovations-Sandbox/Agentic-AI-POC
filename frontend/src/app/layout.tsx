import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ChatProvider } from "@/context/ChatContext";
import { Navbar } from "@/components/Navbar";
import { CartDrawer } from "@/components/CartDrawer";
import { FloatingChatWidget } from "@/components/FloatingChatWidget";

export const metadata: Metadata = {
  title: "Shopity - Modern E-Commerce Assistant",
  description: "E-commerce store with natural product discovery, comparisons, and purchasing assistance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <AuthProvider>
          <CartProvider>
            <ChatProvider>
              <Navbar />
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </main>
              <CartDrawer />
              <FloatingChatWidget />
            </ChatProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
