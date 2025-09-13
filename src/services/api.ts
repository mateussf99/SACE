import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';


//lembra de volta para o .env
const API_URL = import.meta.env.VITE_API_URL;


const api: AxiosInstance = axios.create({
  baseURL: API_URL,

});




const authService = {
  
};

export { api, authService };
export default api;