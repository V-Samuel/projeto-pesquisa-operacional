// frontend/src/App.js

import React, { useState } from 'react';
import './App.css';

export default function App() {
 
  const [activeModule, setActiveModule] = useState('auto'); 

  
  const [objective, setObjective] = useState('max');
  const [objectiveCoeffs, setObjectiveCoeffs] = useState(['', '']);
  const [constraints, setConstraints] = useState([
    { coefficients: ['', ''], sign: '<=', rhs: '' }
  ]);
  const [solution, setSolution] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  
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

  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSolution(null);
    setIsLoading(true);
    setStatusMessage('Resolvendo...');

    const problemData = {
      objective: objective,
      objective_function: objectiveCoeffs.map(c => parseFloat(c) || 0),
      constraints: constraints.map(c => ({
        coefficients: c.coefficients.map(coef => parseFloat(coef) || 0),
        sign: c.sign,
        rhs: parseFloat(c.rhs) || 0
      })),
      
      method: activeModule
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/solve/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problemData),
      });
      const result = await response.json();
      if (response.ok) {
        setStatusMessage(result.status);
        setSolution(result.solution);
      } else {
        setStatusMessage(`Erro: ${result.error || 'Ocorreu um problema.'}`);
      }
    } catch (error) {
      setStatusMessage('Erro: Não foi possível conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  
  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="sidebar-title">ORION</h2>
        <nav className="module-nav">
          <ul>
            <li><button onClick={() => setActiveModule('auto')} className={activeModule === 'auto' ? 'active' : ''}>🤖 Automático</button></li>
            <li><button onClick={() => setActiveModule('graphical')} className={activeModule === 'graphical' ? 'active' : ''}>📈 Gráfico</button></li>
            <li><button onClick={() => setActiveModule('simplex')} className={activeModule === 'simplex' ? 'active' : ''}>📐 Simplex</button></li>
            <li><button onClick={() => setActiveModule('big_m')} className={activeModule === 'big_m' ? 'active' : ''}>🧩 Big M</button></li>
            <li><button onClick={() => setActiveModule('two_phase')} className={activeModule === 'two_phase' ? 'active' : ''}>2‑Fases</button></li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <p>Escolha o módulo e insira os dados do problema.</p>
        </div>
      </aside>

      
      <main className="main-content">
        <form onSubmit={handleSubmit}>
          <div className="workspace">
            
            <div className="input-section card">
              <fieldset>
                <legend>Função Objetivo</legend>
                <div className="form-row">
                  <select value={objective} onChange={(e) => setObjective(e.target.value)}>
                    <option value="max">Maximizar</option>
                    <option value="min">Minimizar</option>
                  </select>
                  <span>Z =</span>
                  {objectiveCoeffs.map((coeff, index) => (
                    <React.Fragment key={index}>
                      <input type="number" step="any" value={coeff} onChange={(e) => handleObjectiveCoeffChange(index, e.target.value)} placeholder={`x${index + 1}`} />
                      <label>{`x${index + 1}`}</label>
                      {index < objectiveCoeffs.length - 1 && <span>+</span>}
                    </React.Fragment>
                  ))}
                  <button type="button" className="btn-add" onClick={handleAddVariable}>+</button>
                </div>
              </fieldset>

              <fieldset>
                <legend>Restrições</legend>
                {constraints.map((constraint, c_index) => (
                  <div key={c_index} className="form-row">
                    {constraint.coefficients.map((coeff, v_index) => (
                      <React.Fragment key={v_index}>
                        <input type="number" step="any" value={coeff} onChange={(e) => handleConstraintChange(c_index, 'coefficient', e.target.value, v_index)} placeholder={`x${v_index + 1}`} />
                        <label>{`x${v_index + 1}`}</label>
                        {v_index < constraint.coefficients.length - 1 && <span>+</span>}
                      </React.Fragment>
                    ))}
                    <select value={constraint.sign} onChange={(e) => handleConstraintChange(c_index, 'sign', e.target.value)}>
                      <option value="<=">&le;</option>
                      <option value=">=">&ge;</option>
                      <option value="=">=</option>
                    </select>
                    <input type="number" step="any" value={constraint.rhs} onChange={(e) => handleConstraintChange(c_index, 'rhs', e.target.value)} placeholder="RHS" />
                  </div>
                ))}
                <button type="button" className="btn-add-constraint" onClick={handleAddConstraint}>Adicionar Restrição</button>
              </fieldset>
            </div>

            <div className="output-section card">
              <h2>Resultado</h2>
              <hr />
              <div className="result-content">
                <p className="status-message">{statusMessage}</p>

                {solution && (
                  <div className="solution-box">
                    {solution.error ? (
                      <p className="error-message">{solution.error}</p>
                    ) : (
                      <>
                        
                        <ul>
                          {Object.entries(solution)
                            .filter(([key]) => key !== 'graph_base64') 
                            .map(([key, value]) => (
                              <li key={key}>
                                <strong>{key}:</strong> {typeof value === 'number' ? value.toFixed(4) : value}
                              </li>
                            ))
                          }
                        </ul>

                        
                        {solution.graph_base64 && (
                          <div className="graph-container">
                            <h4>Visualização Gráfica</h4>
                            <img src={`data:image/png;base64,${solution.graph_base64}`} alt="Gráfico da Solução" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="action-bar">
            <button type="submit" className="btn-solve" disabled={isLoading}>
              {isLoading ? 'Resolvendo...' : 'Resolver'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}