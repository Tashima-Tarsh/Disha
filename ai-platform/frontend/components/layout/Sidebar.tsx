"use client";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "investigate", label: "Investigate", icon: "🔍" },
  { id: "alerts", label: "Alerts", icon: "🚨" },
  { id: "graph", label: "Graph", icon: "🕸️" },
  { id: "map", label: "Map", icon: "🗺️" },
  { id: "cluster", label: "AGI Cluster", icon: "🌐" },
  { id: "rankings", label: "Rankings", icon: "🏆" },
  { id: "rl", label: "RL System", icon: "🧠" },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col">
      <div className="p-4 border-b border-dark-700">
        <h2 className="text-lg font-bold text-primary-500">🛡️ Intel Platform</h2>
        <p className="text-xs text-gray-500 mt-1">AI-Powered Intelligence</p>
      </div>

      <nav className="flex-1 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary-600/20 text-primary-500"
                : "text-gray-400 hover:bg-dark-700 hover:text-gray-200"
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-dark-700">
        <div className="text-xs text-gray-500">
          <p>v1.0.0 • Connected</p>
        </div>
      </div>
    </aside>
  );
}
