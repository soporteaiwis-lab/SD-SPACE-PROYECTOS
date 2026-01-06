import { User, Project, Gem, ProjectLog, Tool, Repository, UsedID } from '../types';
import { INITIAL_USERS, INITIAL_PROJECTS, INITIAL_GEMS, INITIAL_TOOLS } from '../constants';

// Local Storage Keys - REBRANDED to ADA
const USERS_KEY = 'ada_users_v1'; 
const PROJECTS_KEY = 'ada_projects_v1';
const GEMS_KEY = 'ada_gems_v1';
const TOOLS_KEY = 'ada_tools_v1';
const USED_IDS_KEY = 'ada_used_ids_v1'; // NEW TABLE for Correlatives

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class DBService {
  private users: User[] = [];
  private projects: Project[] = [];
  private gems: Gem[] = [];
  private tools: Tool[] = [];
  private usedIds: UsedID[] = [];

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    const savedUsers = localStorage.getItem(USERS_KEY);
    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    const savedGems = localStorage.getItem(GEMS_KEY);
    const savedTools = localStorage.getItem(TOOLS_KEY);
    const savedIds = localStorage.getItem(USED_IDS_KEY);

    let localUsers: User[] = savedUsers ? JSON.parse(savedUsers) : [];
    let localProjects: Project[] = savedProjects ? JSON.parse(savedProjects) : [];
    let localGems: Gem[] = savedGems ? JSON.parse(savedGems) : [];
    let localTools: Tool[] = savedTools ? JSON.parse(savedTools) : [];
    let localUsedIds: UsedID[] = savedIds ? JSON.parse(savedIds) : [];

    // --- MIGRATION LOGIC FOR OLD PROJECTS (Convert driveLink/githubLink to repositories) ---
    localProjects = localProjects.map((p: any) => {
        if (!p.repositories) {
            const newRepos: Repository[] = [];
            if (p.githubLink) newRepos.push({ id: 'r_gh_' + p.id, type: 'github', alias: 'Repositorio Principal', url: p.githubLink });
            if (p.driveLink) newRepos.push({ id: 'r_dr_' + p.id, type: 'drive', alias: 'Carpeta Principal', url: p.driveLink });
            return { ...p, repositories: newRepos };
        }
        return p;
    });

    // 2. Users Merge
    const mergedUsersMap = new Map<string, User>();
    localUsers.forEach(u => mergedUsersMap.set(u.id, u));
    INITIAL_USERS.forEach(initUser => {
        const existingUser = mergedUsersMap.get(initUser.id);
        if (existingUser) {
            const combinedProjects = Array.from(new Set([...initUser.projects, ...existingUser.projects]));
            mergedUsersMap.set(initUser.id, { ...existingUser, projects: combinedProjects, role: initUser.role, name: initUser.name });
        } else {
            mergedUsersMap.set(initUser.id, initUser);
        }
    });
    this.users = Array.from(mergedUsersMap.values());

    // 3. Projects Merge
    const mergedProjectsMap = new Map<string, Project>();
    localProjects.forEach(p => mergedProjectsMap.set(p.id, p));
    INITIAL_PROJECTS.forEach(initProj => {
        const existingProj = mergedProjectsMap.get(initProj.id);
        if (existingProj) {
            const repos = (existingProj.repositories && existingProj.repositories.length > 0) 
                          ? existingProj.repositories 
                          : initProj.repositories;
            
            mergedProjectsMap.set(initProj.id, {
                ...existingProj,
                client: initProj.client,
                name: initProj.name,
                teamIds: Array.from(new Set([...initProj.teamIds, ...existingProj.teamIds])),
                repositories: repos
            });
        } else {
            mergedProjectsMap.set(initProj.id, initProj);
        }
    });
    this.projects = Array.from(mergedProjectsMap.values());

    // 3.1 Initialize Used IDs from existing projects if empty
    if (localUsedIds.length === 0) {
        this.usedIds = this.projects.map(p => ({
            id: p.id,
            name: p.name,
            dateUsed: p.startDate || new Date().toISOString(),
            createdBy: 'System Init'
        }));
    } else {
        this.usedIds = localUsedIds;
    }

    // 4. Gems & Tools
    const mergedGemsMap = new Map<string, Gem>();
    localGems.forEach(g => mergedGemsMap.set(g.id, g));
    INITIAL_GEMS.forEach(g => mergedGemsMap.set(g.id, g));
    this.gems = Array.from(mergedGemsMap.values());

    const mergedToolsMap = new Map<string, Tool>();
    localTools.forEach(t => mergedToolsMap.set(t.id, t));
    INITIAL_TOOLS.forEach(t => { if (!mergedToolsMap.has(t.id)) mergedToolsMap.set(t.id, t); });
    this.tools = Array.from(mergedToolsMap.values());

    this.saveAll();
  }

  private saveAll() {
    localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(this.projects));
    localStorage.setItem(GEMS_KEY, JSON.stringify(this.gems));
    localStorage.setItem(TOOLS_KEY, JSON.stringify(this.tools));
    localStorage.setItem(USED_IDS_KEY, JSON.stringify(this.usedIds));
  }

  async resetToDefaults(): Promise<void> {
      await delay(500);
      this.users = [...INITIAL_USERS];
      this.projects = [...INITIAL_PROJECTS];
      this.gems = [...INITIAL_GEMS];
      this.tools = [...INITIAL_TOOLS];
      // Reset IDs based on defaults
      this.usedIds = this.projects.map(p => ({
            id: p.id,
            name: p.name,
            dateUsed: p.startDate || new Date().toISOString(),
            createdBy: 'System Reset'
      }));
      this.saveAll();
  }

  // Generic Getters/Adders
  async getUsers() { await delay(300); return [...this.users]; }
  async addUser(u: User) { await delay(500); this.users.push(u); this.saveAll(); }
  async updateUser(u: User) { await delay(300); const idx = this.users.findIndex(x => x.id === u.id); if(idx !== -1) { this.users[idx] = u; this.saveAll(); } }
  async deleteUser(id: string) { await delay(400); this.users = this.users.filter(x => x.id !== id); this.saveAll(); }

  async getProjects() { await delay(300); return [...this.projects]; }
  async addProject(p: Project) { await delay(500); this.projects.push(p); this.saveAll(); }
  async updateProject(p: Project) { await delay(300); const idx = this.projects.findIndex(x => x.id === p.id); if(idx !== -1) { this.projects[idx] = p; this.saveAll(); } }
  async deleteProject(id: string) { await delay(400); this.projects = this.projects.filter(x => x.id !== id); this.saveAll(); }
  async addProjectLog(id: string, log: ProjectLog) { await delay(300); const p = this.projects.find(x => x.id === id); if(p) { if(!p.logs) p.logs=[]; p.logs.push(log); this.saveAll(); } }

  // NEW: Used IDs Management
  async getUsedIds() { await delay(200); return [...this.usedIds]; }
  async registerUsedId(record: UsedID) { 
      // Avoid duplicates
      if (!this.usedIds.some(u => u.id === record.id)) {
          this.usedIds.push(record); 
          this.saveAll(); 
      }
  }

  async getGems() { await delay(200); return [...this.gems]; }
  async addGem(g: Gem) { await delay(300); this.gems.push(g); this.saveAll(); }
  async updateGem(g: Gem) { await delay(300); const idx = this.gems.findIndex(x => x.id === g.id); if(idx !== -1) { this.gems[idx] = g; this.saveAll(); } }
  async deleteGem(id: string) { await delay(300); this.gems = this.gems.filter(x => x.id !== id); this.saveAll(); }

  async getTools() { await delay(200); return [...this.tools]; }
  async addTool(t: Tool) { await delay(300); this.tools.push(t); this.saveAll(); }
  async updateTool(t: Tool) { await delay(300); const idx = this.tools.findIndex(x => x.id === t.id); if(idx !== -1) { this.tools[idx] = t; this.saveAll(); } }
  async deleteTool(id: string) { await delay(300); this.tools = this.tools.filter(x => x.id !== id); this.saveAll(); }
}

export const db = new DBService();