import React, { useState, useEffect } from 'react';
import { Project, User, UserRole, ProjectLog, Repository, UsedID, ProjectStatus } from '../types';
import { RepositoryManager } from './RepositoryManager'; 
import { generateText } from '../services/geminiService'; // Import AI Service

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

// STATUS CONFIGURATION - Includes Legacy 'En Curso' for compatibility
const PROJECT_STATUSES: ProjectStatus[] = ['Planificación', 'En Desarrollo', 'En QA', 'Despliegue', 'Finalizado', 'En Curso'];

const getStatusColor = (s: ProjectStatus) => {
    switch(s) {
        case 'Planificación': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'En Desarrollo': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'En Curso': return 'bg-blue-50 text-blue-600 border-blue-200'; // Legacy handled
        case 'En QA': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'Despliegue': return 'bg-teal-100 text-teal-700 border-teal-200';
        case 'Finalizado': return 'bg-slate-200 text-slate-500 border-slate-300';
        default: return 'bg-slate-100 text-slate-500';
    }
};

export const ProjectsView = ({ 
  projects, 
  users, 
  currentUser,
  onAddProject, 
  onDeleteProject,
  onUpdateProject,
  usedIds, 
  onRegisterId 
}: { 
  projects: Project[], 
  users: User[],
  currentUser: User,
  onAddProject: (p: Project) => void,
  onDeleteProject: (id: string) => void,
  onUpdateProject: (p: Project) => void,
  usedIds: UsedID[],
  onRegisterId: (r: UsedID) => void
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);
  
  const [repoManagerConfig, setRepoManagerConfig] = useState<{ project: Project, type: 'github' | 'drive' } | null>(null);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filters, setFilters] = useState({ name: '', client: '', status: 'Todos' });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // LOGS STATE
  const [newLogText, setNewLogText] = useState('');

  // AI Analysis State
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [isAnalyzingTeam, setIsAnalyzingTeam] = useState(false);

  // Collect all unique skills from users for the Combo Box
  const availableSkills = Array.from(new Set(users.flatMap(u => u.skills.map(s => s.name)))).sort();

  // New Project State
  const [newProject, setNewProject] = useState<Partial<Project> & { manualId?: string, repoGithub?: string, repoDrive?: string }>({
    name: '', 
    client: '', 
    status: 'Planificación', 
    progress: 0, 
    description: '', 
    repositories: [], 
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    teamIds: [],
    technologies: [] // Array of strings
  });

  const [editProjectData, setEditProjectData] = useState<Partial<Project>>({});
  const [techInput, setTechInput] = useState(''); // Temporary input for custom tech

  // --- ESC KEY LISTENER (MASTER CLOSE) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowEditModal(false);
        setShowLogModal(false);
        setShowTeamModal(false);
        setShowReqModal(false);
        setRepoManagerConfig(null);
        setActiveMenuId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getNextProjectId = () => {
      const numbers = usedIds.map(u => parseInt(u.id.replace(/\D/g, '')) || 0);
      if (numbers.length === 0) {
          const currentNumbers = projects.map(p => parseInt(p.id.replace(/\D/g, '')) || 0);
          numbers.push(...currentNumbers);
      }
      const max = Math.max(0, ...numbers);
      return `PROYECTO_${String(max + 1).padStart(3, '0')}`;
  };

  const openCreateModal = () => {
      const nextId = getNextProjectId();
      setNewProject({
        name: '', 
        client: '', 
        status: 'Planificación', 
        progress: 0, 
        description: '', 
        repositories: [], 
        startDate: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        teamIds: [],
        manualId: nextId,
        repoGithub: 'https://github.com/soporteaiwis-lab/SIMPLEDATA-APP-CORPORATE-PROYECTOS-OFICIAL-',
        repoDrive: '',
        technologies: []
      });
      setTechInput('');
      setAiRecommendation('');
      setShowCreateModal(true);
  };

  const handleCreate = () => {
    if (!newProject.name || !newProject.client || !newProject.manualId) return;
    
    if (usedIds.some(u => u.id === newProject.manualId)) {
        if (!confirm(`El ID ${newProject.manualId} ya existe en el historial. ¿Usarlo igual?`)) return;
    }

    const initialRepos: Repository[] = [];
    if (newProject.repoGithub) initialRepos.push({ id: `r_gh_${Date.now()}`, type: 'github', alias: 'Repositorio Oficial', url: newProject.repoGithub });
    if (newProject.repoDrive) initialRepos.push({ id: `r_dr_${Date.now()}`, type: 'drive', alias: 'Carpeta Drive Oficial', url: newProject.repoDrive });

    const project: Project = {
      id: newProject.manualId, 
      name: newProject.name, 
      client: newProject.client,
      encargadoCliente: newProject.encargadoCliente || 'Sin Asignar',
      status: newProject.status as ProjectStatus,
      description: newProject.description || '',
      progress: newProject.progress || 0,
      deadline: newProject.deadline || new Date().toISOString(),
      startDate: newProject.startDate || new Date().toISOString(),
      leadId: newProject.leadId || currentUser.id,
      teamIds: newProject.teamIds || [],
      technologies: newProject.technologies || [],
      isOngoing: newProject.status !== 'Finalizado',
      report: newProject.status !== 'Finalizado',
      year: parseInt(newProject.startDate?.split('-')[0] || '2025'),
      logs: [],
      repositories: initialRepos
    };
    
    onAddProject(project);
    onRegisterId({ id: project.id, name: project.name, dateUsed: new Date().toISOString(), createdBy: currentUser.name });
    setShowCreateModal(false);
  };

  const toggleNewProjectTeamMember = (userId: string) => {
      const current = newProject.teamIds || [];
      setNewProject({ ...newProject, teamIds: current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId] });
  };

  const handleOpenEdit = (p: Project) => { 
      setSelectedProject(p); 
      setEditProjectData({ ...p }); 
      setTechInput('');
      setShowEditModal(true); 
  };
  
  const handleUpdate = () => { 
      if (selectedProject && editProjectData) { 
          const updatedData = {
              ...selectedProject,
              ...editProjectData,
              isOngoing: editProjectData.status !== 'Finalizado',
              report: editProjectData.status !== 'Finalizado'
          };
          onUpdateProject(updatedData as Project); 
          setShowEditModal(false); 
      } 
  };
  
  // --- LOGIC FOR LOGS ---
  const handleOpenLog = (p: Project) => { 
      setSelectedProject(p); 
      setNewLogText('');
      setShowLogModal(true); 
  };

  const handleAddLog = () => {
      if (!selectedProject || !newLogText.trim()) return;
      
      const newLog: ProjectLog = {
          id: `l_${Date.now()}`,
          date: new Date().toISOString(),
          text: newLogText,
          author: currentUser.name
      };

      const updatedProject = {
          ...selectedProject,
          logs: [...(selectedProject.logs || []), newLog]
      };

      onUpdateProject(updatedProject);
      setSelectedProject(updatedProject); // Update local state for immediate view
      setNewLogText('');
  };
  
  // --- TECH STACK HANDLERS ---
  const addTech = (tech: string, isEdit: boolean) => {
      if (!tech) return;
      if (isEdit) {
          const current = editProjectData.technologies || [];
          if (!current.includes(tech)) setEditProjectData({ ...editProjectData, technologies: [...current, tech] });
      } else {
          const current = newProject.technologies || [];
          if (!current.includes(tech)) setNewProject({ ...newProject, technologies: [...current, tech] });
      }
      setTechInput('');
  };

  const removeTech = (tech: string, isEdit: boolean) => {
      if (isEdit) {
          setEditProjectData({ ...editProjectData, technologies: editProjectData.technologies?.filter(t => t !== tech) });
      } else {
          setNewProject({ ...newProject, technologies: newProject.technologies?.filter(t => t !== tech) });
      }
  };

  const openRepoManager = (project: Project, type: 'github' | 'drive') => {
      setRepoManagerConfig({ project, type });
      setActiveMenuId(null);
  };
  
  const handleOpenTeam = (p: Project) => { setSelectedProject(p); setShowTeamModal(true); };
  const handleOpenReq = (p: Project) => { setSelectedProject(p); setShowReqModal(true); };
  
  const handleToggleTeamMember = (id: string) => { 
      if (!selectedProject) return;
      const currentIds = selectedProject.teamIds || [];
      const newIds = currentIds.includes(id) ? currentIds.filter(uid => uid !== id) : [...currentIds, id];
      const updatedProject = { ...selectedProject, teamIds: newIds };
      setSelectedProject(updatedProject); 
      onUpdateProject(updatedProject);
  };

  // --- AI TEAM ANALYSIS ---
  const handleAnalyzeTeam = async () => {
      const techList = newProject.technologies?.join(', ');
      
      if (!newProject.name || !techList) {
          alert("Ingresa el Nombre del Proyecto y selecciona al menos una tecnología del Stack.");
          return;
      }
      setIsAnalyzingTeam(true);
      
      try {
          // Prepare Data for AI
          const userStats = users.map(u => {
              const activeCount = projects.filter(p => p.status !== 'Finalizado' && (p.teamIds.includes(u.id) || p.leadId === u.id)).length;
              return `- ${u.name} (${u.role}): Skills=[${u.skills.map(s => `${s.name} (${s.level}%)`).join(', ')}]. Active Projects: ${activeCount}.`;
          }).join('\n');

          const prompt = `
          Context: You are an expert Technical Recruiter AI.
          Task: Suggest the best team for a new software project.
          
          New Project Info:
          - Name: ${newProject.name}
          - Description: ${newProject.description || 'N/A'}
          - Required Tech Stack: ${techList}
          - Dates: ${newProject.startDate} to ${newProject.deadline}
          
          Available Staff & Workload:
          ${userStats}
          
          Instructions:
          1. Recommend 1 Project Lead and 2-3 Developers/Analysts who match the Stack technologies.
          2. Prioritize people with fewer active projects if skills match.
          3. Explain strictly in Spanish.
          `;

          const result = await generateText(prompt, "You are a helpful HR and Tech Lead assistant.");
          setAiRecommendation(result);
      } catch (e) {
          setAiRecommendation("Error al conectar con la IA. Verifica tu API Key.");
      } finally {
          setIsAnalyzingTeam(false);
      }
  };

  const filteredProjects = projects.filter(p => {
    const matchName = p.name.toLowerCase().includes(filters.name.toLowerCase()) || p.id.toLowerCase().includes(filters.name.toLowerCase());
    
    // Status Filter Logic: treat "En Curso" (legacy) similar to "En Desarrollo" if the user filters for "En Desarrollo"
    let matchStatus = false;
    if (filters.status === 'Todos') {
        matchStatus = true;
    } else {
        matchStatus = p.status === filters.status;
    }

    return matchName && p.client.toLowerCase().includes(filters.client.toLowerCase()) && matchStatus;
  });

  return (
    <div className="space-y-6 print:hidden pb-24 lg:pb-0">
       
       {repoManagerConfig && (
           <RepositoryManager 
               project={repoManagerConfig.project}
               initialType={repoManagerConfig.type}
               onClose={() => setRepoManagerConfig(null)}
               onUpdateProject={onUpdateProject}
               currentUser={currentUser}
           />
       )}

       <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <h2 className="text-2xl font-bold text-SIMPLEDATA-900">Gestión de Proyectos (SDLC)</h2>
            <button onClick={openCreateModal} className="w-full lg:w-auto bg-SIMPLEDATA-600 hover:bg-SIMPLEDATA-700 text-white px-4 py-3 lg:py-2 rounded-lg text-sm font-medium transition-colors shadow-md flex items-center justify-center">
            <Icon name="fa-plus" className="mr-2" /> Nuevo Proyecto
            </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
             <div className="flex-1 relative">
                 <Icon name="fa-search" className="absolute left-3 top-3 text-slate-400 text-sm" />
                 <input 
                    className="w-full border pl-9 p-2 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors" 
                    placeholder="Buscar por nombre..." 
                    value={filters.name}
                    onChange={e => setFilters({...filters, name: e.target.value})}
                 />
             </div>
             <div className="flex gap-2">
                 <input 
                    className="flex-1 md:w-40 border p-2 rounded-lg text-sm bg-slate-50" 
                    placeholder="Cliente..." 
                    value={filters.client}
                    onChange={e => setFilters({...filters, client: e.target.value})}
                 />
                 <select 
                    className="flex-1 md:w-40 border p-2 rounded-lg text-sm bg-slate-50 font-medium text-slate-700"
                    value={filters.status}
                    onChange={e => setFilters({...filters, status: e.target.value})}
                 >
                     <option value="Todos">Todos</option>
                     {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
             </div>
        </div>
      </div>

      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm table-fixed min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 w-1/4">Proyecto</th> <th className="p-3 w-1/5">Cliente</th> <th className="p-3 text-center w-24">Equipo</th> <th className="p-3 w-32">Fechas</th> <th className="p-3 text-center w-32">Estado</th> <th className="p-3 text-center w-28">Repositorios</th> <th className="p-3 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map(project => {
                  const isAssigned = project.teamIds.includes(currentUser.id) || project.leadId === currentUser.id;
                  return (
                  <tr key={project.id} className={`hover:bg-slate-50 ${isAssigned ? 'bg-red-50/30' : ''}`}>
                    <td className="p-3">
                        <div className="flex items-center gap-2">
                            {isAssigned && <div className="w-1.5 h-8 bg-red-500 rounded-full" title="Estás asignado a este proyecto"></div>}
                            <div className="min-w-0">
                                <div className={`font-bold truncate ${isAssigned ? 'text-red-700' : 'text-slate-800'}`}>{project.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{project.id}</div>
                                <button onClick={()=>handleOpenReq(project)} className="text-xs text-blue-500 hover:underline">Ver Resumen</button>
                            </div>
                        </div>
                    </td>
                    <td className="p-3"><div className="truncate">{project.client}</div></td>
                    <td className="p-3 text-center">
                        <button 
                            onClick={()=>handleOpenTeam(project)} 
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm ${isAssigned ? 'bg-red-100 border-red-300 text-red-600 font-bold animate-pulse' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'}`}
                            title={isAssigned ? "Estás en este Equipo" : "Ver Equipo"}
                        >
                            <Icon name="fa-users-cog" className={isAssigned ? "text-lg" : ""}/>
                        </button>
                    </td>
                    <td className="p-3 text-xs"><div>In: {new Date(project.startDate || '').toLocaleDateString()}</div><div>Fin: {new Date(project.deadline).toLocaleDateString()}</div></td>
                    <td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(project.status)}`}>{project.status}</span></td>
                    <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                            <button onClick={()=>openRepoManager(project,'drive')} className="p-1 relative group">
                                <Icon name="fab fa-google-drive" className={`text-lg ${project.repositories?.some(r=>r.type==='drive') ? 'text-green-600' : 'text-slate-300'}`}/>
                            </button>
                            <button onClick={()=>openRepoManager(project,'github')} className="p-1 relative group">
                                <Icon name="fab fa-github" className={`text-lg ${project.repositories?.some(r=>r.type==='github') ? 'text-black' : 'text-slate-300'}`}/>
                            </button>
                        </div>
                    </td>
                    <td className="p-3 text-center"><div className="flex justify-center gap-1"><button onClick={()=>handleOpenEdit(project)} className="p-1.5 hover:bg-slate-100 rounded"><Icon name="fa-pen"/></button><button onClick={()=>handleOpenLog(project)} className="p-1.5 hover:bg-slate-100 rounded text-blue-500"><Icon name="fa-history"/></button><button onClick={()=>onDeleteProject(project.id)} className="p-1.5 hover:bg-slate-100 rounded text-red-500"><Icon name="fa-trash"/></button></div></td>
                  </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MOBILE CARD VIEW --- */}
      <div className="lg:hidden space-y-4">
        {filteredProjects.map(project => {
           const isAssigned = project.teamIds.includes(currentUser.id) || project.leadId === currentUser.id;
           return (
           <div key={project.id} className={`bg-white p-4 rounded-xl shadow-sm border ${isAssigned ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-200'} flex flex-col gap-3`}>
              <div className="flex justify-between items-start">
                 <div className="flex-1 mr-2">
                    <h3 className={`font-bold text-lg leading-tight mb-1 ${isAssigned ? 'text-red-700' : 'text-slate-900'}`}>{project.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mb-1">{project.id}</p>
                 </div>
                 <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(project.status)}`}>
                    {project.status}
                 </span>
              </div>
              
              <div className="flex gap-2 my-1">
                  <button onClick={() => handleOpenTeam(project)} className={`flex-1 py-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${isAssigned ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      <Icon name="fa-users" /> {isAssigned ? 'Tu Equipo' : 'Equipo'}
                  </button>
                  <button onClick={() => handleOpenReq(project)} className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-100">
                      <Icon name="fa-file-alt" /> Resumen
                  </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                 <div className="flex gap-2">
                     <button onClick={() => openRepoManager(project, 'drive')} className={`w-10 h-10 rounded-lg flex items-center justify-center border ${project.repositories?.some(r=>r.type==='drive') ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-300 border-slate-200'}`}><Icon name="fab fa-google-drive" className="text-lg" /></button>
                     <button onClick={() => openRepoManager(project, 'github')} className={`w-10 h-10 rounded-lg flex items-center justify-center border ${project.repositories?.some(r=>r.type==='github') ? 'bg-slate-800 text-white border-slate-900' : 'bg-slate-50 text-slate-300 border-slate-200'}`}><Icon name="fab fa-github" className="text-lg" /></button>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => handleOpenEdit(project)} className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><Icon name="fa-pen" /></button>
                    <button onClick={() => handleOpenLog(project)} className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Icon name="fa-history" /></button>
                    <button onClick={() => onDeleteProject(project.id)} className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><Icon name="fa-trash" /></button>
                 </div>
              </div>
           </div>
        )})}
      </div>
      
      {/* Create/Edit Modal - OPTIMIZED */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-[60] bg-white md:bg-black/50 flex flex-col md:justify-center md:items-center p-4">
          <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[700px] bg-white md:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scale-up">
             {/* HEADER */}
             <div className="p-4 border-b flex justify-between items-center bg-slate-50 md:bg-white md:rounded-t-2xl shrink-0">
                <h3 className="text-lg font-bold">{showEditModal ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
                <button onClick={() => {setShowCreateModal(false); setShowEditModal(false);}} className="w-8 h-8 flex items-center justify-center bg-slate-200 rounded-full hover:bg-slate-300 transition-colors"><Icon name="fa-times"/></button>
             </div>
             
             {/* BODY */}
             <div className="p-6 overflow-y-auto flex-1 space-y-6">
                 {/* Basic Info */}
                 <div className="space-y-4">
                     {!showEditModal && (
                         <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                             <div>
                                 <label className="block text-xs font-bold text-blue-700 uppercase mb-1">ID Correlativo</label>
                                 <input 
                                    className="bg-white border border-blue-200 p-1 rounded text-blue-900 font-mono font-bold w-32 text-center" 
                                    value={newProject.manualId} 
                                    onChange={e => setNewProject({...newProject, manualId: e.target.value})} 
                                 />
                             </div>
                             <p className="text-[10px] text-blue-500 max-w-[200px] text-right">ID único registrado en historial.</p>
                         </div>
                     )}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input className="w-full border p-3 rounded-lg" placeholder="Nombre Proyecto" value={showEditModal ? editProjectData.name : newProject.name} onChange={e => showEditModal ? setEditProjectData({...editProjectData, name: e.target.value}) : setNewProject({...newProject, name: e.target.value})} />
                         <input className="w-full border p-3 rounded-lg" placeholder="Cliente" value={showEditModal ? editProjectData.client : newProject.client} onChange={e => showEditModal ? setEditProjectData({...editProjectData, client: e.target.value}) : setNewProject({...newProject, client: e.target.value})} />
                     </div>
                 </div>

                 {/* SDLC Status Selection */}
                 {showEditModal && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Estado de Desarrollo</label>
                        <select 
                            className="w-full border p-3 rounded-lg bg-slate-50 font-bold text-slate-700"
                            value={editProjectData.status}
                            onChange={e => setEditProjectData({...editProjectData, status: e.target.value as ProjectStatus})}
                        >
                            {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                 )}

                 {/* SMART TECH STACK COMBO BOX */}
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Stack Tecnológico (Seleccionar o Escribir)</label>
                    <div className="flex gap-2 mb-2">
                        <select 
                             className="flex-1 border p-2 rounded-lg bg-slate-50 text-sm"
                             value={techInput}
                             onChange={e => {
                                 const val = e.target.value;
                                 if (val && val !== 'custom') addTech(val, showEditModal);
                             }}
                        >
                            <option value="">-- Seleccionar de la Base de Datos --</option>
                            {availableSkills.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input 
                            className="flex-1 border p-2 rounded-lg text-sm"
                            placeholder="O escribir nueva..."
                            onKeyPress={e => { if(e.key==='Enter') { addTech(e.currentTarget.value, showEditModal); e.currentTarget.value=''; } }}
                        />
                    </div>
                    {/* Tags Display */}
                    <div className="flex flex-wrap gap-2">
                        {(showEditModal ? editProjectData.technologies : newProject.technologies)?.map(t => (
                            <span key={t} className="bg-slate-800 text-white px-2 py-1 rounded text-xs flex items-center gap-2">
                                {t}
                                <button onClick={() => removeTech(t, showEditModal)} className="hover:text-red-300"><Icon name="fa-times"/></button>
                            </span>
                        ))}
                        {((showEditModal ? editProjectData.technologies : newProject.technologies)?.length || 0) === 0 && (
                            <span className="text-xs text-slate-400 italic">Sin tecnologías seleccionadas.</span>
                        )}
                    </div>
                 </div>

                 {/* Dates */}
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">Inicio</label>
                         <input type="date" className="w-full border p-3 rounded-lg" value={(showEditModal ? editProjectData.startDate : newProject.startDate) || ''} onChange={e => showEditModal ? setEditProjectData({...editProjectData, startDate: e.target.value}) : setNewProject({...newProject, startDate: e.target.value})} />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">Término</label>
                         <input type="date" className="w-full border p-3 rounded-lg" value={(showEditModal ? editProjectData.deadline : newProject.deadline) || ''} onChange={e => showEditModal ? setEditProjectData({...editProjectData, deadline: e.target.value}) : setNewProject({...newProject, deadline: e.target.value})} />
                     </div>
                 </div>

                 {/* Description */}
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                    <textarea className="w-full border p-3 rounded-lg h-20 text-sm" placeholder="Detalles del proyecto..." value={showEditModal ? editProjectData.description : newProject.description} onChange={e => showEditModal ? setEditProjectData({...editProjectData, description: e.target.value}) : setNewProject({...newProject, description: e.target.value})} />
                 </div>

                 {/* TEAM ASSIGNMENT WITH AI */}
                 {!showEditModal && (
                     <div>
                         <div className="flex justify-between items-center mb-2">
                             <h4 className="text-sm font-bold text-slate-500 uppercase">Asignar Equipo & Análisis</h4>
                             <button 
                                onClick={handleAnalyzeTeam}
                                disabled={isAnalyzingTeam}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 transition-all shadow-sm"
                             >
                                 <Icon name="fa-magic" className={isAnalyzingTeam ? "animate-spin" : ""} />
                                 {isAnalyzingTeam ? 'Analizando...' : 'Analizar con IA'}
                             </button>
                         </div>

                         {/* AI Result Box */}
                         {aiRecommendation && (
                             <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 mb-4 text-sm text-purple-900 animate-fade-in relative">
                                 <button onClick={() => setAiRecommendation('')} className="absolute top-2 right-2 text-purple-400 hover:text-purple-700"><Icon name="fa-times"/></button>
                                 <div className="font-bold mb-1 flex items-center gap-2"><Icon name="fa-robot" /> Recomendación de Equipo:</div>
                                 <div className="whitespace-pre-wrap leading-relaxed text-xs md:text-sm">{aiRecommendation}</div>
                             </div>
                         )}

                         <div className="border rounded-lg p-2 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50">
                             {users.map(u => {
                                 const activeCount = projects.filter(p => p.status !== 'Finalizado' && (p.teamIds.includes(u.id) || p.leadId === u.id)).length;
                                 const isSelected = newProject.teamIds?.includes(u.id);
                                 
                                 return (
                                     <label key={u.id} className={`flex items-start gap-2 p-2 rounded cursor-pointer border transition-all ${isSelected ? 'bg-SIMPLEDATA-100 border-SIMPLEDATA-300 ring-1 ring-SIMPLEDATA-500' : 'bg-white border-slate-200 hover:border-SIMPLEDATA-300'}`}>
                                         <input type="checkbox" checked={isSelected} onChange={() => toggleNewProjectTeamMember(u.id)} className="mt-1 rounded text-SIMPLEDATA-600 focus:ring-SIMPLEDATA-500" />
                                         <div className="flex-1 min-w-0">
                                             <div className="flex justify-between items-center">
                                                 <span className="text-sm font-bold text-slate-800 truncate">{u.name}</span>
                                                 {activeCount > 0 && <span className="text-[10px] bg-orange-100 text-orange-700 px-1 rounded font-bold">{activeCount} Activos</span>}
                                             </div>
                                             <p className="text-[10px] text-slate-500 truncate">{u.role}</p>
                                             {/* Skills preview */}
                                             <div className="flex flex-wrap gap-1 mt-1">
                                                 {u.skills.slice(0, 3).map((s,i) => <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">{s.name}</span>)}
                                             </div>
                                         </div>
                                     </label>
                                 )
                             })}
                         </div>
                     </div>
                 )}
             </div>
             
             {/* FOOTER */}
             <div className="p-4 border-t bg-slate-50 md:rounded-b-2xl shrink-0 flex gap-2">
                <button onClick={() => {setShowCreateModal(false); setShowEditModal(false);}} className="flex-1 py-3 bg-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-300 transition-colors">Cancelar</button>
                <button onClick={showEditModal ? handleUpdate : handleCreate} className="flex-1 py-3 bg-SIMPLEDATA-600 text-white font-bold rounded-lg shadow-lg hover:bg-SIMPLEDATA-700 transition-colors">Guardar</button>
             </div>
          </div>
        </div>
      )}
      
      {showLogModal && selectedProject && (
          <div className="fixed inset-0 z-[60] bg-white md:bg-black/50 flex flex-col md:justify-center md:items-center p-4">
              <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[600px] bg-white md:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scale-up">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-lg">Bitácora</h3>
                      <button onClick={()=>setShowLogModal(false)} className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-300"><Icon name="fa-times"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {/* Add Log Section */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <textarea 
                            className="w-full border p-2 rounded text-sm mb-2" 
                            placeholder="Escribe un nuevo hito o actualización..." 
                            rows={3}
                            value={newLogText}
                            onChange={(e) => setNewLogText(e.target.value)}
                        ></textarea>
                        <button 
                            onClick={handleAddLog}
                            disabled={!newLogText.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-sm disabled:opacity-50 transition-colors"
                        >
                            + Agregar Entradas
                        </button>
                    </div>

                    {/* Log List */}
                    {selectedProject.logs?.length === 0 && <p className="text-center text-slate-400 mt-10">Sin registros anteriores.</p>}
                    {[...(selectedProject.logs || [])].reverse().map(log => (
                        <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex justify-between text-xs text-slate-400 mb-2 uppercase font-bold tracking-wider">
                                <span>{new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span>{log.author}</span>
                            </div>
                            <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{log.text}</p>
                            {log.link && (
                                <a href={log.link} target="_blank" className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1">
                                    <Icon name="fa-external-link-alt"/> Ver Archivo / Enlace
                                </a>
                            )}
                        </div>
                    ))}
                  </div>
              </div>
          </div>
      )}

      {showTeamModal && selectedProject && (
          <div className="fixed inset-0 z-[60] bg-white md:bg-black/50 flex flex-col md:justify-center md:items-center p-4">
              <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[500px] bg-white md:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scale-up">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-lg">Asignar Equipo</h3>
                      <button onClick={()=>setShowTeamModal(false)} className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-300"><Icon name="fa-times"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                     {users.map(u => {
                         const isSelected = selectedProject.teamIds.includes(u.id);
                         return (
                             <div key={u.id} onClick={() => handleToggleTeamMember(u.id)} className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${isSelected ? 'bg-SIMPLEDATA-50 border-SIMPLEDATA-200' : 'bg-white border-slate-100'}`}>
                                 <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-SIMPLEDATA-600 border-SIMPLEDATA-600' : 'border-slate-300'}`}>
                                     {isSelected && <Icon name="fa-check" className="text-white text-xs"/>}
                                 </div>
                                 <img src={u.avatar} className="w-8 h-8 rounded-full" />
                                 <div>
                                     <p className="font-bold text-sm">{u.name}</p>
                                     <p className="text-xs text-slate-500">{u.role}</p>
                                 </div>
                             </div>
                         )
                     })}
                  </div>
              </div>
          </div>
      )}

      {showReqModal && selectedProject && (
          <div className="fixed inset-0 z-[60] bg-white md:bg-black/50 flex flex-col md:justify-center md:items-center p-4">
              <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[600px] bg-white md:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scale-up">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-lg">Resumen Proyecto</h3>
                      <button onClick={()=>setShowReqModal(false)} className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-300"><Icon name="fa-times"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1">
                      <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">Descripción General</h4>
                      <p className="text-slate-800 text-lg leading-relaxed mb-6">{selectedProject.description}</p>
                      
                      <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">Tecnologías</h4>
                      <div className="flex flex-wrap gap-2 mb-6">
                          {selectedProject.technologies.map(t => (
                              <span key={t} className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600">{t}</span>
                          ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-green-50 p-4 rounded-xl">
                              <p className="text-green-800 font-bold text-2xl">{selectedProject.progress}%</p>
                              <p className="text-green-600 text-xs font-bold uppercase">Progreso Global</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-xl">
                              <p className="text-blue-800 font-bold text-2xl">{selectedProject.logs.length}</p>
                              <p className="text-blue-600 text-xs font-bold uppercase">Entradas Bitácora</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};