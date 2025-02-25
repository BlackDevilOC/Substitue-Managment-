
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
import { apiRequest } from './queryClient';

export const api = {
  async getTeachers() {
    const res = await apiRequest('GET', '/api/teachers');
    return res.json();
  },

  async createTeacher(data: any) {
    const res = await apiRequest('POST', '/api/teachers', data);
    return res.json();
  },

  async getSchedule(day: string) {
    const res = await apiRequest('GET', `/api/schedule/${day}`);
    return res.json();
  },

  async getAbsences() {
    const res = await apiRequest('GET', '/api/absences');
    return res.json();
  }
};
