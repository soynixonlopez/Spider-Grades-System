import React, { useState } from 'react';
import { LucideIcon, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface SidebarProps {
  title: string;
  subtitle: string;
  menuItems: MenuItem[];
  activeSection: string;
  onSectionChange: (section: any) => void;
  onSignOut: () => void;
  signOutIcon: LucideIcon;
}

export function Sidebar({
  title,
  subtitle,
  menuItems,
  activeSection,
  onSectionChange,
  onSignOut,
  signOutIcon: SignOutIcon
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className={cn(
          "transition-all duration-300",
          isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
        )}>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isCollapsed ? (
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>


      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center p-3 rounded-lg text-left transition-colors group",
                isActive
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isCollapsed ? "mr-0" : "mr-3",
                  isActive
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                )}
              />
              <div className={cn(
                "flex-1 transition-all duration-300",
                isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              )}>
                <div className="font-medium">{item.label}</div>
                <div className={cn(
                  "text-xs transition-colors",
                  isActive
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-500 dark:text-gray-400"
                )}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onSignOut}
          className="w-full flex items-center p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          title={isCollapsed ? "Cerrar Sesión" : undefined}
        >
          <SignOutIcon className={cn(
            "h-5 w-5 text-gray-400 transition-all duration-300",
            isCollapsed ? "mr-0" : "mr-3"
          )} />
          <span className={cn(
            "font-medium transition-all duration-300",
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            Cerrar Sesión
          </span>
        </button>
      </div>
    </div>
  );
}
