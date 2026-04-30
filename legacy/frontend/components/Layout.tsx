import React from 'react';
import { LayoutDashboard, Shield, AlertTriangle, Settings, HelpCircle, Activity } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-disha-bg text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-disha-card border-r border-disha-border flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-disha-primary tracking-tighter">DISHA OS</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">v6.0.0 Production</p>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          <NavItem icon={<Shield size={20} />} label="Security Stack" />
          <NavItem icon={<Activity size={20} />} label="OSINT Stream" />
          <NavItem icon={<AlertTriangle size={20} />} label="Alert Center" />
        </nav>

        <div className="p-4 border-t border-disha-border">
          <NavItem icon={<Settings size={20} />} label="Settings" />
          <NavItem icon={<HelpCircle size={20} />} label="Documentation" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-disha-card border-b border-disha-border flex items-center justify-between px-8">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-400">System Status:</span>
            <span className="flex items-center text-xs font-bold text-disha-accent uppercase">
              <span className="w-2 h-2 rounded-full bg-disha-accent mr-2 animate-pulse" />
              Nominal
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-bold">DISH@MICROSOFT</p>
              <p className="text-xs text-slate-500">Security Clearance: LEVEL 7</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-disha-primary flex items-center justify-center font-bold">
              DM
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <div className={`
    flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-all
    ${active ? 'bg-disha-primary/10 text-disha-primary border border-disha-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
  `}>
    {icon}
    <span className="font-medium">{label}</span>
  </div>
);

export default Layout;
