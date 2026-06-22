// Force fresh cache compilation string check - June 2026
// Axios Client setup to interface with local Node Express server
import axios from 'axios';

const BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' // Added /api here
  : `${window.location.origin}/api`;
const api = axios.create({ 
  baseURL: BASE_URL,
  withCredentials: true 
});

export const projectAPI = {
    // Fetch all workspaces
    getAll: () => api.get('/projects'),
    
    // Fetch individual project info
    getOne: (id) => api.get(`/projects/${id}`),
    
    // Save new project
    create: (data) => api.post('/projects', data),
    
    // Purge project workspace
    delete: (id) => api.delete(`/projects/${id}`)
};

export const credentialAPI = {
    // Get credentials for project (Masked passwords)
    getByProject: (projectId) => api.get(`/projects/${projectId}/credentials`),
    
    // Save credentials
    create: (data) => api.post('/credentials', data),
    
    // Update credential options and client visibility
    update: (id, data) => api.put(`/credentials/${id}`, data),
    
    // Request Decryption for single password (Requires master password verification)
    decrypt: (id, masterPassword) => api.post(`/credentials/${id}/decrypt`, {
        masterKey: masterPassword
    })
};

export const notesAPI = {
    // Fetch notes linked to project workspace
    getByProject: (projectId) => api.get(`/projects/${projectId}/notes`),
    
    // Commit new notes entry
    create: (data) => api.post('/notes', data),
    
    // Update note content and client visibility
    update: (id, data) => api.put(`/notes/${id}`, data)
};

export const remindersAPI = {
    // Fetch project localized reminders matrix
    getByProject: (projectId) => api.get(`/projects/${projectId}/reminders`),
    
    // Commit new reminder log element
    create: (data) => api.post('/reminders', data),
    
    // Update reminder timeline entry
    update: (id, data) => api.put(`/reminders/${id}`, data)
};

export const renewalAPI = {
    // Fetch global renewals
    getAll: () => api.get('/renewals')
};

export const filesAPI = {
    // Fetch files records mapping project profile
    getByProject: (projectId) => api.get(`/projects/${projectId}/files`),
    
    // Commit new file marker entry point
    create: (data) => api.post('/files', data),
    
    // Update file settings and client visibility
    update: (id, data) => api.put(`/files/${id}`, data)
};

export const profilesAPI = {
    // Fetch team members or filtered clients matching roles
    getAll: (role) => api.get(role ? `/profiles?role=${role}` : '/profiles'),
    
    // Commit structural permission mutations for a profile row
    update: (id, data) => api.put(`/profiles/${id}`, data)
};

// 🛠️ FIXED: Removed the duplicate '/api' strings to let Axios baseURL map them correctly
export const projectSharesAPI = {
    // Fetch active assignments for a single workspace project card instance
    getByProject: (projectId) => api.get(`/projects/${projectId}/shares`),
    
    // Upsert granular checkbox permissions into database tables
    upsert: (data) => api.post('/project-shares', data)
};

// Clean explicit mapping targets for Employee management data actions
export const employeesAPI = {
    getAll: () => api.get('/employees'),
    getAllWithShares: () => api.get('/employees-with-shares'), // New endpoint
    update: (id, data) => api.put(`/employees/${id}`, data)
};
// Clean explicit mapping targets for Customer Portal management data actions
export const clientsAPI = {
    getAll: () => api.get('/clients'),
    update: (id, data) => api.put(`/clients/${id}`, data)
};

export default api;