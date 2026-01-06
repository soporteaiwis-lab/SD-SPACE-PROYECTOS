
export enum UserRole {
  ADMIN = 'Super Admin',
  CEO = 'CEO',
  PROJECT_MANAGER = 'Project Manager',
  DEVELOPER = 'Developer',
  DESIGNER = 'Designer',
  ANALYST = 'Analyst'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  password?: string;
  avatar: string;
  skills: { name: string; level: number }[];
  projects: string[];
}

export interface ProjectLog {
  id: string;
  date: string;
  text: string;
  author: string;
  link?: string; // Added link support for logs
}

export interface Repository {
  id: string;
  alias: string; // Friendly name (e.g. "Backend Repo", "Carpeta Facturas")
  url: string; // The exact URL
  type: 'github' | 'drive' | 'other';
}

// UPDATED STATUSES FOR SDLC
export type ProjectStatus = 'Planificación' | 'En Desarrollo' | 'En QA' | 'Despliegue' | 'Finalizado' | 'En Curso'; // 'En Curso' kept for legacy data compatibility

export interface Project {
  id: string;
  name: string;
  client: string;
  encargadoCliente?: string;
  leadId: string;
  teamIds: string[];
  status: ProjectStatus;
  isOngoing: boolean;
  report: boolean;
  deadline: string;
  startDate?: string;
  progress: number;
  description: string;
  technologies: string[];
  year: number;
  logs: ProjectLog[];
  repositories: Repository[]; // NEW: Flexible repo management
}

// NEW: Interface for tracking used correlatives forever
export interface UsedID {
  id: string; // e.g. "PROYECTO_005"
  name: string; // Project Name associated
  dateUsed: string; // When it was created
  createdBy: string;
}

export interface Gem {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
}

export interface Tool {
  id: string;
  name: string;
  url: string;
  icon: string;
  color: string;
  isLocal?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  PROJECTS = 'projects',
  GEMS = 'gems',
  TEAM = 'team',
  REPORTS = 'reports',
  TOOLS = 'tools',
  ADMIN = 'admin_panel',
  DATABASE = 'database_manager' // NEW ROUTE
}