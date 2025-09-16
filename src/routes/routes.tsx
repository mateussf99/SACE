import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Header from '../components/header';
import Header2 from '../components/header2';
import '../index.css';
import Home from '../pages/home';
import Login from '../pages/login';
import Informacoes from '../pages/informacoes';
import { useAuth } from '@/contexts/AuthContext';



function AppRoutes() {
    const { isAuthenticated } = useAuth()
    return (
        
        <BrowserRouter>
            <div className="flex flex-col min-h-screen">
                <div className='fixed top-0 left-0 w-full z-10'>
                    {isAuthenticated ? <Header2 /> : <Header />}
                </div>
                
                <div className='pt-15 flex-grow'>
                    <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/informacoes" element={<Informacoes />} />
                            <Route
                                path="/login"
                                element={
                                    isAuthenticated ? <Navigate to="/" replace /> : <Login />
                                }
                            />
                    </Routes>
                </div>
            </div>
            
            
        </BrowserRouter>
        
    );
}

export default AppRoutes;