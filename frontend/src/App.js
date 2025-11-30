import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import SolverPage from './pages/SolverPage';
import WelcomePage from './pages/WelcomePage';
import './styles/Layout.css'; // Global styles

function App() {
    return (
        <Router>
            <Routes>
                {/* Welcome Page (No Layout) */}
                <Route path="/" element={<WelcomePage />} />

                {/* Main Application (With Layout) */}
                <Route path="/*" element={
                    <MainLayout>
                        <Routes>
                            <Route path="/auto" element={<SolverPage />} />
                            <Route path="/:method" element={<SolverPage />} />
                        </Routes>
                    </MainLayout>
                } />
            </Routes>
        </Router>
    );
}

export default App;