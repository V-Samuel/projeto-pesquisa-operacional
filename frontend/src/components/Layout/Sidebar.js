import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    FaMagic,
    FaChartLine,
    FaTable,
    FaLayerGroup,
    FaProjectDiagram,
    FaExchangeAlt,
    FaCodeBranch,
    FaBars,
    FaTimes
} from 'react-icons/fa';
import '../../styles/Layout.css';

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>

            <button className="mobile-menu-toggle" onClick={toggleSidebar}>
                <FaBars />
            </button>

            {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="logo-icon">
                            <img src="/orionlogo.png" alt="Logo" />
                        </div>
                        <div>
                            <h2 className="sidebar-title">ORION SYSTEM</h2>
                        </div>
                    </div>

                    <button className="mobile-menu-close" onClick={toggleSidebar}>
                        <FaTimes />
                    </button>
                </div>

                <nav className="module-nav">
                    <ul>
                        <li>
                            <NavLink to="/auto" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsOpen(false)}>
                                <FaMagic className="nav-icon" /> Automático
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/graphical" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsOpen(false)}>
                                <FaChartLine className="nav-icon" /> Método Gráfico
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/simplex" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsOpen(false)}>
                                <FaTable className="nav-icon" /> Método Simplex
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/big-m" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsOpen(false)}>
                                <FaLayerGroup className="nav-icon" /> Método Big M
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/two-phase" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsOpen(false)}>
                                <FaExchangeAlt className="nav-icon" /> Método 2-Fases
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/dual" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsOpen(false)}>
                                <FaProjectDiagram className="nav-icon" /> Simplex Dual
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/branch-and-bound" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsOpen(false)}>
                                <FaCodeBranch className="nav-icon" /> Branch & Bound
                            </NavLink>
                        </li>
                    </ul>
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;
