import React from 'react';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import '../../styles/Results.css';

const ResultSummary = ({ solution, isDualMode }) => {
    if (!solution) return null;

    const ignoredKeys = ['graph_base64', 'iterations', 'error', 'integer_solution', 'dual_solution', 'status_complement', 'tableau', 'basis', 'tree_data', 'Z', 'status'];

    // Determine status badge color/text
    const isFeasible = !solution.status_complement && !solution.error;
    const statusColor = isFeasible ? 'var(--success)' : 'var(--warning)';
    const statusText = solution.status || (isFeasible ? 'ÓTIMA' : 'INVIÁVEL');

    return (
        <div className="solution-summary-container">

            {/* --- Optimal Solution Card --- */}
            <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--accent-primary)' }}>
                <div style={{
                    padding: '16px 24px',
                    background: 'rgba(14, 165, 233, 0.1)',
                    borderBottom: '1px solid rgba(14, 165, 233, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isFeasible ? <FaCheckCircle /> : <FaExclamationTriangle />}
                        {isDualMode ? 'Solução Dual' : 'Solução Ótima'}
                    </h3>
                    <span style={{
                        background: statusColor,
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                    }}>
                        {statusText}
                    </span>
                </div>

                <div style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Valor Ótimo (Z)
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text-primary)', textShadow: '0 0 20px rgba(14, 165, 233, 0.3)' }}>
                        {typeof solution.Z === 'number' ? solution.Z.toFixed(4) : solution.Z}
                    </div>
                </div>

                <div style={{ padding: '0 24px 24px 24px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
                        Valores das Variáveis
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                        {Object.entries(solution)
                            .filter(([k]) => !ignoredKeys.includes(k))
                            .map(([k, v]) => (
                                <div key={k} style={{
                                    background: 'var(--bg-primary)',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{k}</span>
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                                        {typeof v === 'number' ? v.toFixed(2) : v}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>

                {solution.status_complement && (
                    <div style={{ padding: '12px 24px', background: 'rgba(245, 158, 11, 0.1)', borderTop: '1px solid rgba(245, 158, 11, 0.2)', color: 'var(--warning)', fontSize: '0.9rem' }}>
                        ⚠️ {solution.status_complement}
                    </div>
                )}
            </div>

        </div>
    );
};

export default ResultSummary;
