import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { User, Project, AppRoute, Gem, UserRole, Tool, UsedID } from './types';
import { db } from './services/dbService';

// Components
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './components/Dashboard';
import { ProjectsView } from './components/ProjectsView';
import { GemsView } from './components/GemsView';
import { TeamView } from './components/TeamView';
import { ReportsView } from './components/ReportsView';
import { AdminUsersView } from './components/AdminUsersView';
import { DatabaseView } from './components/DatabaseView'; // NEW IMPORT
import { ToolsModal } from './components/ToolsModal';
import { LoginScreen } from './components/LoginScreen';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

// --- AIChatOverlay ---
import { generateText } from './services/geminiService';
import { ChatMessage } from './types';

const AIChatOverlay = ({ isOpen, onClose, currentUser }: { isOpen: boolean, onClose: () => void, currentUser: User }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `Hola ${currentUser.name.split(' ')[0]}! Soy el asistente de SIMPLEDATA.`, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await generateText(input, `You are SIMPLEDATA's corporate AI assistant. Current user is ${currentUser.name}.`);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'model', text: responseText, timestamp: new Date() }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'model', text: "Error de conexión.", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 w-[90vw] lg:w-96 h-[60vh] lg:h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-[80] overflow-hidden animate-slide-up font-sans print:hidden">
      <div className="bg-SIMPLEDATA-900 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2"><span className="font-semibold">SIMPLEDATA AI</span></div>
        <button onClick={onClose}><Icon name="fa-times" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl p-3 text-sm ${msg.role === 'user' ? 'bg-SIMPLEDATA-600 text-white' : 'bg-white border'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && <div className="text-xs text-slate-400 pl-2">Escribiendo...</div>}
        <div ref={endRef} />
      </div>
      <div className="p-3 bg-white border-t flex gap-2">
          <input className="flex-1 bg-slate-100 rounded-full px-4 text-sm" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Mensaje..." />
          <button onClick={handleSend} className="p-2 text-SIMPLEDATA-600"><Icon name="fa-paper-plane" /></button>
      </div>
    </div>
  );
};

// --- App Root ---
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [route, setRoute] = useState<AppRoute>(AppRoute.DASHBOARD);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [dbProjects, setDbProjects] = useState<Project[]>([]);
  const [dbGems, setDbGems] = useState<Gem[]>([]);
  const [dbTools, setDbTools] = useState<Tool[]>([]);
  const [dbUsedIds, setDbUsedIds] = useState<UsedID[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Data
  const loadData = async () => {
    try {
      const [u, p, g, t, ids] = await Promise.all([
          db.getUsers(), 
          db.getProjects(), 
          db.getGems(), 
          db.getTools(),
          db.getUsedIds() // NEW: Get used ids history
      ]);
      setDbUsers(u);
      setDbProjects(p);
      setDbGems(g);
      setDbTools(t);
      setDbUsedIds(ids);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Handlers
  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => setUser(null);
  
  const handleAddProject = async (p: Project) => { await db.addProject(p); loadData(); };
  const handleUpdateProject = async (p: Project) => { await db.updateProject(p); loadData(); };
  const handleDeleteProject = async (id: string) => { await db.deleteProject(id); loadData(); };
  const handleRegisterUsedId = async (record: UsedID) => { await db.registerUsedId(record); loadData(); }; // NEW handler
  
  const handleAddGem = async (g: Gem) => { await db.addGem(g); loadData(); };
  const handleUpdateGem = async (g: Gem) => { await db.updateGem(g); loadData(); };
  const handleDeleteGem = async (id: string) => { await db.deleteGem(id); loadData(); };
  
  const handleAddUser = async (u: User) => { await db.addUser(u); loadData(); };
  const handleUpdateUser = async (u: User) => { await db.updateUser(u); loadData(); };
  const handleDeleteUser = async (id: string) => { await db.deleteUser(id); loadData(); };
  
  const handleAddTool = async (t: Tool) => { await db.addTool(t); loadData(); };
  const handleUpdateTool = async (t: Tool) => { await db.updateTool(t); loadData(); };
  const handleDeleteTool = async (id: string) => { await db.deleteTool(id); loadData(); };

  const handleResetDB = async () => {
      await db.resetToDefaults();
      window.location.reload();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-100 text-SIMPLEDATA-600"><Icon name="fa-circle-notch" className="text-3xl animate-spin" /></div>;

  if (!user) return <LoginScreen users={dbUsers} onLogin={handleLogin} />;

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar 
          currentUser={user} 
          currentRoute={route} 
          onNavigate={setRoute} 
          onLogout={handleLogout}
          onOpenTools={() => setIsToolsOpen(true)}
      />
      
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 relative">
        {route === AppRoute.DASHBOARD && <Dashboard currentUser={user} projects={dbProjects} />}
        {route === AppRoute.PROJECTS && (
            <ProjectsView 
                projects={dbProjects} 
                users={dbUsers} 
                currentUser={user} 
                onAddProject={handleAddProject} 
                onDeleteProject={handleDeleteProject} 
                onUpdateProject={handleUpdateProject}
                usedIds={dbUsedIds} // Pass the used IDs history
                onRegisterId={handleRegisterUsedId} // Pass the register function
            />
        )}
        {route === AppRoute.GEMS && <GemsView gems={dbGems} onAddGem={handleAddGem} onUpdateGem={handleUpdateGem} onDeleteGem={handleDeleteGem} currentUser={user} />}
        {route === AppRoute.TEAM && <TeamView users={dbUsers} currentUser={user} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
        {route === AppRoute.REPORTS && <ReportsView currentUser={user} projects={dbProjects} onUpdateProject={handleUpdateProject} />}
        {route === AppRoute.ADMIN && <AdminUsersView users={dbUsers} projects={dbProjects} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onUpdateProject={handleUpdateProject} onResetDB={handleResetDB} />}
        
        {/* DATABASE VIEW ROUTE */}
        {route === AppRoute.DATABASE && (user.role === UserRole.ADMIN || user.role === UserRole.CEO) && <DatabaseView />}
        {route === AppRoute.DATABASE && !(user.role === UserRole.ADMIN || user.role === UserRole.CEO) && <div className="p-10 text-center text-red-500 font-bold">Acceso Restringido</div>}

        {/* Floating Chat Button */}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 w-14 h-14 bg-SIMPLEDATA-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-SIMPLEDATA-700 transition-transform active:scale-95 z-50 print:hidden"
        >
          <Icon name={isChatOpen ? "fa-times" : "fa-comment-alt"} className="text-xl" />
        </button>

        <AIChatOverlay isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} currentUser={user} />
      </main>

      <MobileNav currentRoute={route} onNavigate={setRoute} currentUser={user} />

      {isToolsOpen && <ToolsModal onClose={() => setIsToolsOpen(false)} tools={dbTools} onAddTool={handleAddTool} onUpdateTool={handleUpdateTool} onDeleteTool={handleDeleteTool} currentUser={user} />}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);