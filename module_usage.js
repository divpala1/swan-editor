/**
 * SwanEditor - Complete Usage Examples
 * Demonstrates all features and capabilities of the swan editor module
*/

// ============================================
// 1. BASIC INITIALIZATION
// ============================================

import SwanEditor from './SwanEditor.js';

// Simple initialization
const editor = new SwanEditor('#workflow-container');

// Advanced initialization with all options
const advancedEditor = new SwanEditor('#advanced-container', {
    gridSize: 10,                          // Snap to 10px grid
    theme: 'dark',                         // Theme support
    edgeStyle: {                           // Default edge styling
        color: '#6b7280',
        width: 2,
        dashed: false,
        animated: false
    },
    nodeDefaults: {                        // Default node properties
        width: 200,
        resizable: false,
        deletable: true
    },
    canvas: {                              // Canvas configuration
        width: '100%',
        height: '600px',
        background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)',
        zoomable: false,
        pannable: true
    },
    callbacks: {                           // Event callbacks
        onNodeCreate: (node) => console.log('Node created:', node),
        onNodeDelete: (node) => console.log('Node deleted:', node),
        onNodeUpdate: (node, data) => console.log('Node updated:', node, data),
        onNodeMove: (node) => console.log('Node moved:', node),
        onNodeSelect: (node) => console.log('Node selected:', node),
        onEdgeCreate: (edge) => console.log('Edge created:', edge),
        onEdgeDelete: (edge) => console.log('Edge deleted:', edge)
    }
});

// ============================================
// 2. CUSTOM NODE TYPES
// ============================================

// Register an AI/ML processing node
editor.registerNodeType('ai-processor', {
    template: (node) => `
        <div class="node-handle" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
        <div class="node-content" style="padding: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#764ba2" stroke-width="2">
                    <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
                    <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"></path>
                </svg>
                <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                    ${node.data.title || 'AI Processor'}
                </h3>
            </div>
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 11px; color: #6b7280; margin-bottom: 4px;">Model</label>
                <select style="width: 100%; padding: 6px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white;"
                        onchange="this.dispatchEvent(new CustomEvent('nodeUpdate', {
                            detail: {nodeId: '${node.id}', data: {model: this.value}},
                            bubbles: true
                        }))">
                    <option value="gpt-4" ${node.data.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                    <option value="gpt-3.5" ${node.data.model === 'gpt-3.5' ? 'selected' : ''}>GPT-3.5 Turbo</option>
                    <option value="claude" ${node.data.model === 'claude' ? 'selected' : ''}>Claude 3</option>
                    <option value="llama" ${node.data.model === 'llama' ? 'selected' : ''}>Llama 2</option>
                </select>
            </div>
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 11px; color: #6b7280; margin-bottom: 4px;">
                    Temperature: <span style="color: #764ba2; font-weight: 600;">${node.data.temperature || 0.7}</span>
                </label>
                <input type="range" min="0" max="1" step="0.1" value="${node.data.temperature || 0.7}"
                       style="width: 100%;"
                       oninput="this.dispatchEvent(new CustomEvent('nodeUpdate', {
                           detail: {nodeId: '${node.id}', data: {temperature: parseFloat(this.value)}},
                           bubbles: true
                       }))">
            </div>
            
            <div style="margin-bottom: 8px;">
                <label style="display: block; font-size: 11px; color: #6b7280; margin-bottom: 4px;">System Prompt</label>
                <textarea style="width: 100%; padding: 6px; font-size: 11px; border: 1px solid #d1d5db; border-radius: 4px; resize: vertical; min-height: 60px;"
                          placeholder="Enter system prompt..."
                          onchange="this.dispatchEvent(new CustomEvent('nodeUpdate', {
                              detail: {nodeId: '${node.id}', data: {prompt: this.value}},
                              bubbles: true
                          }))">${node.data.prompt || ''}</textarea>
            </div>
            
            <button style="width: 100%; padding: 6px; background: #764ba2; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;"
                    onmouseover="this.style.background='#5e3a8e'"
                    onmouseout="this.style.background='#764ba2'"
                    onclick="alert('Processing with ' + '${node.data.model || 'GPT-4'}' + '...')">
                Run Inference
            </button>
        </div>
    `,
    ports: ['input', 'output'],
    style: {
        minWidth: '250px',
        borderColor: '#764ba2'
    },
    onCreate: (node) => {
        console.log('AI Processor node created:', node.id);
        // Initialize with default values
        node.data = {
            ...node.data,
            model: node.data.model || 'gpt-4',
            temperature: node.data.temperature || 0.7,
            prompt: node.data.prompt || ''
        };
    },
    onConnect: (source, target, edge) => {
        console.log(`AI Processor connected: ${source.id} -> ${target.id}`);
    }
});

