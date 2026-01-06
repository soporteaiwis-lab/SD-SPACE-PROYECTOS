import React, { useState, useRef } from 'react';
import { User, Project, ProjectLog, UserRole } from '../types';
import { generateText } from '../services/geminiService';
import { UploadAssistantModal } from './UploadAssistantModal';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

export const ReportsView = ({ currentUser, projects, onUpdateProject }: { currentUser: User, projects: Project[], onUpdateProject: (p: Project) => void }) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalSummary, setGeneralSummary] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isGlobalMode, setIsGlobalMode] = useState(false);
  const [newLogTexts, setNewLogTexts] = useState<{[key:string]: string}>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUpload, setPendingUpload] = useState<{file: File, projectId: string, type: 'drive' | 'github'} | null>(null);

  // LOGIC: If Global Mode is ON, show ALL active projects. Otherwise, show only user's projects.
  const allSystemActiveProjects = projects.filter(p => p.status === 'En Curso');
  const myActiveProjects = projects.filter(p => p.status === 'En Curso' && (p.leadId === currentUser.id || p.teamIds?.includes(currentUser.id)));
  
  const projectsToConsider = isGlobalMode ? allSystemActiveProjects : myActiveProjects;
  const displayProjects = projectsToConsider.filter(p => isGlobalMode ? true : p.report === true); // Global shows all by default, User mode filters by selection

  const toggleReportInclude = (p: Project) => onUpdateProject({ ...p, report: !p.report });

  const handleRefineWithAI = async () => {
    if (!generalSummary.trim()) return;
    setIsAiProcessing(true);
    const context = isGlobalMode ? "Global Corporate Report for CEO" : "Weekly Activity Report";
    const refined = await generateText(generalSummary, `You are a professional editor. Refine this ${context} summary to be concise, clear, and professional in Spanish. Do not use complex markdown, just simple paragraphs.`);
    setGeneralSummary(refined);
    setIsAiProcessing(false);
  };

  const handleAutoGenerate = () => {
    let draft = `RESUMEN ${isGlobalMode ? 'CORPORATIVO GLOBAL' : 'SEMANAL'} (${reportDate})\n\n`;
    displayProjects.forEach(p => {
        draft += `PROYECTO: ${p.name}\n`;
        draft += `Cliente: ${p.client} | Avance: ${p.progress}%\n`;
        if (p.logs && p.logs.length > 0) {
             draft += `Último hito: ${p.logs[p.logs.length - 1].text}\n`;
        } else {
             draft += `Sin novedades registradas.\n`;
        }
        draft += `--------------------------------\n`;
    });
    setGeneralSummary(draft);
  };

  const handleGlobalExport = () => {
    // If CEO, direct access. If not, password prompt.
    if (currentUser.role === UserRole.CEO || prompt("Ingrese Clave Corporativa (CEO):") === '1234') {
        setIsGlobalMode(true);
        // Force re-render with global data then print
        setTimeout(() => {
            alert("Modo Global Activado. Se mostrarán todos los proyectos de la empresa.");
        }, 100);
    } else {
        alert("Acceso denegado. Solo el CEO o administradores pueden ver el reporte global.");
    }
  };

  const handlePrintPDF = () => {
      window.print();
  };

  const handleDownloadHTML = () => {
    let projectContentHTML = '';
    displayProjects.forEach(p => {
        projectContentHTML += `
          <div style="margin-bottom: 20px; border-left: 4px solid #2563eb; padding-left: 15px;">
             <h3 style="margin: 0; color: #1e293b;">${p.name}</h3>
             <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Cliente: ${p.client} | Avance: ${p.progress}%</p>
             <div style="background: #f8fafc; padding: 10px; border-radius: 5px; margin-top: 10px;">
                <ul style="list-style: none; padding: 0;">
                   ${p.logs.slice(0, 5).map(l => `<li style="margin-bottom: 5px; font-size: 13px;"><strong>${new Date(l.date).toLocaleDateString()}:</strong> ${l.text}</li>`).join('')}
                </ul>
             </div>
          </div>
        `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Informe ${reportDate}</title>
        <style>body { font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; }</style>
      </head>
      <body>
        <h1 style="border-bottom: 2px solid #333; padding-bottom: 10px;">${isGlobalMode ? 'Reporte Global Corporativo' : 'Informe de Actividades'}</h1>
        <p><strong>Fecha:</strong> ${reportDate} | <strong>Generado por:</strong> ${currentUser.name}</p>
        
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; font-size: 16px; text-transform: uppercase;">Resumen Ejecutivo</h2>
          <p style="white-space: pre-wrap;">${generalSummary || 'Sin resumen general.'}</p>
        </div>

        <h2>Detalle de Proyectos (${displayProjects.length})</h2>
        ${projectContentHTML || '<p>No hay proyectos en este informe.</p>'}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_${isGlobalMode ? 'GLOBAL' : 'ADA'}_${reportDate}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const pid = e.target.getAttribute('data-pid');
      const type = e.target.getAttribute('data-type') as 'drive' | 'github';
      if (e.target.files && e.target.files[0] && pid && type) {
          setPendingUpload({
              file: e.target.files[0],
              projectId: pid,
              type: type
          });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmUpload = () => {
      if (!pendingUpload) return;
      const { file, projectId, type } = pendingUpload;
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const repo = project.repositories?.find(r => r.type === type);
        const targetUrl = repo?.url || (type === 'drive' ? 'https://drive.google.com' : 'https://github.com');
        
        const newLog: ProjectLog = {
          id: 'up' + Date.now(),
          date: new Date().toISOString(),
          text: `✅ ARCHIVO CARGADO: ${file.name} (Ver en ${type === 'drive' ? 'Drive' : 'GitHub'}) - ${targetUrl}`,
          author: currentUser.name
        };
        onUpdateProject({ ...project, logs: [...(project.logs || []), newLog] });
      }
      setPendingUpload(null);
  };

  const handleInlineAddLog = (projectId: string) => {
    const text = newLogTexts[projectId];
    if (!text?.trim()) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const newLog: ProjectLog = { id: 'log' + Date.now(), date: new Date().toISOString(), text: text, author: currentUser.name };
    onUpdateProject({ ...project, logs: [...(project.logs || []), newLog] });
    setNewLogTexts(prev => ({ ...prev, [projectId]: '' }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-24 md:pb-0">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {pendingUpload && (
           <UploadAssistantModal 
              file={pendingUpload.file} 
              project={projects.find(p => p.id === pendingUpload.projectId)!} 
              type={pendingUpload.type} 
              onClose={() => setPendingUpload(null)} 
              onConfirm={handleConfirmUpload} 
           />
       )}

      {/* Control Panel */}
      <div className="lg:col-span-1 space-y-6 print:hidden order-2 lg:order-1">
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-ada-900 mb-4">Configuración</h2>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                  <input type="date" className="w-full border p-2 rounded-lg" value={reportDate} onChange={e => setReportDate(e.target.value)} />
               </div>
               
               {/* Show checkboxes only in individual mode to filter specific projects */}
               {!isGlobalMode && (
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Proyectos a Incluir</label>
                  <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-48 overflow-y-auto">
                     {myActiveProjects.length === 0 && <p className="text-xs text-slate-400">No tienes proyectos asignados.</p>}
                     {myActiveProjects.map(p => (
                        <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer p-1">
                           <input type="checkbox" checked={p.report} onChange={() => toggleReportInclude(p)} className="rounded text-ada-600" />
                           <span className="truncate">{p.name}</span>
                        </label>
                     ))}
                  </div>
               </div>
               )}

               {isGlobalMode && (
                   <div className="bg-ada-50 p-3 rounded-lg border border-ada-200 text-ada-700 text-sm">
                       <strong><Icon name="fa-globe" /> Modo Global Activo:</strong><br/>
                       Viendo {allSystemActiveProjects.length} proyectos de toda la empresa.
                   </div>
               )}

               <button onClick={handleAutoGenerate} className="w-full py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-bold text-sm">
                  <Icon name="fa-magic" /> Autogenerar Texto
               </button>
               
               <hr className="my-2"/>
               
               <div className="grid grid-cols-2 gap-2">
                   <button onClick={handlePrintPDF} className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-bold text-sm">
                      <Icon name="fa-print" /> Imprimir / PDF
                   </button>
                   <button onClick={handleDownloadHTML} className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-bold text-sm">
                      <Icon name="fa-file-code" /> HTML
                   </button>
               </div>

               <button onClick={handleGlobalExport} className={`w-full py-3 rounded-lg font-bold text-sm text-white ${isGlobalMode ? 'bg-green-600 hover:bg-green-700' : 'bg-ada-900 hover:bg-ada-800'}`}>
                  <Icon name="fa-globe" /> {isGlobalMode ? 'Actualizar Vista Global' : 'Exportar GLOBAL (CEO)'}
               </button>
            </div>
         </div>

         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
               <label className="block text-sm font-bold text-slate-900">Resumen Ejecutivo</label>
               <button onClick={handleRefineWithAI} disabled={isAiProcessing} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  {isAiProcessing ? '...' : 'Mejorar con AI'}
               </button>
            </div>
            <textarea 
               className="w-full border p-3 rounded-lg h-60 text-base md:text-sm focus:ring-2 focus:ring-ada-500 outline-none leading-relaxed"
               placeholder="Escribe aquí o usa Autogenerar..."
               value={generalSummary}
               onChange={e => setGeneralSummary(e.target.value)}
            ></textarea>
         </div>
      </div>

      {/* Report Preview */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-slate-200 p-6 md:p-8 min-h-[600px] order-1 lg:order-2">
         <div className="text-center border-b-2 border-slate-800 pb-6 mb-8">
            <h1 className="text-xl md:text-3xl font-bold text-slate-900 uppercase">{isGlobalMode ? 'REPORTE CORPORATIVO GLOBAL' : 'INFORME DE ACTIVIDADES'}</h1>
            <p className="text-slate-500 mt-2">ADA Ltda - {reportDate}</p>
            {isGlobalMode && <span className="bg-ada-900 text-white text-xs px-2 py-1 rounded mt-2 inline-block">VISTA DE GERENCIA</span>}
         </div>

         <div className="mb-8 bg-slate-50 p-4 rounded-lg">
             <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Resumen</h3>
             <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{generalSummary || '(Utiliza el botón Autogenerar para crear un resumen inicial)'}</p>
         </div>

         <div className="space-y-6">
             {displayProjects.length === 0 && <p className="text-center text-slate-400 py-10">No hay proyectos seleccionados para el informe.</p>}
             {displayProjects.map(project => (
                 <div key={project.id} className="border-l-4 border-ada-600 pl-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="text-lg font-bold text-slate-900">{project.name}</h4>
                            <p className="text-sm text-slate-500 mb-2">Cliente: {project.client} • Avance: {project.progress}%</p>
                        </div>
                        <div className="flex gap-1 print:hidden">
                            <button className="text-slate-300 hover:text-green-600"><Icon name="fab fa-google-drive" /></button>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3">
                       <ul className="space-y-2 mb-3">
                           {project.logs.slice(0, 3).map(log => (
                               <li key={log.id} className="text-sm text-slate-700 flex gap-2">
                                   <span className="font-mono text-xs text-slate-500 shrink-0">{new Date(log.date).toLocaleDateString()}</span>
                                   <span>{log.text}</span>
                               </li>
                           ))}
                       </ul>
                       <div className="flex gap-2 print:hidden">
                           <input 
                               className="flex-1 text-sm border p-2 rounded" 
                               placeholder="Nuevo hito..."
                               value={newLogTexts[project.id] || ''}
                               onChange={e => setNewLogTexts({...newLogTexts, [project.id]: e.target.value})}
                           />
                           <button onClick={() => handleInlineAddLog(project.id)} className="bg-blue-600 text-white px-3 rounded"><Icon name="fa-plus"/></button>
                       </div>
                    </div>
                 </div>
             ))}
         </div>
      </div>
    </div>
  );
};