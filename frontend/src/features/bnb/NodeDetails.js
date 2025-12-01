import React from 'react';
import '../../styles/BnB.css';

const NodeDetails = ({ selectedNode, solution, graphUrl, onReplayGraph }) => {
    const intTableau = solution?.integer_solution?.iterations?.[solution.integer_solution.iterations.length - 1];

    return (
        <div className="node-details-panel">
            {selectedNode ? (
                <div className="details-card">
                    <h4>Detalhes do Nó {selectedNode.id}</h4>
                    <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />
                    {selectedNode.status === 'infeasible' ? (
                        <p style={{ color: 'var(--error)', fontWeight: 'bold' }}>Solução Inviável</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                Z = {selectedNode.solution.Z}
                            </div>
                            <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                {Object.entries(selectedNode.solution)
                                    .filter(([k]) => k.startsWith('x'))
                                    .map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>
                                            <strong style={{ color: 'var(--text-primary)' }}>{typeof v === 'number' ? v.toFixed(4) : v}</strong>
                                        </div>
                                    ))}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                Status: {selectedNode.status === 'integer' ? 'Inteiro (Folha)' : selectedNode.status === 'pruned' ? 'Podado' : 'Ramificado'}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '50px' }}>
                    Passe o mouse sobre um nó para ver os detalhes.
                </p>
            )}

            <div style={{ marginTop: '20px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--success)' }}>Solução Inteira Ótima:</h4>
                    {solution.integer_solution ? (
                        <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-primary)' }}>
                            <li><strong>Z:</strong> {solution.Z}</li>
                            {Object.entries(solution.integer_solution).filter(([k]) => k.startsWith('x')).map(([k, v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}
                        </ul>
                    ) : <span style={{ color: 'var(--text-secondary)' }}>Nenhuma solução inteira encontrada.</span>}
                </div>
            </div>

            {intTableau && (
                <div style={{ marginTop: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '8px', fontWeight: 'bold', fontSize: '0.85rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        Quadro Final (Ótimo Inteiro):
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="tableau-table" style={{ fontSize: '0.7rem' }}>
                            <thead><tr><th>Base</th>{intTableau.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                            <tbody>
                                {intTableau.rows.map((r, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{r.label}</td>
                                        {r.values.map((v, j) => <td key={j} style={{ color: 'var(--text-primary)' }}>{v}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {graphUrl && (
                <div style={{ marginTop: '20px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <h4 onClick={onReplayGraph} style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                            Gráfico Inteiro <span style={{ fontSize: '0.7em', color: 'var(--text-secondary)' }}>↺</span>
                        </h4>
                        <img
                            src={graphUrl}
                            onClick={onReplayGraph}
                            alt="Gráfico"
                            style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                        />
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '5px 0 0 0' }}>
                            Laranja = Ótimo Inteiro | Verde = Relaxado
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};


export default NodeDetails;
