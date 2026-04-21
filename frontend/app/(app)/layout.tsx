import Navbar from "../components/navbar";
import { SidebarProvider, SidebarTrigger } from "@/app/components/ui/sidebar";
import { AppSidebar } from "@/app/components/app-sidebar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full flex flex-col">
      <Navbar />
      <div style={{ display: "flex" }}>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1">
            <SidebarTrigger />
            {children}
          </main>
        </SidebarProvider>
      </div>
    </div>
  );
}
