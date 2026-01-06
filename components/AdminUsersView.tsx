import React, { useState } from 'react';
import { User, UserRole, Project } from '../types';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

export const AdminUsersView = ({ 
  users, 
  projects,
  onUpdateUser, 
  onDeleteUser, 
  onAddUser,
  onUpdateProject,
  onResetDB // New prop
}: { 
  users: User[], 
  projects: Project[],
  onUpdateUser: (u: User) => void, 
  onDeleteUser: (id: string) => void,
  onAddUser: (u: User) => void,
  onUpdateProject: (p: Project) => void,
  onResetDB: () => void
}) => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  
  // State for the form
  const [formData, setFormData] = useState<Partial<User>>({});
  const [passwordVisible, setPasswordVisible] = useState(false);

  // HELPER: Calculate active projects dynamically to fix sync issues
  // UPDATED: Count everything NOT 'Finalizado' as Active
  const getUserActiveProjects = (userId: string) => {
      return projects.filter(p => 
          p.status !== 'Finalizado' && 
          (p.teamIds.includes(userId) || p.leadId === userId)
      );
  };

  const getAllUserProjects = (userId: string) => {
      return projects.filter(p => 
          p.teamIds.includes(userId) || p.leadId === userId
      );
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
    setIsAdding(false);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ 
        name: '', 
        email: '', 
        password: '1234', 
        role: UserRole.DEVELOPER, 
        skills: [], 
        projects: [],
        avatar: `https://ui-avatars.com/api/?name=New+User&background=random`
    });
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) return;

    if (isAdding) {
        const newUser: User = {
            id: 'u' + Date.now(),
            name: formData.name!,
            email: formData.email!,
            password: formData.password || '1234',
            role: formData.role as UserRole,
            avatar: formData.avatar || 'https://ui-avatars.com/api/?name=User&background=random',
            skills: formData.skills || [],
            projects: []
        };
        onAddUser(newUser);
    } else if (editingUser) {
        onUpdateUser({ ...editingUser, ...formData });
    }
    setEditingUser(null);
    setIsAdding(false);
  };

  const toggleProjectStatus = (projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      if (project) {
          const newStatus = project.status !== 'Finalizado' ? 'Finalizado' : 'En Desarrollo';
          onUpdateProject({ 
              ...project, 
              status: newStatus,
              isOngoing: newStatus !== 'Finalizado'
          });
      }
  };

  const handleResetClick = () => {
      if(confirm("ADVERTENCIA: Esto reiniciará la base de datos a los valores predeterminados del sistema (Código). Se borrarán los usuarios creados manualmente. ¿Continuar para reparar inconsistencias?")) {
          onResetDB();
      }
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-red-900/5 border border-red-900/10 p-6 rounded-xl gap-4">
        <div>
            <h2 className="text-2xl font-bold text-red-900 flex items-center gap-2">
                <Icon name="fa-user-shield" /> Panel de Administración (Root)
            </h2>
            <p className="text-red-700/60 text-sm mt-1">Gestión total de colaboradores y seguridad.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
             <button onClick={handleResetClick} className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2">
                <Icon name="fa-database" /> Restaurar DB
            </button>
            <button onClick={handleCreate} className="flex-1 md:flex-none bg-red-700 hover:bg-red-800 text-white px-4 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2">
                <Icon name="fa-user-plus" /> Agregar Usuario
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-700">Usuario</th>
                <th className="p-4 font-bold text-slate-700">Email (ID)</th>
                <th className="p-4 font-bold text-slate-700">Contraseña</th>
                <th className="p-4 font-bold text-slate-700">Rol</th>
                <th className="p-4 font-bold text-slate-700 w-64">Gestión Proyectos</th>
                <th className="p-4 font-bold text-slate-700 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => {
                  // Calculate strictly from projects list to ensure sync
                  const assignedProjects = getAllUserProjects(user.id);
                  const activeCount = assignedProjects.filter(p => p.status !== 'Finalizado').length;
                  
                  return (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                            <img src={user.avatar} className="w-8 h-8 rounded-full" />
                            <span className="font-bold text-slate-800">{user.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">{user.email}</td>
                      <td className="p-4 font-mono text-slate-500 bg-slate-50 rounded">
                          {user.password || '1234'}
                      </td>
                      <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                              {user.role}
                          </span>
                      </td>
                      <td className="p-4 relative">
                          <div className="relative">
                              <button 
                                onClick={() => setOpenProjectMenuId(openProjectMenuId === user.id ? null : user.id)}
                                className={`w-full text-left border px-3 py-2 rounded-lg text-xs font-bold flex justify-between items-center transition-colors ${activeCount > 0 ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                              >
                                <span>{activeCount} Proyectos Activos</span>
                                <Icon name="fa-chevron-down" />
                              </button>
                              
                              {openProjectMenuId === user.id && (
                                  <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
                                      <div className="bg-slate-50 p-2 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-100">
                                          Total Histórico: {assignedProjects.length}
                                      </div>
                                      <div className="max-h-48 overflow-y-auto">
                                          {assignedProjects.length === 0 && <div className="p-3 text-xs text-slate-400 text-center">Sin asignaciones</div>}
                                          {assignedProjects.map(proj => {
                                              const isActive = proj.status !== 'Finalizado';
                                              return (
                                                  <button 
                                                    key={proj.id}
                                                    onClick={() => toggleProjectStatus(proj.id)}
                                                    className="w-full text-left p-3 text-xs border-b border-slate-50 hover:bg-slate-50 flex items-center justify-between group"
                                                  >
                                                      <div className="truncate pr-2 max-w-[180px]">
                                                          <div className="font-bold text-slate-700 truncate">{proj.name}</div>
                                                          <div className="text-[10px] text-slate-400 truncate">{proj.client}</div>
                                                      </div>
                                                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                                                          {isActive ? proj.status : 'OFF'}
                                                      </div>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => handleEdit(user)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"><Icon name="fa-pen" /></button>
                            <button onClick={() => onDeleteUser(user.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded"><Icon name="fa-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create User Modal */}
      {(editingUser || isAdding) && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{isAdding ? 'Nuevo Colaborador' : 'Editar Colaborador'}</h3>
                    <button onClick={() => {setEditingUser(null); setIsAdding(false);}}><Icon name="fa-times" /></button>
                </div>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                        <input className="w-full border p-2 rounded" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                        <input className="w-full border p-2 rounded" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña de Acceso</label>
                        <div className="relative">
                            <input type={passwordVisible ? "text" : "password"} className="w-full border p-2 rounded pr-10" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
                            <button onClick={() => setPasswordVisible(!passwordVisible)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"><Icon name={passwordVisible ? "fa-eye-slash" : "fa-eye"} /></button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rol / Perfil</label>
                        <select className="w-full border p-2 rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                            <option value={UserRole.DEVELOPER}>Desarrollador</option>
                            <option value={UserRole.PROJECT_MANAGER}>Project Manager</option>
                            <option value={UserRole.CEO}>CEO</option>
                            <option value={UserRole.ADMIN}>Super Admin (Root)</option>
                            <option value={UserRole.DESIGNER}>Diseñador</option>
                            <option value={UserRole.ANALYST}>Analista</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL Avatar</label>
                        <input className="w-full border p-2 rounded text-xs text-slate-500" value={formData.avatar || ''} onChange={e => setFormData({...formData, avatar: e.target.value})} />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={() => {setEditingUser(null); setIsAdding(false);}} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-SIMPLEDATA-600 text-white font-bold rounded hover:bg-SIMPLEDATA-700">Guardar Cambios</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};