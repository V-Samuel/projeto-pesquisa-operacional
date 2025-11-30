import React, { useState, useEffect } from 'react';
import { base64ToBlob } from '../../utils/blob';
import '../../styles/Results.css';

const GraphViewer = ({ graphBase64 }) => {
    const [graphUrl, setGraphUrl] = useState(null);

    useEffect(() => {
        if (graphBase64) {
            const blob = base64ToBlob(graphBase64);
            const url = URL.createObjectURL(blob);
            setGraphUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setGraphUrl(null);
        }
    }, [graphBase64]);

    const handleReplayGraph = () => {
        if (graphBase64) {
            setGraphUrl(null);
            setTimeout(() => {
                const blob = base64ToBlob(graphBase64);
                setGraphUrl(URL.createObjectURL(blob));
            }, 10);
        }
    };

    if (!graphUrl) return null;

    return (
        <div className="graph-container">
            <h4 onClick={handleReplayGraph} style={{ cursor: 'pointer' }}>Ver Gráfico (Replay ↻)</h4>
            <img src={graphUrl} onClick={handleReplayGraph} alt="Gráfico" style={{ maxWidth: '100%', cursor: 'pointer' }} />
        </div>
    );
};

export default GraphViewer;
