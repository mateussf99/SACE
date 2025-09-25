import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Header from '../components/header';
import Header2 from '../components/header2';
import '../index.css';
import Home from '../pages/home';
import Login from '../pages/login';
import Informacoes from '../pages/informacoes';
import Teste from '../pages/teste';
import { useAuth } from '@/contexts/AuthContext';
import SidebarAdmin from '@/components/sidebarAdmin'; // <--- import adicionado



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
                            <Route path="/teste" element={<Teste />} />
                            <Route path="/informacoes" element={<Informacoes />} />
                            <Route
                                path="/login"
                                element={
                                    isAuthenticated ? <Navigate to="/" replace /> : <Login />
                                }
                            />
                        </Routes>
                    </main>
                </div>
            </div>
            
            
        </BrowserRouter>
        
    );
}

export default AppRoutes;