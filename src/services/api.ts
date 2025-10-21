import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';


// lembra de colocar no .env -> VITE_API_URL=http://localhost:5000
const API_URL = import.meta.env.VITE_API_URL ;


const api: AxiosInstance = axios.create({
  baseURL: API_URL,
});

// Adiciona o token (se existir) em todas as requisições
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      } as any;
    }
  } catch {
    // ignorar erros de storage
  }
  return config;
});


type LoginResponse = { token: string; username: string; nome_completo: string; nivel_de_acesso?: string };

const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/login', { username, password });
    return data;
  },
};

export { api, authService };
export default api;