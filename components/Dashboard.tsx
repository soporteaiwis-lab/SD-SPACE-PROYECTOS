import React, { useState, useEffect } from 'react';
import { User, Project } from '../types';
import { APP_CONFIG } from '../constants'; // Import to check status

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

export const Dashboard = ({ currentUser, projects }: { currentUser: User, projects: Project[] }) => {
  // LOGIC FIX: Filter projects where the user is either the Lead OR in the Team list.
  // Updated for new Statuses: Count anything NOT 'Finalizado' as Active.
  const myActiveProjects = projects.filter(p => 
      p.status !== 'Finalizado' && 
      (p.leadId === currentUser.id || p.teamIds?.includes(currentUser.id))
  );
  
  const totalSystemProjects = projects.filter(p => p.status !== 'Finalizado');
  
  // Check System Status
  const isGeminiReady = !!APP_CONFIG.GEMINI_API_KEY && APP_CONFIG.GEMINI_API_KEY.length > 5;
  const isGithubReady = !!APP_CONFIG.GITHUB_TOKEN && APP_CONFIG.GITHUB_TOKEN.length > 5;
  const isDriveReady = !!APP_CONFIG.GOOGLE_CLIENT_ID && APP_CONFIG.GOOGLE_CLIENT_ID.length > 5;

  // Settings Modal State
  const [showConfig, setShowConfig] = useState(false);
  
  // UPDATED: Pre-fill with APP_CONFIG values (which now include hardcoded keys)
  const [manualKeys, setManualKeys] = useState({
      apiKey: localStorage.getItem('ada_env_API_KEY') || APP_CONFIG.GEMINI_API_KEY || '',
      githubToken: localStorage.getItem('ada_env_GITHUB_TOKEN') || APP_CONFIG.GITHUB_TOKEN || '',
      googleClientId: localStorage.getItem('ada_env_GOOGLE_CLIENT_ID') || APP_CONFIG.GOOGLE_CLIENT_ID || ''
  });

  // ESC Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowConfig(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveKeys = () => {
      try {
          // 1. Guardar Gemini API Key
          if (manualKeys.apiKey && manualKeys.apiKey.trim() !== '') {
              localStorage.setItem('ada_env_API_KEY', manualKeys.apiKey.trim());
          } else {
              localStorage.removeItem('ada_env_API_KEY');
          }

          // 2. Guardar GitHub Token (En ambas llaves para asegurar compatibilidad total)
          if (manualKeys.githubToken && manualKeys.githubToken.trim() !== '') {
              const token = manualKeys.githubToken.trim();
              localStorage.setItem('ada_env_GITHUB_TOKEN', token); // Para APP_CONFIG
          } else {
              localStorage.removeItem('ada_env_GITHUB_TOKEN');
          }

          // 3. Guardar Google Client ID (Para Drive OAuth)
          if (manualKeys.googleClientId && manualKeys.googleClientId.trim() !== '') {
            localStorage.setItem('ada_env_GOOGLE_CLIENT_ID', manualKeys.googleClientId.trim());
          } else {
            localStorage.removeItem('ada_env_GOOGLE_CLIENT_ID');
          }
          
          // 4. Feedback y Recarga
          alert("✅ Configuración guardada exitosamente.\n\nEl sistema se reiniciará ahora para aplicar los cambios.");
          window.location.reload();
      } catch (e) {
          console.error(e);
          alert("Error al guardar en el almacenamiento local del navegador.");
      }
  };

  // Helper to get current origin for Google Console
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-6 animate-fade-in print:hidden pb-20 lg:pb-0">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-ada-900">Hola, {currentUser.name.split(' ')[0]}</h2>
          <p className="text-slate-500 mt-1 text-sm lg:text-base">Bienvenido al ecosistema corporativo ADA.</p>
        </div>
        
        {/* Header Actions - Responsive Fix */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
             <div className="text-left lg:text-right">
                <p className="text-xs lg:text-sm font-medium text-slate-400">{new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
             </div>

             <div className="flex items-center gap-3">
                 {/* System Status Widget (Hidden on Mobile to save space, but dots preserved if needed or hidden entirely) */}
                 <div className="hidden md:flex items-center gap-3 bg-white p-2 px-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2" title={isGeminiReady ? "Gemini AI: Conectado" : "Gemini AI: Sin Llave"}>
                        <div className={`w-2.5 h-2.5 rounded-full ${isGeminiReady ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></div>
                        <span className="text-xs font-bold text-slate-600">AI</span>
                    </div>
                    <div className="w-[1px] h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-2" title={isGithubReady ? "GitHub API: Token Configurado" : "GitHub API: Manual"}>
                        <div className={`w-2.5 h-2.5 rounded-full ${isGithubReady ? 'bg-green-500' : 'bg-orange-400'}`}></div>
                        <span className="text-xs font-bold text-slate-600">Git</span>
                    </div>
                    <div className="w-[1px] h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-2" title={isDriveReady ? "Google Drive: Client ID Configurado" : "Google Drive: Sin Client ID"}>
                        <div className={`w-2.5 h-2.5 rounded-full ${isDriveReady ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        <span className="text-xs font-bold text-slate-600">Drive</span>
                    </div>
                 </div>
                 
                 {/* Config Button - ALWAYS VISIBLE */}
                 <button 
                    onClick={() => setShowConfig(true)} 
                    className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-ada-600 rounded-xl shadow-sm border border-slate-200 transition-colors" 
                    title="Configuración Manual de Llaves"
                 >
                    <Icon name="fa-cog" />
                 </button>
             </div>
        </div>
      </header>

      {/* Google Integrations Bar - Optimized for Mobile (No Scrolling) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-6">
        <h3 className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Integraciones Google Workspace</h3>
        {/* GRID LAYOUT: 2 cols on mobile, 4 on desktop. No scrolling. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <a href="https://meet.google.com" target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-100">
             <Icon name="fa-video" className="text-xl" />
             <span className="font-semibold text-sm">Meet</span>
          </a>
          <a href="https://mail.google.com" target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-100">
             <Icon name="fa-envelope" className="text-xl" />
             <span className="font-semibold text-sm">Gmail</span>
          </a>
          <a href="https://calendar.google.com" target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100">
             <Icon name="fa-calendar-alt" className="text-xl" />
             <span className="font-semibold text-sm">Calendar</span>
          </a>
          <a href="https://drive.google.com" target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors border border-yellow-100">
             <Icon name="fa-google-drive" className="text-xl" /> 
             <span className="font-semibold text-sm">Drive</span>
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Icon name="fa-layer-group" className="text-8xl text-blue-600" />
          </div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Icon name="fa-briefcase" className="text-xl" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-ada-900 relative z-10">{myActiveProjects.length}</h3>
          <p className="text-slate-500 text-sm relative z-10 font-medium">Mis Proyectos Activos</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Icon name="fa-building" className="text-xl" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-ada-900">{totalSystemProjects.length}</h3>
          <p className="text-slate-500 text-sm font-medium">Total Empresa (En Curso)</p>
        </div>

        <div className="bg-gradient-to-br from-ada-600 to-ada-500 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Icon name="fa-wand-magic-sparkles" className="text-xl" />
            </div>
             <div className="flex gap-1">
                 {isGeminiReady && <span title="AI Conectada" className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]"></span>}
             </div>
          </div>
          <h3 className="text-lg font-bold mb-1">ADA AI</h3>
          <p className="text-white/80 text-sm">{isGeminiReady ? 'Conexión segura establecida.' : 'Modo Offline (Sin API Key)'}</p>
        </div>
      </div>

      {/* Manual Configuration Modal - OPTIMIZED */}
      {showConfig && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh]">
                  <div className="bg-slate-900 p-4 flex justify-between items-center text-white shrink-0">
                      <h3 className="font-bold flex items-center gap-2"><Icon name="fa-cogs" /> Configuración de Sistema</h3>
                      <button onClick={() => setShowConfig(false)} className="hover:text-red-400"><Icon name="fa-times" /></button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                      
                      {/* DYNAMIC HELP BOX FOR REDIRECT_URI_MISMATCH */}
                      <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200 text-xs shadow-sm">
                          <p className="font-bold text-red-700 text-sm mb-2"><Icon name="fa-exclamation-circle" /> Solución Error 400 (Google)</p>
                          <p className="text-slate-700 mb-2 leading-relaxed">
                            Si ves el error <strong>"redirect_uri_mismatch"</strong>, debes agregar la siguiente URL exacta en tu Google Cloud Console (APIs & Services {'>'} Credentials {'>'} Client ID {'>'} Authorized JavaScript origins):
                          </p>
                          <div className="flex gap-2">
                            <code className="bg-white border-2 border-red-100 p-2 rounded flex-1 truncate font-mono text-red-600 font-bold select-all">
                                {currentOrigin}
                            </code>
                            <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(currentOrigin);
                                  alert("URL copiada. Pégala en Google Cloud Console.");
                                }}
                                className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white font-bold"
                                title="Copiar URL"
                            >
                                <Icon name="fa-copy" />
                            </button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gemini API Key (Google AI)</label>
                          <input 
                              type="password" 
                              className="w-full border p-3 rounded-lg font-mono text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-ada-500" 
                              placeholder="AIzb..." 
                              value={manualKeys.apiKey}
                              onChange={e => setManualKeys({...manualKeys, apiKey: e.target.value})}
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GitHub Personal Access Token (PAT)</label>
                          <input 
                              type="password" 
                              className="w-full border p-3 rounded-lg font-mono text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-ada-500" 
                              placeholder="ghp_..." 
                              value={manualKeys.githubToken}
                              onChange={e => setManualKeys({...manualKeys, githubToken: e.target.value})}
                          />
                      </div>

                      <div className="border-t pt-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                           <Icon name="fab fa-google-drive" /> Google OAuth Client ID (Para Drive Uploads)
                        </label>
                        <p className="text-[10px] text-slate-400 mb-2">
                           Requerido para subir archivos directo a Drive. 
                           <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-ada-600 underline ml-1 font-bold">
                               Creado en Google Cloud Console
                           </a>.
                        </p>
                        <input 
                              type="text" 
                              className="w-full border p-3 rounded-lg font-mono text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-ada-500" 
                              placeholder="xxxxxxxx-xxxxxxxx.apps.googleusercontent.com" 
                              value={manualKeys.googleClientId}
                              onChange={e => setManualKeys({...manualKeys, googleClientId: e.target.value})}
                          />
                      </div>
                  </div>
                  <div className="p-4 border-t shrink-0 bg-slate-50 flex justify-end gap-2">
                      <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                      <button onClick={handleSaveKeys} className="px-6 py-2 bg-ada-600 text-white font-bold rounded-lg hover:bg-ada-700 shadow-lg">Guardar y Recargar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};