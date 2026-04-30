import React from 'react';
import { Shield, Database, Cpu, Globe } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Shield className="text-disha-primary" />} 
          label="Threats Neutralized" 
          value="14,203" 
          trend="+12%" 
        />
        <StatCard 
          icon={<Database className="text-disha-accent" />} 
          label="Graph Nodes" 
          value="1.2M" 
          trend="+200" 
        />
        <StatCard 
          icon={<Cpu className="text-amber-500" />} 
          label="Core Load" 
          value="42%" 
          trend="-5%" 
        />
        <StatCard 
          icon={<Globe className="text-sky-500" />} 
          label="Sovereign Nodes" 
          value="1,402" 
          trend="Stable" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-disha-card border border-disha-border rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Activity className="mr-2 text-disha-primary" />
            Active OSINT Intelligence Stream
          </h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start space-x-4 p-4 rounded-lg bg-white/5 border border-white/5">
                <div className={`w-2 h-2 rounded-full mt-2 ${i % 2 === 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">New threat actor signature detected in sector {i}</p>
                  <p className="text-xs text-slate-500 mt-1">Source: DarkWeb-Monitor | Severity: {i % 2 === 0 ? 'CRITICAL' : 'HIGH'}</p>
                </div>
                <span className="text-xs font-mono text-slate-600">0x4F9A</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-disha-card border border-disha-border rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Intelligence Core</h3>
          <div className="bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-emerald-400 border border-emerald-500/10">
            <p className="mb-2">{">"} DISHA OS v6.0 INITIALIZED</p>
            <p className="mb-2 text-slate-500">{">"} LOADING COGNITIVE AGENTS...</p>
            <p className="mb-2 text-disha-primary">{">"} PLANNER ACTIVE</p>
            <p className="mb-2 text-disha-primary">{">"} CRITIC ACTIVE</p>
            <p className="mb-2">{">"} READY FOR DIRECTIVE</p>
          </div>
          <div className="mt-4 flex space-x-2">
            <input 
              type="text" 
              placeholder="Ask DISHA..." 
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-disha-primary transition-all"
            />
            <button className="bg-disha-primary hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-bold transition-all">
              SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, trend }: any) => (
  <div className="bg-disha-card border border-disha-border rounded-xl p-6 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-white/5 rounded-lg group-hover:bg-disha-primary/10 transition-all">
        {icon}
      </div>
      <span className={`text-xs font-bold ${trend.startsWith('+') ? 'text-emerald-500' : trend === 'Stable' ? 'text-slate-500' : 'text-emerald-500'}`}>
        {trend}
      </span>
    </div>
    <p className="text-sm text-slate-400 font-medium">{label}</p>
    <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
  </div>
);

import { Activity } from 'lucide-react';

export default Dashboard;