// Register a data source node
editor.registerNodeType('data-source', {
    template: (node) => `
        <div class="node-handle" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);"></div>
        <div class="node-content" style="padding: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00a8cc" stroke-width="2">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
                </svg>
                <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                    ${node.data.title || 'Data Source'}
                </h3>
            </div>
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 11px; color: #6b7280; margin-bottom: 4px;">Source Type</label>
                <select style="width: 100%; padding: 6px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 4px;">
                    <option>Database</option>
                    <option>API Endpoint</option>
                    <option>File Upload</option>
                    <option>Real-time Stream</option>
                </select>
            </div>
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 11px; color: #6b7280; margin-bottom: 4px;">Connection String</label>
                <input type="text" 
                       style="width: 100%; padding: 6px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 4px;"
                       placeholder="Enter connection details..."
                       value="${node.data.connection || ''}">
            </div>
            
            <div style="display: flex; gap: 8px;">
                <button style="flex: 1; padding: 6px; background: #00a8cc; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;">
                    Connect
                </button>
                <button style="flex: 1; padding: 6px; background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; cursor: pointer;">
                    Test
                </button>
            </div>
            
            <div style="margin-top: 12px; padding: 8px; background: #f0fdfa; border-radius: 4px; font-size: 11px; color: #0f766e;">
                Status: <strong>Connected</strong> ✓
            </div>
        </div>
    `,
    ports: ['output'],
    style: {
        minWidth: '220px',
        borderColor: '#00a8cc'
    }
});

// Register a visualization node
editor.registerNodeType('visualizer', {
    template: (node) => `
        <div class="node-handle" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);"></div>
        <div class="node-content" style="padding: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <path d="M3 9h18M9 21V9"></path>
                </svg>
                <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                    ${node.data.title || 'Visualizer'}
                </h3>
            </div>
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 11px; color: #6b7280; margin-bottom: 4px;">Chart Type</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">
                    <button style="padding: 8px; background: ${node.data.chartType === 'line' ? '#f97316' : '#f3f4f6'}; 
                                   color: ${node.data.chartType === 'line' ? 'white' : '#6b7280'}; 
                                   border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; cursor: pointer;">
                        Line
                    </button>
                    <button style="padding: 8px; background: ${node.data.chartType === 'bar' ? '#f97316' : '#f3f4f6'}; 
                                   color: ${node.data.chartType === 'bar' ? 'white' : '#6b7280'}; 
                                   border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; cursor: pointer;">
                        Bar
                    </button>
                    <button style="padding: 8px; background: ${node.data.chartType === 'pie' ? '#f97316' : '#f3f4f6'}; 
                                   color: ${node.data.chartType === 'pie' ? 'white' : '#6b7280'}; 
                                   border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; cursor: pointer;">
                        Pie
                    </button>
                    <button style="padding: 8px; background: ${node.data.chartType === 'scatter' ? '#f97316' : '#f3f4f6'}; 
                                   color: ${node.data.chartType === 'scatter' ? 'white' : '#6b7280'}; 
                                   border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; cursor: pointer;">
                        Scatter
                    </button>
                </div>
            </div>
            
            <div style="height: 120px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                <svg width="100" height="60" viewBox="0 0 100 60">
                    <polyline points="10,50 25,30 40,35 55,20 70,25 85,10" 
                              fill="none" stroke="#f97316" stroke-width="2"/>
                    <circle cx="10" cy="50" r="3" fill="#f97316"/>
                    <circle cx="25" cy="30" r="3" fill="#f97316"/>
                    <circle cx="40" cy="35" r="3" fill="#f97316"/>
                    <circle cx="55" cy="20" r="3" fill="#f97316"/>
                    <circle cx="70" cy="25" r="3" fill="#f97316"/>
                    <circle cx="85" cy="10" r="3" fill="#f97316"/>
                </svg>
            </div>
            
            <button style="width: 100%; margin-top: 12px; padding: 6px; background: #f97316; color: white; 
                           border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                Export Chart
            </button>
        </div>
    `,
    ports: ['input'],
    style: {
        minWidth: '240px',
        borderColor: '#f97316'
    }
});

