import { BrowserRouter, Route, Routes } from 'react-router-dom';
// import Header from '../components/hearder';
import '../index.css';
import Home from '../pages/home';



function AppRoutes() {
    return (
        
        <BrowserRouter>
            <div className="flex flex-col min-h-screen">
                {/* <div className='fixed top-0 left-0 w-full z-10'>
                    <Header />
                </div> */}
                
                <div className='pt-10 flex-grow'>
                    <Routes>
                        <Route path="/" element={<Home />} />
                    </Routes>
                </div>
            </div>
            
            
        </BrowserRouter>
        
    );
}

export default AppRoutes;