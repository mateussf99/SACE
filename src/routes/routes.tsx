import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from '../components/header';
import Header2 from '../components/header2';
import '../index.css';
import Home from '../pages/home';
import Login from '../pages/login';
import Informacoes from '../pages/informacoes';
import Teste from '../pages/teste';
import Admin from '../pages/admin';
import Dashboard from '../pages/dashboard';
import Agentes from '../pages/agentes';
import { useAuth } from '@/contexts/AuthContext';
import SidebarAdmin from '@/components/sidebarAdmin'; 
import type { ReactNode } from 'react' // <- adiciona tipos do React

function PrivateRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
    const { isAuthenticated } = useAuth()
    return (
        
        <BrowserRouter>
            <div className="flex flex-col h-screen">
                <div className="sticky top-0 z-50">
                    {isAuthenticated ? <Header2 /> : <Header />}
                </div>
                
                {/* Área principal: sidebar + conteúdo */}
                <div className="flex flex-1 overflow-hidden">
                    {isAuthenticated && (
                        <SidebarAdmin />
                    )}
                    <main className="flex-1 overflow-y-auto">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/informacoes" element={<Informacoes />}/>
                            <Route path="/teste" element={<Teste />}/>
                            
                            <Route
                                path="/administracao"
                                element={
                                    <PrivateRoute>
                                        <Admin />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/dashboard"
                                element={
                                    <PrivateRoute>
                                        <Dashboard />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/agentes"
                                element={
                                    <PrivateRoute>
                                        <Agentes />
                                    </PrivateRoute>
                                }
                            />
                            

                            {/* Login (redireciona se já autenticado) */}
                            <Route
                                path="/login"
                                element={
                                    isAuthenticated ? <Navigate to="/" replace /> : <Login />
                                }
                            />

                            {/* Fallback */}
                            <Route
                                path="*"
                                element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
                            />
                        </Routes>
                    </main>
                </div>
            </div>
            
            <ToastContainer position="top-right" autoClose={4000} newestOnTop />
        </BrowserRouter>
        
    );
}

export default AppRoutes;