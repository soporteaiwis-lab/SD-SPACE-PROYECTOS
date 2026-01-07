import { User, Project, Gem, ProjectLog, Tool, Repository, UsedID } from '../types';
import { INITIAL_USERS, INITIAL_PROJECTS, INITIAL_GEMS, INITIAL_TOOLS } from '../constants';

// Local Storage Keys - REBRANDED to SIMPLEDATA
const USERS_KEY = 'SIMPLEDATA_users_v1'; 
const PROJECTS_KEY = 'SIMPLEDATA_projects_v1';
const GEMS_KEY = 'SIMPLEDATA_gems_v1';
const TOOLS_KEY = 'SIMPLEDATA_tools_v1';
const USED_IDS_KEY = 'SIMPLEDATA_used_ids_v1'; // NEW TABLE for Correlatives
const SQL_CONFIG_KEY = 'SIMPLEDATA_sql_config_v1'; // New Key for ODBC Config

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class DBService {
  private users: User[] = [];
  private projects: Project[] = [];
  private gems: Gem[] = [];
  private tools: Tool[] = [];
  private usedIds: UsedID[] = [];
  private sqlConfig: any = {};

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    const savedUsers = localStorage.getItem(USERS_KEY);
    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    const savedGems = localStorage.getItem(GEMS_KEY);
    const savedTools = localStorage.getItem(TOOLS_KEY);
    const savedIds = localStorage.getItem(USED_IDS_KEY);
    const savedSql = localStorage.getItem(SQL_CONFIG_KEY);

    let localUsers: User[] = savedUsers ? JSON.parse(savedUsers) : [];
    let localProjects: Project[] = savedProjects ? JSON.parse(savedProjects) : [];
    let localGems: Gem[] = savedGems ? JSON.parse(savedGems) : [];
    let localTools: Tool[] = savedTools ? JSON.parse(savedTools) : [];
    let localUsedIds: UsedID[] = savedIds ? JSON.parse(savedIds) : [];
    this.sqlConfig = savedSql ? JSON.parse(savedSql) : { host: '', user: '', database: '', provider: 'SQL Server' };

    // --- CRITICAL CLEANUP: PURGE LEGACY ADA USERS ---
    localUsers = localUsers.filter(u => !u.email.toLowerCase().includes('@ada.cl'));

    // --- MIGRATION LOGIC FOR OLD PROJECTS ---
    localProjects = localProjects.map((p: any) => {
        if (!p.repositories) {
            const newRepos: Repository[] = [];
            if (p.githubLink) newRepos.push({ id: 'r_gh_' + p.id, type: 'github', alias: 'Repositorio Principal', url: p.githubLink });
            if (p.driveLink) newRepos.push({ id: 'r_dr_' + p.id, type: 'drive', alias: 'Carpeta Principal', url: p.driveLink });
            return { ...p, repositories: newRepos };
        }
        return p;
    });

    // Merge Init Data logic (Simplified for this update)
    if (localUsers.length === 0) localUsers = [...INITIAL_USERS];
    if (localProjects.length === 0) localProjects = [...INITIAL_PROJECTS];
    if (localGems.length === 0) localGems = [...INITIAL_GEMS];
    if (localTools.length === 0) localTools = [...INITIAL_TOOLS];

    this.users = localUsers;
    this.projects = localProjects;
    this.gems = localGems;
    this.tools = localTools;
    this.usedIds = localUsedIds;
    
    // Auto-save merged state immediately to ensure clean state
    this.saveAll();
  }

  private saveAll() {
    localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(this.projects));
    localStorage.setItem(GEMS_KEY, JSON.stringify(this.gems));
    localStorage.setItem(TOOLS_KEY, JSON.stringify(this.tools));
    localStorage.setItem(USED_IDS_KEY, JSON.stringify(this.usedIds));
    localStorage.setItem(SQL_CONFIG_KEY, JSON.stringify(this.sqlConfig));
  }

  // --- DDL & ADVANCED MANAGEMENT ---

  // Get raw collection by name
  getTableData(tableName: string): any[] {
      switch(tableName) {
          case 'USERS': return this.users;
          case 'PROJECTS': return this.projects;
          case 'GEMS': return this.gems;
          case 'TOOLS': return this.tools;
          case 'USED_IDS': return this.usedIds;
          default: return [];
      }
  }

  // DDL: Add Column / Drop Column
  async alterTable(tableName: string, action: 'ADD_COLUMN' | 'DROP_COLUMN', fieldName: string, defaultValue: any = null) {
      const data = this.getTableData(tableName);
      if (!data) return;

      const updatedData = data.map(row => {
          if (action === 'ADD_COLUMN') {
              return { ...row, [fieldName]: defaultValue };
          } else {
              const { [fieldName]: deleted, ...rest } = row;
              return rest;
          }
      });

      await this.bulkUpdateTable(tableName, updatedData);
  }

  // Bulk Insert / Update (ETL)
  async bulkUpdateTable(tableName: string, newData: any[]) {
      switch(tableName) {
          case 'USERS': this.users = newData; break;
          case 'PROJECTS': this.projects = newData; break;
          case 'GEMS': this.gems = newData; break;
          case 'TOOLS': this.tools = newData; break;
          case 'USED_IDS': this.usedIds = newData; break;
      }
      this.saveAll();
  }

  // SQL Config Management
  getSqlConfig() { return this.sqlConfig; }
  saveSqlConfig(config: any) { this.sqlConfig = config; this.saveAll(); }

  // --- STANDARD CRUD ---

  async resetToDefaults(): Promise<void> {
      await delay(500);
      this.users = [...INITIAL_USERS];
      this.projects = [...INITIAL_PROJECTS];
      this.gems = [...INITIAL_GEMS];
      this.tools = [...INITIAL_TOOLS];
      this.usedIds = this.projects.map(p => ({
            id: p.id,
            name: p.name,
            dateUsed: p.startDate || new Date().toISOString(),
            createdBy: 'System Reset'
      }));
      this.saveAll();
  }

  async getUsers() { await delay(300); return [...this.users]; }
  async addUser(u: User) { await delay(500); this.users.push(u); this.saveAll(); }
  async updateUser(u: User) { await delay(300); const idx = this.users.findIndex(x => x.id === u.id); if(idx !== -1) { this.users[idx] = u; this.saveAll(); } }
  async deleteUser(id: string) { await delay(400); this.users = this.users.filter(x => x.id !== id); this.saveAll(); }

  async getProjects() { await delay(300); return [...this.projects]; }
  async addProject(p: Project) { await delay(500); this.projects.push(p); this.saveAll(); }
  async updateProject(p: Project) { await delay(300); const idx = this.projects.findIndex(x => x.id === p.id); if(idx !== -1) { this.projects[idx] = p; this.saveAll(); } }
  async deleteProject(id: string) { await delay(400); this.projects = this.projects.filter(x => x.id !== id); this.saveAll(); }
  async addProjectLog(id: string, log: ProjectLog) { await delay(300); const p = this.projects.find(x => x.id === id); if(p) { if(!p.logs) p.logs=[]; p.logs.push(log); this.saveAll(); } }

  async getUsedIds() { await delay(200); return [...this.usedIds]; }
  async registerUsedId(record: UsedID) { 
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