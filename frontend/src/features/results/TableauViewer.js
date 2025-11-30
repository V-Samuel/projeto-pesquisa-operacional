import React from 'react';
import '../../styles/Results.css';

const TableauViewer = ({ iterations }) => {
    if (!iterations || iterations.length === 0) return null;

    return (
        <div className="iterations-container">
            <h3>Passo a Passo (Tableaus)</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                {iterations.map((step, idx) => (
                    <div key={idx} className="iteration-card">
                        <div className="iteration-header">
                            <span>{step.phase} - Passo {step.iteration}</span>
                            {step.pivot_info && <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}> Pivô: [{step.pivot_info.row}, {step.pivot_info.col}]</span>}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="tableau-table">
                                <thead>
                                    <tr><th>Base</th>{step.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {step.rows.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 'bold', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{r.label}</td>
                                            {r.values.map((v, j) => (
                                                <td key={j} className={step.pivot_info && step.pivot_info.row === i && step.pivot_info.col === j ? 'highlight-pivot' : ''}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TableauViewer;
