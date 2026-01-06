import React from 'react';
import { AppRoute, User, UserRole } from '../types';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

export const MobileNav = ({ currentRoute, onNavigate, currentUser }: { currentRoute: AppRoute, onNavigate: (r: AppRoute) => void, currentUser: User | null }) => {
  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.CEO;

  const items = [
    { id: AppRoute.DASHBOARD, icon: 'fa-chart-line', label: 'Inicio' },
    { id: AppRoute.PROJECTS, icon: 'fa-folder-open', label: 'Proy.' },
    { id: AppRoute.TOOLS, icon: 'fa-toolbox', label: 'Tools', highlight: true },
    { id: AppRoute.REPORTS, icon: 'fa-file-contract', label: 'Docs' },
    { id: AppRoute.TEAM, icon: 'fa-users', label: 'Equipo' },
  ];

  if (isAdmin) {
      items.push({ id: AppRoute.ADMIN, icon: 'fa-user-shield', label: 'Admin' });
  }

  return (
    // CAMBIO CLAVE: 'lg:hidden'. Se muestra en todo menos en pantallas grandes.
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 lg:hidden z-50 flex justify-around items-center px-2 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] safe-area-pb overflow-x-auto">
      {items.map(item => {
        const isActive = currentRoute === item.id;
        if (item.highlight) {
             return (
                 <button 
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="flex flex-col items-center justify-center -mt-8 relative group shrink-0 mx-2"
                 >
                     <div className="absolute inset-0 bg-ada-accent/20 rounded-full blur-lg animate-pulse"></div>
                     <div className="w-14 h-14 rounded-full bg-ada-900 text-ada-accent flex items-center justify-center shadow-lg border-4 border-slate-100 relative z-10 transition-transform active:scale-95">
                         <Icon name={item.icon} className="text-xl" />
                     </div>
                     <span className="text-[10px] font-bold text-slate-600 mt-1">{item.label}</span>
                 </button>
             )
        }
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg transition-all active:scale-95 shrink-0 ${isActive ? 'text-ada-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Icon name={item.icon} className={`text-xl mb-1 transition-transform ${isActive ? '-translate-y-1' : ''}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};