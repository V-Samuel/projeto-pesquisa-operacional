import React from 'react';
import '../../styles/BnB.css';

const TreeNodeCircle = ({ node, onSelect }) => {
    if (!node) return null;

    const getStatusClass = (status) => {
        if (status === 'integer') return 'integer';
        if (status === 'infeasible') return 'infeasible';
        if (status === 'pruned') return 'pruned';
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

const TreeViewer = ({ treeData, onSelectNode }) => {
    return (
        <div className="tree-viewer">
            <div className="tree">
                <ul>
                    {treeData && <TreeNodeCircle node={treeData} onSelect={onSelectNode} />}
                </ul>
            </div>
        </div>
    );
};

export default TreeViewer;
