interface DomainTabsProps {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function DomainTabs({ tabs, activeTab, onChange }: DomainTabsProps) {
  return (
    <nav
      data-component="DomainTabs"
      role="tablist"
      aria-label="VTT domains"
      className="inline-flex gap-2 rounded-full p-1 text-sm snapp-tabs"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={isActive}
            className={
              "rounded-full px-3 py-1 transition-colors " +
              (isActive ? "text-white" : "bg-transparent hover:opacity-80")
            }
            style={
              isActive
                ? { backgroundColor: "#6b5438", color: "#f4e8d0", fontFamily: "'Cinzel', serif" }
                : { color: "#3d2817" }
            }
            onClick={() => onChange(tab)}
          >
            {tab}
          </button>
        );
      })}
    </nav>
  );
}

