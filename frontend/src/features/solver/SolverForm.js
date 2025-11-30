import React from 'react';
import { FaPlus, FaPlay, FaCalculator, FaListOl, FaBullseye, FaTrashAlt } from 'react-icons/fa';
import '../../styles/Components.css';

const SolverForm = ({
    objective, setObjective,
    objectiveCoeffs, setObjectiveCoeffs,
    constraints, setConstraints,
    onSolve, onReset, isLoading
}) => {

    const handleObjectiveCoeffChange = (index, value) => {
        const newCoeffs = [...objectiveCoeffs];
        newCoeffs[index] = value;
        setObjectiveCoeffs(newCoeffs);
    };

    const handleConstraintChange = (c_index, field, value, v_index = null) => {
        const newConstraints = [...constraints];
        if (field === 'coefficient') {
            newConstraints[c_index].coefficients[v_index] = value;
        } else {
            newConstraints[c_index][field] = value;
        }
        setConstraints(newConstraints);
    };

    const handleAddVariable = () => {
        setObjectiveCoeffs([...objectiveCoeffs, '']);
        setConstraints(constraints.map(c => ({
            ...c,
            coefficients: [...c.coefficients, '']
        })));
    };

    const handleAddConstraint = () => {
        setConstraints([
            ...constraints,
            { coefficients: Array(objectiveCoeffs.length).fill(''), sign: '<=', rhs: '' }
        ]);
    };

    return (
        <div className="input-section">

            {/* --- Problem Configuration --- */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="form-section-title">
                    <FaCalculator style={{ color: 'var(--accent-primary)' }} />
                    Configuração do Problema
                </div>

                <div className="form-row" style={{ justifyContent: 'space-between' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '600' }}>OBJETIVO DA OTIMIZAÇÃO</label>
                        <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                            <button
                                type="button"
                                onClick={() => setObjective('max')}
                                style={{
                                    background: objective === 'max' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                    color: objective === 'max' ? '#10b981' : 'var(--text-secondary)',
                                    border: 'none',
                                    padding: '6px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Maximizar
                            </button>
                            <button
                                type="button"
                                onClick={() => setObjective('min')}
                                style={{
                                    background: objective === 'min' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                    color: objective === 'min' ? '#ef4444' : 'var(--text-secondary)',
                                    border: 'none',
                                    padding: '6px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Minimizar
                            </button>
                        </div>
                    </div>

                    <div>
                        {/* Placeholder for visual balance, or could be variable count display */}
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '600' }}>VARIÁVEIS</label>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem', padding: '8px 0' }}>
                            {objectiveCoeffs.length}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '600' }}>RESTRIÇÕES</label>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem', padding: '8px 0' }}>
                            {constraints.length}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Objective Function --- */}
            <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 1) 100%)' }}>
                <div className="form-section-title">
                    <FaBullseye style={{ color: 'var(--accent-secondary)' }} />
                    Função Objetivo (Z)
                    <span className="badge" style={{ marginLeft: 'auto' }}>
                        {objective === 'max' ? 'Max' : 'Min'} Z = {objectiveCoeffs.map((_, i) => `c${i + 1}x${i + 1}`).join(' + ')}
                    </span>
                </div>

                <div className="form-row" style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '12px', color: 'var(--text-primary)' }}>Z =</span>
                    {objectiveCoeffs.map((coeff, index) => (
                        <React.Fragment key={index}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    step="any"
                                    value={coeff}
                                    onChange={(e) => handleObjectiveCoeffChange(index, e.target.value)}
                                    placeholder="0"
                                />
                                <label style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-tertiary)' }}>{`c${index + 1}`}</label>
                            </div>
                            <span style={{ margin: '0 8px', color: 'var(--text-secondary)', marginBottom: '20px' }}>x{index + 1}</span>
                            {index < objectiveCoeffs.length - 1 && <span style={{ marginRight: '8px', marginBottom: '20px' }}>+</span>}
                        </React.Fragment>
                    ))}
                    <button type="button" className="btn-add" onClick={handleAddVariable} title="Adicionar Variável" style={{ marginBottom: '20px' }}>
                        <FaPlus />
                    </button>
                </div>
            </div>

            {/* --- Constraints --- */}
            <div className="card">
                <div className="form-section-title">
                    <FaListOl style={{ color: 'var(--warning)' }} />
                    Restrições
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {constraints.map((constraint, c_index) => (
                        <div key={c_index} className="form-row" style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                            <span style={{ minWidth: '40px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>s.a.{c_index + 1}</span>

                            {constraint.coefficients.map((coeff, v_index) => (
                                <React.Fragment key={v_index}>
                                    <input
                                        type="number"
                                        step="any"
                                        value={coeff}
                                        onChange={(e) => handleConstraintChange(c_index, 'coefficient', e.target.value, v_index)}
                                        placeholder="0"
                                        style={{ width: '60px' }}
                                    />
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>x{v_index + 1}</span>
                                    {v_index < constraint.coefficients.length - 1 && <span>+</span>}
                                </React.Fragment>
                            ))}

                            <select
                                value={constraint.sign}
                                onChange={(e) => handleConstraintChange(c_index, 'sign', e.target.value)}
                                style={{ width: '60px', textAlign: 'center' }}
                            >
                                <option value="<=">&le;</option>
                                <option value=">=">&ge;</option>
                                <option value="=">=</option>
                            </select>

                            <input
                                type="number"
                                step="any"
                                value={constraint.rhs}
                                onChange={(e) => handleConstraintChange(c_index, 'rhs', e.target.value)}
                                placeholder="RHS"
                                style={{ width: '70px' }}
                            />
                        </div>
                    ))}
                </div>

                <button type="button" className="btn-add-constraint" onClick={handleAddConstraint} style={{ marginTop: '16px' }}>
                    <FaPlus style={{ marginRight: '8px' }} /> Adicionar Restrição
                </button>

                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        type="button"
                        onClick={onReset}
                        style={{
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            padding: '14px 24px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.target.style.borderColor = 'var(--error)'; e.target.style.color = 'var(--error)'; }}
                        onMouseLeave={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.color = 'var(--text-secondary)'; }}
                    >
                        <FaTrashAlt /> Limpar
                    </button>

                    <button type="submit" className="btn-solve" disabled={isLoading} onClick={onSolve}>
                        {isLoading ? 'Calculando...' : (
                            <>
                                Resolver Modelo <FaPlay style={{ marginLeft: '8px', fontSize: '0.8em' }} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SolverForm;
