import React from 'react';
import { Home, Flame, Users, Search, Settings } from 'lucide-react';
import { ActiveTab } from '../types';
import { triggerHaptic } from '../services/telegram';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isGoogleConnected?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isGoogleConnected = false
}) => {
  const tabs = [
    { id: 'home' as ActiveTab, label: 'Головна', icon: Home },
    { id: 'trending' as ActiveTab, label: 'Тренди', icon: Flame },
    { id: 'subscriptions' as ActiveTab, label: 'Підписки', icon: Users, isSpecial: isGoogleConnected },
    { id: 'search' as ActiveTab, label: 'Пошук', icon: Search },
    { id: 'settings' as ActiveTab, label: 'Опції', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-lg">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('selection');
                onTabChange(tab.id);
              }}
              className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 text-center transition-all duration-150 active:scale-95"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-red-500 fill-red-500/20' : 'text-slate-400 hover:text-slate-200'
                  }`}
                />
                {tab.isSpecial && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                )}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-1 transition-colors ${
                  isActive ? 'text-red-400 font-semibold' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
