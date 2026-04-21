import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { AnimatedBackground } from "./AnimatedBackground";

export const Layout = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <AnimatedBackground />
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);
