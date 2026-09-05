import React, { useState } from 'react';
import './Tabs.css';

export const Tabs = ({ tabs, defaultTab, onChange }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].id);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className="samba-tabs-container">
      <div className="samba-tabs-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`samba-tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="samba-tabs-content">
        {activeContent}
      </div>
    </div>
  );
};
