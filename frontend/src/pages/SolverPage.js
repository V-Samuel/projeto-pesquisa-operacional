import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SolverForm from '../features/solver/SolverForm';
import ResultSummary from '../features/results/ResultSummary';
import TableauViewer from '../features/results/TableauViewer';
import GraphViewer from '../features/results/GraphViewer';
import TreeViewer from '../features/bnb/TreeViewer';
import NodeDetails from '../features/bnb/NodeDetails';
import { solveProblem } from '../services/api';
import '../styles/Layout.css'; // Ensure layout styles are applied if needed locally

const SolverPage = () => {
    const { method } = useParams();
    const navigate = useNavigate();

    const activeModule = method || 'auto';

    // State
    const [objective, setObjective] = useState('max');
    const [objectiveCoeffs, setObjectiveCoeffs] = useState(['', '']);
    const [constraints, setConstraints] = useState([{ coefficients: ['', ''], sign: '<=', rhs: '' }]);

    const [solution, setSolution] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Visual State
    const [selectedNode, setSelectedNode] = useState(null);

    // Effect to reset solution when module changes
    useEffect(() => {
        setSolution(null);
        setStatusMessage('');
        setSelectedNode(null);
    }, [activeModule]);

    // Effect to select root node in BnB
    useEffect(() => {
        if (solution && solution.tree_data) {
            setSelectedNode(solution.tree_data);
        }
    }, [solution]);

    const translateStatus = (status) => {
        if (!status) return '';
        const lower = status.toLowerCase();
        if (lower.includes('optimal')) return 'Solução Ótima Encontrada';
        if (lower.includes('infeasible')) return 'Solução Inviável';
        if (lower.includes('unbounded')) return 'Solução Ilimitada';
        return status;
    };

    const handleSolve = async () => {
        setSolution(null);
        setIsLoading(true);
        setStatusMessage('Resolvendo...');

        // Map URL method to backend method name if necessary
        // URL: simplex, branch-and-bound, etc.
        // Backend expects: simplex, branch_and_bound, etc.
        const backendMethod = activeModule.replace(/-/g, '_');

        const problemData = {
            objective: objective,
            objective_function: objectiveCoeffs.map(c => parseFloat(c) || 0),
            constraints: constraints.map(c => ({
                coefficients: c.coefficients.map(coef => parseFloat(coef) || 0),
                sign: c.sign,
                rhs: parseFloat(c.rhs) || 0
            })),
            method: backendMethod
        };

        const result = await solveProblem(problemData);

        if (result.success) {
            setStatusMessage(translateStatus(result.status));
            setSolution(result.solution);
        } else {
            setStatusMessage(`Erro: ${result.error}`);
        }
        setIsLoading(false);
    };

    const handleReset = () => {
        setObjective('max');
        setObjectiveCoeffs(['', '']);
        setConstraints([{ coefficients: ['', ''], sign: '<=', rhs: '' }]);
        setSolution(null);
        setStatusMessage('');
        setSelectedNode(null);
    };

    const isBnBMode = activeModule === 'branch-and-bound';
    const isDualMode = activeModule === 'dual';

    return (
        <div className="workspace">
            {/* Input Section */}
            <SolverForm
                objective={objective} setObjective={setObjective}
                objectiveCoeffs={objectiveCoeffs} setObjectiveCoeffs={setObjectiveCoeffs}
                constraints={constraints} setConstraints={setConstraints}
                onSolve={handleSolve}
                onReset={handleReset}
                isLoading={isLoading}
            />

            {/* Results Section (Non-BnB) */}
            {!isBnBMode && (solution || statusMessage) && (
                <div className="output-section">
                    <h2>Resultado</h2> <hr />
                    <div className="result-content">
                        <p className="status-message">{statusMessage}</p>

                        <ResultSummary solution={solution} isDualMode={isDualMode} />

                        {solution && (
                            <>
                                <GraphViewer graphBase64={solution.graph_base64} />
                                <TableauViewer iterations={solution.iterations} />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* BnB Section */}
            {isBnBMode && solution && !solution.error && (
                <div className="bnb-section">
                    <h2 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>Árvore de Decisão (Branch & Bound)</h2>
                    <div className="bnb-layout">
                        <TreeViewer treeData={solution.tree_data} onSelectNode={setSelectedNode} />
                        <NodeDetails
                            selectedNode={selectedNode}
                            solution={solution}
                            graphUrl={null} // Graph logic handled inside NodeDetails if needed or passed down
                            onReplayGraph={() => { }} // Placeholder if needed
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SolverPage;
