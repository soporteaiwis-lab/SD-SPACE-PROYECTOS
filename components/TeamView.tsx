import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

export const TeamView = ({ 
    users, 
    currentUser,
    onAddUser, 
    onUpdateUser,
    onDeleteUser 
}: { 
    users: User[], 
    currentUser: User,
    onAddUser: (u: User) => void, 
    onUpdateUser: (u: User) => void,
    onDeleteUser: (id: string) => void 
}) => {
   const [editingUser, setEditingUser] = useState<User | null>(null);
   const [isAdding, setIsAdding] = useState(false);
   const [formData, setFormData] = useState<Partial<User>>({});

   const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CEO;

   // ESC Listener
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === 'Escape') {
         setEditingUser(null);
         setIsAdding(false);
       }
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, []);

   const checkPermission = () => {
       if (isAdmin) return true;
       const input = prompt("Acción protegida. Ingrese Clave Maestra:");
       if (input === '1234') return true;
       alert("Acceso Denegado");
       return false;
   };

   const handleAddClick = () => {
       if (!checkPermission()) return;
       setIsAdding(true);
       setEditingUser(null);
       setFormData({ name: '', role: UserRole.DEVELOPER, skills: [], email: '', avatar: 'https://ui-avatars.com/api/?name=New+User' });
   };

   const handleEditClick = (u: User) => {
       if (!checkPermission()) return;
       setEditingUser(u);
       setIsAdding(false);
       setFormData({ ...u });
   };

   const handleDeleteClick = (id: string) => {
       if (!checkPermission()) return;
       onDeleteUser(id);
   };

   const handleSave = () => {
       if (!formData.name || !formData.email) return;
       
       if (isAdding) {
           const newUser: User = {
               id: 'u' + Date.now(),
               name: formData.name!,
               email: formData.email!,
               role: formData.role as UserRole,
               skills: formData.skills || [],
               projects: [],
               avatar: formData.avatar || 'https://ui-avatars.com/api/?name=' + formData.name,
               password: '1234'
           };
           onAddUser(newUser);
       } else if (editingUser) {
           onUpdateUser({ ...editingUser, ...formData });
       }
       setEditingUser(null);
       setIsAdding(false);
   };

   const addSkill = () => {
       const newSkill = prompt("Nombre de la habilidad (ej. React):");
       if (newSkill) {
           setFormData({ ...formData, skills: [...(formData.skills || []), { name: newSkill, level: 80 }] });
       }
   };

   return (
    <div className="space-y-6 print:hidden pb-24 md:pb-0">
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-SIMPLEDATA-900">Equipo</h2>
          <button onClick={handleAddClick} className="bg-SIMPLEDATA-600 hover:bg-SIMPLEDATA-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <Icon name="fa-plus" /> Agregar
          </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <div key={user.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center relative group">
             <div className="absolute top-2 right-2 flex gap-1">
                 <button onClick={() => handleEditClick(user)} className="text-slate-300 hover:text-blue-500 p-2"><Icon name="fa-pen" /></button>
                 <button onClick={() => handleDeleteClick(user.id)} className="text-slate-300 hover:text-red-500 p-2"><Icon name="fa-trash" /></button>
             </div>
             
             <div className="flex flex-col md:flex-row items-center gap-4 w-full mb-4">
                 <img src={user.avatar} className="w-20 h-20 md:w-16 md:h-16 rounded-full border-4 border-slate-50" />
                 <div className="text-center md:text-left">
                     <h3 className="text-lg font-bold text-slate-900 leading-tight">{user.name}</h3>
                     <p className="text-SIMPLEDATA-600 font-medium text-sm">{user.role}</p>
                     <p className="text-slate-400 text-xs mt-1">{user.projects.length} Proyectos Activos</p>
                 </div>
             </div>

             <div className="w-full bg-slate-50 rounded-lg p-3">
                 <p className="text-xs font-bold text-slate-400 uppercase mb-2">Habilidades Principales</p>
                 <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                     {user.skills.slice(0, 3).map((skill, idx) => (
                         <span key={idx} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 font-medium">
                             {skill.name} <span className="text-SIMPLEDATA-400 text-[10px] ml-1">{skill.level}%</span>
                         </span>
                     ))}
                 </div>
             </div>
          </div>
        ))}
      </div>

      {/* Edit/Add Modal - OPTIMIZED */}
      {(editingUser || isAdding) && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col md:max-h-[90vh] overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center shrink-0">
                      <h3 className="text-xl font-bold">{isAdding ? 'Agregar Miembro' : 'Editar Perfil'}</h3>
                      <button onClick={() => {setEditingUser(null); setIsAdding(false);}} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-200"><Icon name="fa-times" /></button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                      <input className="w-full border p-2 rounded" placeholder="Nombre" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                      <input className="w-full border p-2 rounded" placeholder="Email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                      <select className="w-full border p-2 rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                            <option value={UserRole.DEVELOPER}>Desarrollador</option>
                            <option value={UserRole.PROJECT_MANAGER}>Project Manager</option>
                            <option value={UserRole.CEO}>CEO</option>
                            <option value={UserRole.DESIGNER}>Diseñador</option>
                            <option value={UserRole.ANALYST}>Analista</option>
                      </select>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Habilidades</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                              {formData.skills?.map((skill, idx) => (
                                  <div key={idx} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-2">
                                      {skill.name} ({skill.level}%)
                                      <button onClick={() => setFormData({...formData, skills: formData.skills?.filter((_, i) => i !== idx)})} className="text-red-500 hover:text-red-700">x</button>
                                  </div>
                              ))}
                          </div>
                          <button onClick={addSkill} className="text-xs text-blue-600 hover:underline">+ Agregar Habilidad</button>
                      </div>
                  </div>
                  <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 shrink-0">
                      <button onClick={() => {setEditingUser(null); setIsAdding(false);}} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
                      <button onClick={handleSave} className="bg-SIMPLEDATA-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-SIMPLEDATA-700">Guardar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
   );
};