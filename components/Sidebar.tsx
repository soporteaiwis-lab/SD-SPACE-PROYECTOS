import React from 'react';
import { User, AppRoute, UserRole } from '../types';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

export const Sidebar = ({ 
  currentUser, 
  currentRoute, 
  onNavigate, 
  onLogout,
  onOpenTools
}: { 
  currentUser: User, 
  currentRoute: AppRoute, 
  onNavigate: (r: AppRoute) => void,
  onLogout: () => void,
  onOpenTools: () => void
}) => {
  const menuItems = [
    { id: AppRoute.DASHBOARD, label: 'Dashboard', icon: 'fa-chart-line' },
    { id: AppRoute.PROJECTS, label: 'Proyectos', icon: 'fa-folder-open' },
    { id: AppRoute.GEMS, label: 'Mis Gemas', icon: 'fa-gem' },
    { id: AppRoute.TEAM, label: 'Equipo', icon: 'fa-users' },
    { id: AppRoute.REPORTS, label: 'Informes', icon: 'fa-file-contract' },
  ];

  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CEO;

  return (
    // CAMBIO CLAVE: 'hidden lg:flex'. Solo se muestra en pantallas GRANDES (lg). Oculto en móbiles.
    <div className="w-64 bg-ada-900 text-slate-300 hidden lg:flex flex-col h-screen fixed left-0 top-0 shadow-xl z-20 print:hidden">
      <div className="p-6 flex items-center gap-3 border-b border-ada-800">
        <div className="w-10 h-10 bg-gradient-to-br from-ada-500 to-ada-accent rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
          A
        </div>
        <div>
          <h1 className="text-white font-bold tracking-tight">ADA</h1>
          <p className="text-xs text-ada-accent uppercase tracking-wider">Portal Beta 1.0</p>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentRoute === item.id 
                ? 'bg-ada-600 text-white shadow-lg shadow-ada-900/50' 
                : 'hover:bg-ada-800 hover:text-white'
            }`}
          >
            <Icon name={item.icon} className={`text-lg ${currentRoute === item.id ? 'text-white' : 'text-slate-500 group-hover:text-ada-accent'}`} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
        
        {/* Admin Link - Only for Admins */}
        {isAdmin && (
             <>
             <button
                onClick={() => onNavigate(AppRoute.ADMIN)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mt-2 ${
                  currentRoute === AppRoute.ADMIN 
                    ? 'bg-red-900/50 text-red-200 border border-red-800' 
                    : 'hover:bg-red-900/30 hover:text-red-200'
                }`}
              >
                <Icon name="fa-user-shield" className="text-lg text-red-400" />
                <span className="font-medium">Admin Usuarios</span>
              </button>

              <button
                onClick={() => onNavigate(AppRoute.DATABASE)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mt-1 ${
                  currentRoute === AppRoute.DATABASE
                    ? 'bg-orange-900/50 text-orange-200 border border-orange-800' 
                    : 'hover:bg-orange-900/30 hover:text-orange-200'
                }`}
              >
                <Icon name="fa-database" className="text-lg text-orange-400" />
                <span className="font-medium">Base de Datos</span>
              </button>
             </>
        )}

        {/* Tools Button separate in Desktop */}
        <button
            onClick={onOpenTools}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-ada-800 hover:text-white transition-all group mt-4 border border-ada-800"
        >
            <Icon name="fa-toolbox" className="text-lg text-ada-accent" />
            <span className="font-medium text-ada-accent">Herramientas</span>
        </button>
      </nav>

      <div className="p-4 border-t border-ada-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-ada-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-ada-800 rounded-lg transition-colors">
          <Icon name="fa-sign-out-alt" /> Cerrar Sesión
        </button>
      </div>
    </div>
  );
};