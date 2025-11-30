import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import '../styles/Welcome.css';

const WelcomePage = () => {
    const navigate = useNavigate();

    return (
        <div className="welcome-container">
            <div className="welcome-content">
                <div className="logo-container">
                    <img src="/orionlogo.png" alt="Orion System Logo" className="welcome-logo" />
                </div>
                <p className="welcome-subtitle">Sistema Avançado de Pesquisa Operacional</p>

                <button className="btn-start" onClick={() => navigate('/auto')}>
                    Iniciar Sistema <FaArrowRight style={{ marginLeft: '10px' }} />
                </button>
            </div>

            <div className="background-effects">
                <div className="effect-blob blob-1"></div>
                <div className="effect-blob blob-2"></div>
            </div>
        </div>
    );
};

export default WelcomePage;