// ============================================
// 3. CREATING NODES PROGRAMMATICALLY
// ============================================

// Create nodes with specific positions and data
const inputNode = editor.createNode('data-source', 
    { x: 100, y: 200 }, 
    { 
        title: 'Customer Database',
        connection: 'postgresql://localhost:5432/customers'
    }
);

const aiNode = editor.createNode('ai-processor', 
    { x: 400, y: 200 }, 
    { 
        title: 'Sentiment Analysis',
        model: 'gpt-4',
        temperature: 0.3,
        prompt: 'Analyze customer feedback sentiment'
    }
);

const vizNode = editor.createNode('visualizer', 
    { x: 700, y: 200 }, 
    { 
        title: 'Results Dashboard',
        chartType: 'bar'
    }
);

// ============================================
// 4. CREATING EDGES WITH CUSTOM STYLES
// ============================================

// Create edges with different styles
editor.createEdge(inputNode, aiNode, {
    style: {
        color: '#10b981',
        width: 3,
        animated: true
    },
    data: {
        label: 'Raw Data',
        dataType: 'json'
    }
});

editor.createEdge(aiNode, vizNode, {
    style: {
        color: '#f59e0b',
        width: 2,
        dashed: true
    },
    data: {
        label: 'Processed Results',
        dataType: 'array'
    }
});

