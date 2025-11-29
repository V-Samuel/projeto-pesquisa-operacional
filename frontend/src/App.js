import React, { useState, useEffect } from 'react';
import './App.css';

// --- Função Auxiliar Blob ---
const base64ToBlob = (base64Data) => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'image/gif' });
};

// --- Componente Recursivo para desenhar a Árvore (Visualização B&B) ---
const TreeNodeCircle = ({ node, onSelect }) => {
  if (!node) return null;

  const getStatusClass = (status) => {
    if (status === 'integer') return 'integer';
    if (status === 'infeasible') return 'infeasible';
    return 'processing'; 
  };

  return (
    <li>
      <div 
        className={`tree-node-circle ${getStatusClass(node.status)}`}
        onMouseEnter={() => onSelect(node)}
        onClick={() => onSelect(node)}
      >
        {node.branch_info && <span className="branch-label">{node.branch_info}</span>}
        <div className="circle-content">
          {node.id === 'P0' ? 'Raiz' : node.id.split('.').pop()}
        </div>
      </div>
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNodeCircle key={child.id} node={child} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default function App() {
  const [activeModule, setActiveModule] = useState('auto'); 
  const [objective, setObjective] = useState('max');
  const [objectiveCoeffs, setObjectiveCoeffs] = useState(['', '']);
  const [constraints, setConstraints] = useState([{ coefficients: ['', ''], sign: '<=', rhs: '' }]);
  const [solution, setSolution] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [graphUrl, setGraphUrl] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const handleObjectiveCoeffChange = (index, value) => {
    const newCoeffs = [...objectiveCoeffs]; newCoeffs[index] = value; setObjectiveCoeffs(newCoeffs);
  };
  const handleConstraintChange = (c_index, field, value, v_index = null) => {
    const newConstraints = [...constraints];
    if (field === 'coefficient') newConstraints[c_index].coefficients[v_index] = value;
    else newConstraints[c_index][field] = value;
    setConstraints(newConstraints);
  };
  const handleAddVariable = () => {
    setObjectiveCoeffs([...objectiveCoeffs, '']);
    setConstraints(constraints.map(c => ({ ...c, coefficients: [...c.coefficients, ''] })));
  };
  const handleAddConstraint = () => {
    setConstraints([...constraints, { coefficients: Array(objectiveCoeffs.length).fill(''), sign: '<=', rhs: '' }]);
  };

  // Blob URL Logic
  useEffect(() => {
    if (solution && solution.graph_base64) {
      const blob = base64ToBlob(solution.graph_base64);
      const url = URL.createObjectURL(blob);
      setGraphUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setGraphUrl(null);
    }
    if (solution && solution.tree_data) {
        setSelectedNode(solution.tree_data);
    }
  }, [solution]);

  const handleReplayGraph = () => {
    if (solution && solution.graph_base64) {
      setGraphUrl(null);
      setTimeout(() => {
        const blob = base64ToBlob(solution.graph_base64);
        setGraphUrl(URL.createObjectURL(blob));
      }, 10);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault(); setSolution(null); setIsLoading(true); setStatusMessage('Resolvendo...');
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(problemData),
      });
      const result = await response.json();
      if (response.ok) { 
          setStatusMessage(result.status); 
          setSolution(result.solution); 
      } else { setStatusMessage(`Erro: ${result.error || 'Ocorreu um problema.'}`); }
    } catch (error) { setStatusMessage('Erro: Conexão falhou.'); } finally { setIsLoading(false); }
  };

  const isDualMode = activeModule === 'dual';
  const isBnBMode = activeModule === 'branch_and_bound';
  const ignoredKeys = ['graph_base64', 'iterations', 'error', 'integer_solution', 'dual_solution', 'status_complement', 'tableau', 'basis', 'tree_data', 'Z'];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2 className="sidebar-title">ORION</h2>
        <nav className="module-nav">
          <ul>
            <li><button onClick={() => setActiveModule('auto')} className={activeModule === 'auto' ? 'active' : ''}>Automático</button></li>
            <li><button onClick={() => setActiveModule('graphical')} className={activeModule === 'graphical' ? 'active' : ''}>Gráfico</button></li>
            <li><button onClick={() => setActiveModule('simplex')} className={activeModule === 'simplex' ? 'active' : ''}>Simplex</button></li>
            <li><button onClick={() => setActiveModule('big_m')} className={activeModule === 'big_m' ? 'active' : ''}>Big M</button></li>
            <li><button onClick={() => setActiveModule('two_phase')} className={activeModule === 'two_phase' ? 'active' : ''}>2‑Fases</button></li>
            <li><button onClick={() => setActiveModule('dual')} className={activeModule === 'dual' ? 'active' : ''} >Dual</button></li>
            <li><button onClick={() => setActiveModule('branch_and_bound')} className={activeModule === 'branch_and_bound' ? 'active' : ''}>Branch & Bound</button></li>
          </ul>
        </nav>
        <div className="sidebar-footer"><p>Selecione o módulo e insira os dados.</p></div>
      </aside>

      <main className="main-content">
        <form onSubmit={handleSubmit} style={{display:'contents'}}>
          
          <div className="workspace">
            {/* COLUNA 1: INPUTS */}
            <div className="input-section card">
              <fieldset>
                <legend>Função Objetivo</legend>
                <div className="form-row">
                  <select value={objective} onChange={(e) => setObjective(e.target.value)}>
                    <option value="max">Maximizar</option><option value="min">Minimizar</option>
                  </select>
                  <span>Z =</span>
                  {objectiveCoeffs.map((coeff, index) => (
                    <React.Fragment key={index}>
                      <input type="number" step="any" value={coeff} onChange={(e) => handleObjectiveCoeffChange(index, e.target.value)} placeholder={`x${index + 1}`} />
                      <label>{`x${index + 1}`}</label> {index < objectiveCoeffs.length - 1 && <span>+</span>}
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
                        <label>{`x${v_index + 1}`}</label> {v_index < constraint.coefficients.length - 1 && <span>+</span>}
                      </React.Fragment>
                    ))}
                    <select value={constraint.sign} onChange={(e) => handleConstraintChange(c_index, 'sign', e.target.value)}>
                      <option value="<=">&le;</option><option value=">=">&ge;</option><option value="=">=</option>
                    </select>
                    <input type="number" step="any" value={constraint.rhs} onChange={(e) => handleConstraintChange(c_index, 'rhs', e.target.value)} placeholder="RHS" />
                  </div>
                ))}
                <button type="button" className="btn-add-constraint" onClick={handleAddConstraint}>Adicionar Restrição</button>
                <div style={{marginTop:'20px', textAlign:'right'}}>
                    <button type="submit" className="btn-solve" disabled={isLoading}>{isLoading ? '...' : 'Resolver'}</button>
                </div>
              </fieldset>
            </div>

            {/* COLUNA 2: RESULTADOS PADRÃO (Oculta se for B&B) */}
            {!isBnBMode && (
                <div className="output-section card">
                <h2>Resultado</h2> <hr />
                <div className="result-content">
                    <p className="status-message">{statusMessage}</p>
                    {solution && (
                    <div className="solution-box">
                        {solution.error ? <p className="error-message">{solution.error}</p> : (
                        <>
                            {!isDualMode && (
                            <div className="final-solution-summary" style={{background: '#dcfce7', padding:'15px', borderRadius:'8px', marginBottom: '20px'}}>
                                <h3>Solução Final:</h3>
                                {solution.status_complement && <div style={{color: '#854d0e', fontWeight:'bold'}}>⚠️ {solution.status_complement}</div>}
                                <ul>
                                    <li><strong>Z:</strong> {solution.Z}</li>
                                    {Object.entries(solution).filter(([k]) => !ignoredKeys.includes(k)).map(([k,v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}
                                </ul>
                            </div>
                            )}

                            {isDualMode && (
                            <div className="dual-solution-summary" style={{background: '#e0f2fe', padding:'15px', borderRadius:'8px', marginBottom: '20px'}}>
                                <h3 style={{color: '#0369a1'}}>Variáveis Primal (do Dual):</h3>
                                <ul>
                                    <li><strong>Z:</strong> {solution.Z}</li>
                                    {Object.entries(solution).filter(([k]) => !ignoredKeys.includes(k)).map(([k,v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}
                                </ul>
                            </div>
                            )}

                            {/* Gráfico */}
                            {graphUrl && (
                            <div className="graph-container">
                                <h4 onClick={handleReplayGraph} style={{cursor:'pointer'}}>Ver Gráfico (Replay ↻)</h4>
                                <img src={graphUrl} onClick={handleReplayGraph} alt="Gráfico" style={{maxWidth:'100%', cursor:'pointer'}} />
                            </div>
                            )}
                            
                            {/* --- TABELAS RESTAURADAS AQUI --- */}
                            {solution.iterations && solution.iterations.length > 0 && (
                                <div className="iterations-container">
                                    <h3>Passo a Passo (Tableaus)</h3>
                                    <div style={{maxHeight:'400px', overflowY:'auto', border: '1px solid #eee'}}>
                                        {solution.iterations.map((step, idx) => (
                                            <div key={idx} className="iteration-card">
                                                <div className="iteration-header">
                                                    <span>{step.phase} - Passo {step.iteration}</span>
                                                    {step.pivot_info && <span style={{fontSize:'0.8em', color:'#666'}}> Pivô: [{step.pivot_info.row}, {step.pivot_info.col}]</span>}
                                                </div>
                                                <div style={{overflowX: 'auto'}}>
                                                    <table className="tableau-table">
                                                        <thead>
                                                            <tr><th>Base</th>{step.headers.map((h,i)=><th key={i}>{h}</th>)}</tr>
                                                        </thead>
                                                        <tbody>
                                                            {step.rows.map((r,i)=>(
                                                                <tr key={i}>
                                                                    <td style={{fontWeight:'bold', background:'#f8fafc'}}>{r.label}</td>
                                                                    {r.values.map((v,j)=>(
                                                                        <td key={j} className={step.pivot_info && step.pivot_info.row===i && step.pivot_info.col===j ? 'highlight-pivot' : ''}>{v}</td>
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
                            )}
                        </>
                        )}
                    </div>
                    )}
                </div>
                </div>
            )}
          </div>

          {/* --- ÁRVORE BRANCH & BOUND (LARGURA TOTAL) --- */}
          {isBnBMode && solution && !solution.error && (
            <div className="bnb-section">
                <h2 style={{borderBottom:'1px solid #e2e8f0', paddingBottom:'10px', marginBottom:'20px'}}>Árvore de Decisão (Branch & Bound)</h2>
                <div className="bnb-layout">
                    <div className="tree-viewer">
                        <div className="tree">
                            <ul>
                                {solution.tree_data && <TreeNodeCircle node={solution.tree_data} onSelect={setSelectedNode} />}
                            </ul>
                        </div>
                    </div>
                    <div className="node-details-panel">
                        {selectedNode ? (
                            <div className="details-card">
                                <h4>Detalhes do Nó {selectedNode.id}</h4>
                                <hr style={{border:'0', borderTop:'1px solid #bae6fd', margin:'10px 0'}}/>
                                {selectedNode.status === 'infeasible' ? (
                                    <p style={{color:'red', fontWeight:'bold'}}>Solução Inviável</p>
                                ) : (
                                    <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                                        <div style={{fontSize:'1.2rem', fontWeight:'bold', color:'#0f172a'}}>
                                            Z = {selectedNode.solution.Z}
                                        </div>
                                        <div style={{background:'white', padding:'10px', borderRadius:'6px'}}>
                                            {Object.entries(selectedNode.solution)
                                                .filter(([k]) => k.startsWith('x'))
                                                .map(([k, v]) => (
                                                    <div key={k} style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span>{k}:</span><strong>{typeof v === 'number' ? v.toFixed(4) : v}</strong>
                                                    </div>
                                                ))}
                                        </div>
                                        <div style={{fontSize:'0.8rem', color:'#64748b', fontStyle:'italic'}}>
                                            Status: {selectedNode.status === 'integer' ? 'Inteiro (Folha)' : 'Processando/Ramificado'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : <p style={{color:'#94a3b8', textAlign:'center', marginTop:'50px'}}>Passe o mouse sobre um nó.</p>}
                        <div style={{marginTop:'auto', paddingTop:'20px'}}>
                            <div style={{background:'#dcfce7', padding:'15px', borderRadius:'8px', border:'1px solid #86efac'}}>
                                <h4 style={{margin:'0 0 10px 0', color:'#166534'}}>Melhor Solução Inteira:</h4>
                                {solution.integer_solution ? (
                                    <ul style={{paddingLeft:'20px', margin:0}}>
                                        <li><strong>Z:</strong> {solution.Z}</li>
                                        {Object.entries(solution.integer_solution).filter(([k]) => k.startsWith('x')).map(([k,v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}
                                    </ul>
                                ) : <span>Nenhuma encontrada.</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}