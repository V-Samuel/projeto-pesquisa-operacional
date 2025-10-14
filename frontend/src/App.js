// frontend/src/App.js

import React, { useState } from 'react';
import './App.css';

function App() {
  // --- Estados para guardar os dados do formulário (Lógica inalterada) ---
  const [objective, setObjective] = useState('max');
  const [objectiveCoeffs, setObjectiveCoeffs] = useState(['', '']);
  const [constraints, setConstraints] = useState([
    { coefficients: ['', ''], sign: '<=', rhs: '' }
  ]);
  const [solution, setSolution] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Funções para ATUALIZAR o estado (Lógica inalterada) ---
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

  // --- Funções para ADICIONAR (Lógica inalterada) ---
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
  
  // --- Função para ENVIAR os dados para a API (Lógica inalterada, com adição de isLoading) ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSolution(null);
    setIsLoading(true); // Ativa o estado de carregamento
    setStatusMessage('Resolvendo...');

    const problemData = {
      objective: objective,
      objective_function: objectiveCoeffs.map(c => parseFloat(c) || 0),
      constraints: constraints.map(c => ({
        coefficients: c.coefficients.map(coef => parseFloat(coef) || 0),
        sign: c.sign,
        rhs: parseFloat(c.rhs) || 0
      }))
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
      console.error('Falha na comunicação com a API:', error);
      setStatusMessage('Erro: Não foi possível conectar ao servidor.');
    } finally {
      setIsLoading(false); // Desativa o estado de carregamento
    }
  };

  // --- Renderização da Página (NOVO LAYOUT) ---
  return (
    <div className="App">
      <header className="app-header">
        <h1><i className="fas fa-cogs"></i> Resolvedor de P.O</h1>
      </header>
      
      <main className="main-container">
        <div className="input-section">
          <form onSubmit={handleSubmit}>
            {/* Função Objetivo */}
            <fieldset className="card">
              <legend>Função Objetivo</legend>
              <div className="objective-inputs">
                <select value={objective} onChange={(e) => setObjective(e.target.value)}>
                  <option value="max">Maximizar</option>
                  <option value="min">Minimizar</option>
                </select>
                <span>Z =</span>
                {objectiveCoeffs.map((coeff, index) => (
                  <React.Fragment key={index}>
                    <input
                      type="number"
                      step="any"
                      value={coeff}
                      onChange={(e) => handleObjectiveCoeffChange(index, e.target.value)}
                      placeholder={`x${index + 1}`}
                    />
                    <label>{`x${index + 1}`}</label>
                    {index < objectiveCoeffs.length - 1 && <span>+</span>}
                  </React.Fragment>
                ))}
                <button type="button" className="btn-add" onClick={handleAddVariable}>+</button>
              </div>
            </fieldset>

            {/* Restrições */}
            <fieldset className="card">
              <legend>Restrições</legend>
              {constraints.map((constraint, c_index) => (
                <div key={c_index} className="constraint-row">
                  {constraint.coefficients.map((coeff, v_index) => (
                    <React.Fragment key={v_index}>
                      <input
                        type="number"
                        step="any"
                        value={coeff}
                        onChange={(e) => handleConstraintChange(c_index, 'coefficient', e.target.value, v_index)}
                        placeholder={`x${v_index + 1}`}
                      />
                      <label>{`x${v_index + 1}`}</label>
                      {v_index < constraint.coefficients.length - 1 && <span>+</span>}
                    </React.Fragment>
                  ))}
                  <select 
                    value={constraint.sign} 
                    onChange={(e) => handleConstraintChange(c_index, 'sign', e.target.value)}>
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
                  />
                </div>
              ))}
              <button type="button" className="btn-add-constraint" onClick={handleAddConstraint}>Adicionar Restrição</button>
            </fieldset>

            <button type="submit" className="btn-solve" disabled={isLoading}>
              {isLoading ? 'Resolvendo...' : 'Resolver'}
            </button>
          </form>
        </div>

        <div className="output-section card">
          <h2>Resultado</h2>
          <hr />
          <div className="result-content">
            {!solution && <p className="placeholder">{statusMessage || 'O resultado aparecerá aqui...'}</p>}
            {solution && (
              <div className="solution-box">
                <ul>
                  {Object.entries(solution).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {value.toFixed(4)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;