import React, { useState, useEffect } from 'react';
import './App.css';

// --- Função Auxiliar para converter Base64 em Arquivo (Blob) ---
const base64ToBlob = (base64Data) => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'image/gif' });
};

export default function App() {
  // --- Estados ---
  const [activeModule, setActiveModule] = useState('auto'); 
  const [useIntegerSolution, setUseIntegerSolution] = useState(false);

  const [objective, setObjective] = useState('max');
  const [objectiveCoeffs, setObjectiveCoeffs] = useState(['', '']);
  const [constraints, setConstraints] = useState([
    { coefficients: ['', ''], sign: '<=', rhs: '' }
  ]);
  const [solution, setSolution] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para armazenar a URL temporária do GIF
  const [graphUrl, setGraphUrl] = useState(null);

  // --- Handlers de Entrada ---
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

  // --- LÓGICA DE IMAGEM E REPLAY ---
  
  // Gera uma nova URL de Blob a partir do Base64
  const generateGraphUrl = (b64Data) => {
    if (!b64Data) return null;
    const blob = base64ToBlob(b64Data);
    return URL.createObjectURL(blob);
  };

  // Quando chega uma solução nova, gera a primeira URL
  useEffect(() => {
    if (solution && solution.graph_base64) {
      const url = generateGraphUrl(solution.graph_base64);
      setGraphUrl(url);
      
      // Limpeza de memória quando o componente desmontar ou mudar
      return () => URL.revokeObjectURL(url);
    } else {
      setGraphUrl(null);
    }
  }, [solution]);

  // Função de Replay: Gera um NOVO endereço para o MESMO arquivo
  const handleReplayGraph = () => {
    if (solution && solution.graph_base64) {
      // 1. Limpa a URL atual (opcional, mas bom para garantir visualmente)
      setGraphUrl(null);
      
      // 2. Cria uma nova URL única quase instantaneamente
      setTimeout(() => {
        const newUrl = generateGraphUrl(solution.graph_base64);
        setGraphUrl(newUrl);
      }, 10); 
    }
  };

  // --- Envio para API ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSolution(null);
    setGraphUrl(null); 
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
      method: activeModule,
      integer_mode: useIntegerSolution
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

  const isDualMode = activeModule === 'dual';

  // --- Renderização ---
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
            <li><button onClick={() => setActiveModule('dual')} className={activeModule === 'dual' ? 'active' : ''} style={{color: '#0ea5e9'}}>☯️ Dual</button></li>
          </ul>
        </nav>
        
        {/* Checkbox Solução Inteira */}
        <div className="sidebar-config" style={{marginTop: '20px', padding: '15px', borderTop: '1px solid #eee'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
            <input 
              type="checkbox" 
              checked={useIntegerSolution}
              onChange={(e) => setUseIntegerSolution(e.target.checked)}
              style={{width: '18px', height: '18px'}}
            />
            <span style={{fontWeight: '500'}}>Buscar Solução Inteira</span>
          </label>
          <p style={{fontSize: '0.8rem', color: '#666', marginTop: '5px'}}>
            (Plota ponto inteiro e calcula via Branch & Bound)
          </p>
        </div>

        <div className="sidebar-footer">
          <p>Escolha o módulo e insira os dados do problema.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <form onSubmit={handleSubmit}>
          <div className="workspace">
            
            {/* Área de Entrada */}
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

            {/* Área de Resultado */}
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
                        {/* 1. Solução Primal */}
                        {!isDualMode && (
                          <div className="final-solution-summary" style={{marginBottom: '20px', padding: '10px', background: '#dcfce7', borderRadius: '6px'}}>
                              <h3>Solução Final (Primal):</h3>
                              {solution.status_complement && (
                                <div style={{color: '#854d0e', backgroundColor: '#fef9c3', padding: '5px', marginBottom: '10px', borderRadius: '4px', fontWeight: 'bold'}}>
                                  ⚠️ {solution.status_complement}
                                </div>
                              )}
                              <ul>
                              {Object.entries(solution)
                                  .filter(([key]) => !['graph_base64', 'iterations', 'error', 'integer_solution', 'dual_solution', 'status_complement', 'tableau', 'basis'].includes(key)) 
                                  .map(([key, value]) => (
                                  <li key={key}>
                                      <strong>{key}:</strong> {typeof value === 'number' ? value.toFixed(4) : value}
                                  </li>
                                  ))
                              }
                              </ul>
                          </div>
                        )}

                        {/* 2. Solução Dual */}
                        {isDualMode && (
                          <div className="dual-solution-summary" style={{marginBottom: '20px', padding: '10px', background: '#e0f2fe', borderRadius: '6px', border: '1px solid #bae6fd'}}>
                            <h3 style={{color: '#0369a1'}}>☯️ Variáveis do Primal (Resultado do Dual):</h3>
                            <ul>
                              {Object.entries(solution)
                                .filter(([key]) => !['graph_base64', 'iterations', 'error', 'integer_solution', 'dual_solution', 'status_complement', 'tableau', 'basis'].includes(key)) 
                                .map(([key, value]) => (
                                <li key={key}>
                                  <strong>{key}:</strong> {value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 3. Solução Inteira */}
                        {solution.integer_solution && (
                          <div className="integer-solution-summary" style={{marginBottom: '20px', padding: '10px', background: '#ffedd5', border: '1px solid #fed7aa', borderRadius: '6px'}}>
                            <h3 style={{color: '#c2410c'}}>★ Solução Inteira Ótima (Bônus):</h3>
                            <ul>
                              {Object.entries(solution.integer_solution)
                                .filter(([key]) => key !== 'iterations' && key !== 'status' && key !== 'error' && key !== 'tableau' && key !== 'basis' && key !== 'dual_solution') 
                                .map(([key, value]) => (
                                <li key={key}>
                                  <strong>{key}:</strong> {value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 4. Gráfico Animado (COM REPLAY REAL VIA BLOB URL) */}
                        {graphUrl && (
                          <div className="graph-container">
                            <h4 style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                              Visualização Gráfica (Animada)
                              <span style={{fontSize:'0.7em', fontWeight:'normal', color:'#666', cursor:'pointer'}} onClick={handleReplayGraph}>
                                [Clique para Replay ↻]
                              </span>
                            </h4>
                            <img 
                              src={graphUrl} 
                              alt="Gráfico da Solução" 
                              onClick={handleReplayGraph}
                              style={{cursor: 'pointer', display: 'block', maxWidth: '100%', border: '1px solid #eee'}}
                              title="Clique para ver a animação novamente"
                            />
                            <p style={{fontSize: '0.8rem', color: '#666', fontStyle: 'italic', marginTop: '5px'}}>
                              Legenda: Verde = Ótimo Contínuo | Laranja = Ótimo Inteiro | Tracejada = Função Objetivo
                            </p>
                          </div>
                        )}

                        {/* 5. Tabelas */}
                        {solution.iterations && solution.iterations.length > 0 && (
                          <div className="iterations-container">
                            <h3>Passo a Passo (Tableaus)</h3>
                            {solution.iterations.map((step, idx) => (
                              <div key={idx} className="iteration-card">
                                <div className="iteration-header">
                                  <span>{step.phase || 'Iteração'} - Passo {step.iteration}</span>
                                  {step.pivot_info && (
                                      <span style={{fontSize: '0.85em', color: '#555'}}>
                                          Pivô: Linha {step.pivot_info.row}, Col {step.pivot_info.col}
                                      </span>
                                  )}
                                </div>
                                <div style={{overflowX: 'auto'}}>
                                  <table className="tableau-table">
                                    <thead>
                                      <tr>
                                        <th>Base</th>
                                        {step.headers.map((header, h_idx) => (
                                          <th key={h_idx}>{header}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {step.rows.map((row, r_idx) => (
                                        <tr key={r_idx}>
                                          <td style={{fontWeight: 'bold', background: '#f8fafc'}}>{row.label}</td>
                                          {row.values.map((val, v_idx) => (
                                            <td key={v_idx} 
                                                className={step.pivot_info && step.pivot_info.row === r_idx && step.pivot_info.col === v_idx ? 'highlight-pivot' : ''}>
                                              {typeof val === 'number' ? val.toFixed(3) : val}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
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