// ========================================
// 5. Nodes with re-active connections data
// ========================================
export const inputNodeConfig = {
    template: (node) => {
        // Get connection data (this will be called on re-render)
        const connectionData = node._connectionData || { inputs: [], outputs: [], inputCount: 0, outputCount: 0 };
        
        return `
        <div class="node-handle"></div>
        <div class="node-content group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <!-- Compact Node View -->
            <div class="p-3">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="flex-shrink-0 w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                            </svg>
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">Input</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${
                                node.data.inputType === 'text' ? 'Text' :
                                node.data.inputType === 'file' ? 'File' :
                                node.data.inputType === 'json' ? 'JSON' :
                                node.data.inputType === 'number' ? 'Number' : 'Text'
                            }</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- Connection Badge -->
                        ${connectionData.outputCount > 0 ? `
                            <span class="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                                ${connectionData.outputCount} connected
                            </span>
                        ` : ''}
                    </div>
                </div>

                <!-- Connected Nodes Display -->
                ${connectionData.outputCount > 0 ? `
                    <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Connected to:</p>
                        <div class="space-y-1">
                            ${connectionData.outputs.map(conn => `
                                <div class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                                    </svg>
                                    <span class="truncate">${conn.data.variableName || conn.type} (${conn.type})</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    },
    ports: ['output'],
    style: {
        minWidth: '180px'
    },
    onCreate: (node) => {
        node.data = {
            ...node.data,
            variableName: node.data.variableName || '',
            inputType: node.data.inputType || 'text',
            label: node.data.label || '',
            defaultValue: node.data.defaultValue || '',
            required: node.data.required || false
        };
    },
    onConnect: (source, target, edge) => {
        console.log(`Input connected: ${source.id} -> ${target.id}`);
    }
};

// ============================================
// 6. WORKFLOW MANAGEMENT
// ============================================

// Save workflow to JSON
function saveWorkflow() {
    const workflowData = editor.getWorkflowData();
    const json = editor.exportJSON();
    
    // Save to localStorage
    localStorage.setItem('workflow', json);
    
    // Or send to server
    fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json
    });
    
    console.log('Workflow saved:', workflowData);
}

// Load workflow from JSON
function loadWorkflow() {
    // From localStorage
    const savedWorkflow = localStorage.getItem('workflow');
    if (savedWorkflow) {
        editor.importJSON(savedWorkflow);
    }
    
    // Or from server
    fetch('/api/workflows/latest')
        .then(res => res.json())
        .then(data => {
            editor.loadWorkflowData(data);
        });
}

// Clear workflow
function clearWorkflow() {
    if (confirm('Clear all nodes and connections?')) {
        editor.clear();
    }
}

// ============================================
// 7. ADVANCED INTERACTIONS
// ============================================

// Programmatic node selection
editor.selectNode(aiNode);

// Multi-select nodes
editor.selectNode(inputNode, true);  // true = add to selection

// Select all nodes
editor.selectAll();

// Clear selection
editor.clearSelection();

// Delete specific node
editor.deleteNode(vizNode);

// Delete selected nodes
editor.deleteSelected();

// Center view on all nodes
editor.centerView();

// Get all the connected nodes to a specific node
const connectedToAI = editor.getConnectedNodes(aiNode);
console.log('Nodes connected to AI Processor:', connectedToAI);

// ============================================
// 8. CUSTOM EVENT HANDLING
// ============================================

// Create a workflow executor
class WorkflowExecutor {
    constructor(editor) {
        this.editor = editor;
        this.results = new Map();
    }
    
    async execute() {
        const workflow = this.editor.getWorkflowData();
        const executionOrder = this.topologicalSort(workflow);
        
        for (const nodeId of executionOrder) {
            const node = workflow.nodes.find(n => n.id === nodeId);
            await this.executeNode(node);
        }
        
        return this.results;
    }
    
    async executeNode(node) {
        console.log(`Executing ${node.type}: ${node.id}`);
        
        switch(node.type) {
            case 'data-source':
                // Fetch data from source
                this.results.set(node.id, await this.fetchData(node.data));
                break;
                
            case 'ai-processor':
                // Process with AI
                const inputData = this.getInputData(node.id);
                this.results.set(node.id, await this.processWithAI(node.data, inputData));
                break;
                
            case 'visualizer':
                // Generate visualization
                const vizData = this.getInputData(node.id);
                this.results.set(node.id, this.createVisualization(node.data, vizData));
                break;
        }
    }
    
    topologicalSort(workflow) {
        // Implementation of topological sort for execution order
        // ... (simplified for example)
        return workflow.nodes.map(n => n.id);
    }
    
    async fetchData(config) {
        // Simulate data fetching
        return { data: 'sample data' };
    }
    
    async processWithAI(config, input) {
        // Simulate AI processing
        return { processed: true, result: 'analyzed' };
    }
    
    createVisualization(config, data) {
        // Simulate visualization creation
        return { chart: 'created' };
    }
    
    getInputData(nodeId) {
        // Get input data from connected nodes
        return this.results.get('previous-node-id');
    }
}

// Execute the workflow
const executor = new WorkflowExecutor(editor);
executor.execute().then(results => {
    console.log('Workflow execution complete:', results);
});

// ============================================
// 9. TOOLBAR AND UI INTEGRATION
// ============================================

// Create a toolbar for the editor
function createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        padding: 8px;
        display: flex;
        gap: 8px;
        z-index: 1000;
    `;
    
    const buttons = [
        { text: 'Add Data Source', action: () => editor.createNode('data-source') },
        { text: 'Add AI Processor', action: () => editor.createNode('ai-processor') },
        { text: 'Add Visualizer', action: () => editor.createNode('visualizer') },
        { text: 'Save', action: saveWorkflow },
        { text: 'Load', action: loadWorkflow },
        { text: 'Clear', action: clearWorkflow },
        { text: 'Execute', action: () => executor.execute() }
    ];
    
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.style.cssText = `
            padding: 8px 16px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        button.addEventListener('click', btn.action);
        toolbar.appendChild(button);
    });
    
    document.body.appendChild(toolbar);
}

// Initialize toolbar
createToolbar();

// ============================================
// 10. CLEANUP
// ============================================

// Properly destroy the editor when needed
window.addEventListener('beforeunload', () => {
    editor.destroy();
});

// Export for use in other modules
export { editor, WorkflowExecutor };