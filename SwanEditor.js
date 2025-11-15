/**
 * SwanEditor.js
 * A modular, extensible workflow editor framework for creating node-based interfaces
 * 
 * @author Divyajeet Pala
 * @version 1.0.0
 * @license MIT
*/

export default class SwanEditor {
    constructor(container, options = {}) {
        // Container element
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!this.container) {
            throw new Error('SwanEditor: Invalid container element');
        }
        
        // Configuration with defaults
        this.options = {
            gridSize: 1,                    // Grid snapping (1 = disabled)
            theme: 'light',                 // Theme: 'light' or 'dark'
            edgeStyle: {                    // Default edge styling
                color: '#6b7280',
                width: 2,
                dashed: false,
                animated: false
            },
            nodeDefaults: {                 // Default node data
                width: 200,
                resizable: false,
                deletable: true
            },
            canvas: {                       // Canvas configuration
                width: '100%',
                height: '100vh',
                background: '#f9fafb',
                zoomable: false,
                pannable: true
            },
            callbacks: {},                  // Event callbacks
            ...options
        };
        
        // State management
        this.nodes = new Map();
        this.edges = new Map();
        this.selectedNodes = new Set();
        this.dragState = null;
        this.connectionState = null;

        // Connection cache for O(1) lookups
        this.connectionCache = new Map(); // nodeId -> {inputs: Set, outputs: Set}
        
        // Dirty tracking for selective re-renders
        this.dirtyNodes = new Set();

        // ID counters
        this.nodeIdCounter = 1;
        this.edgeIdCounter = 1;
        
        // Node type registry
        this.nodeTypes = new Map();
        
        // Performance optimization
        this.rafId = null;
        this.updateQueue = new Set();
        
        // Initialize the editor
        this.init();
        
        // Register default node types
        this.registerDefaultNodeTypes();
    }
    
    /**
     * Initialize the editor DOM and event listeners
     */
    init() {
        // Add required styles if not already present
        this.injectStyles();
        
        // Create canvas structure
        this.container.innerHTML = `
            <div class="workflow-container" style="width: ${this.options.canvas.width}; height: ${this.options.canvas.height};">
                <div class="workflow-canvas" data-workflow-canvas>
                    <svg class="workflow-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">
                        <defs>
                            <marker id="wf-arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                                <polygon points="0 0, 10 3, 0 6" fill="${this.options.edgeStyle.color}" />
                            </marker>
                            <marker id="wf-arrowhead-selected" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                            </marker>
                        </defs>
                    </svg>
                </div>
            </div>
        `;
        
        this.canvas = this.container.querySelector('[data-workflow-canvas]');
        this.svg = this.container.querySelector('svg');
        
        // Apply canvas background
        this.canvas.style.background = this.options.canvas.background;
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Inject required CSS styles
     */
    injectStyles() {
        if (document.getElementById('workflow-editor-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'workflow-editor-styles';
        style.textContent = `
            .workflow-container {
                position: relative;
                overflow: hidden;
            }
            
            .workflow-canvas {
                position: relative;
                width: 100%;
                height: 100%;
                overflow: auto;
            }
            
            .workflow-node {
                position: absolute;
                background: none;
                // border: 2px solid #e5e7eb;
                border-radius: 9px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                cursor: move;
                user-select: none;
                transition: box-shadow 0.2s, border-color 0.2s;
            }
            
            .workflow-node.selected {
                border: 2px solid #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .workflow-node.dragging {
                opacity: 0.9;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                z-index: 1000;
                transition: none;
            }
            
            .node-port {
                position: absolute;
                width: 12px;
                height: 12px;
                background: #6b7280;
                border: 2px solid white;
                border-radius: 50%;
                cursor: crosshair;
                z-index: 10;
                transition: all 0.2s;
            }
            
            .node-port:hover {
                transform: scale(1.3);
                background: #3b82f6;
            }
            
            .node-port.input {
                left: -6px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .node-port.output {
                right: -6px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .node-port.connected {
                background: #10b981;
            }
            
            .node-port.connecting {
                background: #f59e0b;
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1) translateY(-50%); }
                50% { transform: scale(1.3) translateY(-50%); }
            }
            
            .edge-path {
                fill: none;
                stroke-width: 2;
                pointer-events: stroke;
                cursor: pointer;
            }
            
            .edge-path:hover {
                stroke-width: 3;
            }
            
            .edge-path.preview {
                stroke: #f59e0b;
                stroke-dasharray: 5, 5;
                animation: dash 0.5s linear infinite;
                pointer-events: none;
            }
            
            @keyframes dash {
                to { stroke-dashoffset: -10; }
            }
            
            .node-handle {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                // height: 30px;
                cursor: move;
                // border-radius: 6px 6px 0 0;
            }
            
            .node-content {
                pointer-events: auto;
                position: relative;
            }
            
            .no-select {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Register default node types
     */
    registerDefaultNodeTypes() {
        // Default node type
        this.registerNodeType('default', {
            template: (node) => `
                <div class="node-handle"></div>
                <div class="node-content" style="padding: 16px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">
                        ${node.data.title || 'Node'}
                    </h3>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">
                        ${node.data.description || 'Default node'}
                    </p>
                </div>
            `,
            ports: ['input', 'output'],
            style: {
                minWidth: '200px'
            }
        });
        
        // Input node type
        // this.registerNodeType('input', {
        //     template: (node) => `
        //         <div class="node-handle" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
        //         <div class="node-content" style="padding: 16px;">
        //             <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">
        //                 ${node.data.title || 'Input'}
        //             </h3>
        //             <input type="text" 
        //                    style="width: 100%; padding: 4px 8px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 4px;"
        //                    placeholder="${node.data.placeholder || 'Enter value...'}"
        //                    value="${node.data.value || ''}"
        //                    oninput="this.dispatchEvent(new CustomEvent('nodeUpdate', {detail: {nodeId: '${node.id}', data: {value: this.value}}, bubbles: true}))">
        //         </div>
        //     `,
        //     ports: ['output'],
        //     style: {
        //         minWidth: '200px',
        //         borderColor: '#8b5cf6'
        //     }
        // });
    }
    
    /**
     * Register a custom node type
     * @param {string} type - Node type identifier
     * @param {Object} config - Node configuration
     */
    registerNodeType(type, config) {
        this.nodeTypes.set(type, {
            template: config.template || ((node) => `<div style="padding: 16px;">${type}</div>`),
            ports: config.ports || ['input', 'output'],
            style: config.style || {},
            onCreate: config.onCreate || (() => {}),
            onUpdate: config.onUpdate || (() => {}),
            onDelete: config.onDelete || (() => {}),
            onConnect: config.onConnect || (() => {}),
            onDisconnect: config.onDisconnect || (() => {})
        });
    }
    
    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Custom node update event
        this.canvas.addEventListener('nodeUpdate', (e) => {
            this.updateNodeData(e.detail.nodeId, e.detail.data);
        });
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    /**
     * Create a new node
     * @param {string} type - Node type
     * @param {Object} position - Position {x, y}
     * @param {Object} data - Node data
     * @returns {string} Node ID
     */
    createNode(type = 'default', position = {}, data = {}) {
        const nodeType = this.nodeTypes.get(type) || this.nodeTypes.get('default');
        const id = `node-${this.nodeIdCounter++}`;
        
        const node = {
            id,
            type,
            position: {
                x: position.x || Math.random() * 400 + 100,
                y: position.y || Math.random() * 300 + 100
            },
            data: {
                ...this.options.nodeDefaults,
                ...data
            },
            ports: {},
            element: null
        };
        
        // Store node
        this.nodes.set(id, node);
        
        // Initialize cache
        this.initNodeCache(id);

        // Render node
        this.renderNode(node);
        
        // Call onCreate lifecycle
        nodeType.onCreate(node, this);
        
        // Trigger callback
        this.triggerCallback('onNodeCreate', node);
        
        return id;
    }
    
    /**
     * Render a node to the DOM
     */
    renderNode(node) {
        const nodeType = this.nodeTypes.get(node.type) || this.nodeTypes.get('default');
        
        // Create node element
        const nodeEl = document.createElement('div');
        nodeEl.className = 'workflow-node';
        nodeEl.id = node.id;
        nodeEl.style.left = `${node.position.x}px`;
        nodeEl.style.top = `${node.position.y}px`;
        nodeEl.dataset.nodeId = node.id;
        
        // Apply custom styles
        if (nodeType.style) {
            Object.assign(nodeEl.style, nodeType.style);
        }
        
        // Set content
        nodeEl.innerHTML = nodeType.template(node);
        
        // Add ports
        this.addNodePorts(nodeEl, node, nodeType.ports);
        
        // Add to canvas
        this.canvas.appendChild(nodeEl);
        
        // Store element reference
        node.element = nodeEl;
    }
    
    /**
     * Add ports to a node element
     */
    addNodePorts(nodeEl, node, ports) {
        ports.forEach(portType => {
            const port = document.createElement('div');
            port.className = `node-port ${portType}`;
            port.dataset.portType = portType;
            port.dataset.nodeId = node.id;
            nodeEl.appendChild(port);
            
            // Store port reference
            node.ports[portType] = port;
        });
    }
    
    /**
     * Update node data
     */
    updateNodeData(nodeId, data) {
        console.log('UPDATING NODE DATA (WF Editor):', nodeId, data);

        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        // Update data
        Object.assign(node.data, data);
        
        // Re-render node
        const oldElement = node.element;
        this.renderNode(node);
        oldElement.remove();
        
        // Update edges
        this.scheduleEdgeUpdate(nodeId);
        
        // Get node type
        const nodeType = this.nodeTypes.get(node.type) || this.nodeTypes.get('default');
        
        // Call onUpdate lifecycle
        nodeType.onUpdate(node, data);
        
        // Trigger callback
        this.triggerCallback('onNodeUpdate', node, data);
    }
    
    /**
     * Delete a node
     */
    deleteNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        // Get node type
        const nodeType = this.nodeTypes.get(node.type) || this.nodeTypes.get('default');
        
        // Remove connected edges
        const connectedEdges = Array.from(this.edges.values()).filter(
            edge => edge.source === nodeId || edge.target === nodeId
        );
        connectedEdges.forEach(edge => this.deleteEdge(edge.id));
        
        // Remove element
        if (node.element) {
            node.element.remove();
        }
        
        // Remove from selection
        this.selectedNodes.delete(nodeId);
        
        // Cleanup cache
        this.cleanupNodeCache(nodeId);

        // Remove from map
        this.nodes.delete(nodeId);
        
        // Call onDelete lifecycle
        nodeType.onDelete(node);
        
        // Trigger callback
        this.triggerCallback('onNodeDelete', node);
    }
    
    /**
     * Create an edge between two nodes
     */
    createEdge(sourceId, targetId, options = {}) {
        // Validate nodes exist
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            console.error('SwanEditor: Invalid source or target node');
            return null;
        }
        
        // Check for duplicate edges
        const existingEdge = Array.from(this.edges.values()).find(
            edge => edge.source === sourceId && edge.target === targetId
        );
        if (existingEdge) {
            console.warn('SwanEditor: Edge already exists');
            return existingEdge.id;
        }
        
        const id = `edge-${this.edgeIdCounter++}`;
        const edge = {
            id,
            source: sourceId,
            target: targetId,
            style: {
                ...this.options.edgeStyle,
                ...options.style
            },
            data: options.data || {},
            element: null
        };
        
        // Store edge
        this.edges.set(id, edge);

        // Render edge
        this.renderEdge(edge);

        // Update port states
        this.updatePortStates();
        
        // Update cache
        this.updateCacheOnEdgeCreate(edge);
        
        // Call lifecycle hooks
        const sourceNode = this.nodes.get(sourceId);
        const targetNode = this.nodes.get(targetId);
        const sourceType = this.nodeTypes.get(sourceNode.type);
        const targetType = this.nodeTypes.get(targetNode.type);
        
        if (sourceType.onConnect) sourceType.onConnect(sourceNode, targetNode, edge);
        if (targetType.onConnect) targetType.onConnect(targetNode, sourceNode, edge);
        
        // Trigger callback
        this.triggerCallback('onEdgeCreate', edge);
        
        return id;
    }
    
    /**
     * Render an edge
     */
    renderEdge(edge) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.id = edge.id;
        path.setAttribute('class', 'edge-path');
        path.setAttribute('marker-end', 'url(#wf-arrowhead)');
        
        // Apply custom styles
        if (edge.style) {
            if (edge.style.color) path.style.stroke = edge.style.color;
            if (edge.style.width) path.style.strokeWidth = edge.style.width;
            if (edge.style.dashed) path.style.strokeDasharray = '5, 5';
            if (edge.style.animated) {
                path.style.animation = 'dash 0.5s linear infinite';
            }
        }
        
        // Add click handler for edge selection/deletion
        path.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectEdge(edge.id);
        });
        
        // Store element reference
        edge.element = path;
        
        // Add to SVG
        this.svg.appendChild(path);
        
        // Update path
        this.updateEdgePath(edge);
    }
    
    /**
     * Update edge path based on node positions
     */
    updateEdgePath(edge) {
        const sourceNode = this.nodes.get(edge.source);
        const targetNode = this.nodes.get(edge.target);
        
        if (!sourceNode || !targetNode || !edge.element) return;
        
        // Get port positions
        const sourcePort = sourceNode.ports.output || sourceNode.element.querySelector('.node-port.output');
        const targetPort = targetNode.ports.input || targetNode.element.querySelector('.node-port.input');
        
        if (!sourcePort || !targetPort) return;
        
        const sourceRect = sourcePort.getBoundingClientRect();
        const targetRect = targetPort.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Calculate positions relative to canvas
        const x1 = sourceRect.left - canvasRect.left + sourceRect.width / 2 + this.canvas.scrollLeft;
        const y1 = sourceRect.top - canvasRect.top + sourceRect.height / 2 + this.canvas.scrollTop;
        const x2 = targetRect.left - canvasRect.left + targetRect.width / 2 + this.canvas.scrollLeft;
        const y2 = targetRect.top - canvasRect.top + targetRect.height / 2 + this.canvas.scrollTop;
        
        // Create smooth bezier curve
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curvature = Math.min(distance * 0.5, 100);
        
        const ctrl1x = x1 + curvature;
        const ctrl1y = y1;
        const ctrl2x = x2 - curvature;
        const ctrl2y = y2;
        
        const d = `M ${x1} ${y1} C ${ctrl1x} ${ctrl1y}, ${ctrl2x} ${ctrl2y}, ${x2} ${y2}`;
        edge.element.setAttribute('d', d);
    }
    
    /**
     * Schedule edge updates with RAF for performance
     */
    scheduleEdgeUpdate(nodeId) {
        // Add to update queue
        this.updateQueue.add(nodeId);
        
        // Schedule update if not already scheduled
        if (!this.rafId) {
            this.rafId = requestAnimationFrame(() => {
                this.processUpdateQueue();
            });
        }
    }
    
    /**
     * Process queued edge updates
     */
    processUpdateQueue() {
        this.updateQueue.forEach(nodeId => {
            this.edges.forEach(edge => {
                if (edge.source === nodeId || edge.target === nodeId) {
                    this.updateEdgePath(edge);
                }
            });
        });
        
        this.updateQueue.clear();
        this.rafId = null;
    }
    
    /**
     * Delete an edge
     */
    deleteEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return;
        
        // Update cache before deletion
        this.updateCacheOnEdgeDelete(edge);
        
        // Call onDisconnect lifecycle for both nodes
        const sourceNode = this.nodes.get(edge.source);
        const targetNode = this.nodes.get(edge.target);
        if (sourceNode && targetNode) {
            const sourceType = this.nodeTypes.get(sourceNode.type);
            const targetType = this.nodeTypes.get(targetNode.type);
            
            if (sourceType.onDisconnect) sourceType.onDisconnect(sourceNode, targetNode, edge);
            if (targetType.onDisconnect) targetType.onDisconnect(targetNode, sourceNode, edge);
        }
        
        // Remove element
        if (edge.element) {
            edge.element.remove();
        }
        
        // Remove from map
        this.edges.delete(edgeId);
        
        // Update port states
        this.updatePortStates();
        
        // Trigger callback
        this.triggerCallback('onEdgeDelete', edge);
    }
    
    /**
     * Update port connection states
     */
    updatePortStates() {
        // Reset all ports
        this.canvas.querySelectorAll('.node-port').forEach(port => {
            port.classList.remove('connected');
        });
        
        // Mark connected ports
        this.edges.forEach(edge => {
            const sourceNode = this.nodes.get(edge.source);
            const targetNode = this.nodes.get(edge.target);
            
            if (sourceNode && sourceNode.ports.output) {
                sourceNode.ports.output.classList.add('connected');
            }
            
            if (targetNode && targetNode.ports.input) {
                targetNode.ports.input.classList.add('connected');
            }
        });
    }

    /**
        * Get all the nodes connected to a specific node
        * @param {Object} node - The node object to find connections for
        * @returns {Array} - Array of connected node objects
    */
    getConnectedNodes(nodeId, direction = '') {
        const connectionData = this.getConnectionDataCached(nodeId);
        
        if (direction === 'input') {
            return { inputs: connectionData.inputs, outputs: [] };
        } else if (direction === 'output') {
            return { inputs: [], outputs: connectionData.outputs };
        }
        
        return {
            inputs: connectionData.inputs,
            outputs: connectionData.outputs
        };
    }

    /**
     * Clean up cache when node is deleted
     * Call this in deleteNode() before this.nodes.delete(nodeId)
     */
    cleanupNodeCache(nodeId) {
        this.connectionCache.delete(nodeId);
        this.dirtyNodes.delete(nodeId);
    }

    /**
     * Validate and repair cache (call periodically or on load)
     */
    validateCache() {
        let issues = 0;
        
        // Rebuild cache from edges
        const newCache = new Map();
        
        this.nodes.forEach((node, nodeId) => {
            newCache.set(nodeId, {
                inputs: new Set(),
                outputs: new Set()
            });
        });
        
        this.edges.forEach(edge => {
            if (newCache.has(edge.source) && newCache.has(edge.target)) {
                newCache.get(edge.source).outputs.add(edge.id);
                newCache.get(edge.target).inputs.add(edge.id);
            }
        });
        
        // Compare with current cache
        newCache.forEach((data, nodeId) => {
            const current = this.connectionCache.get(nodeId);
            if (!current || 
                data.inputs.size !== current.inputs.size || 
                data.outputs.size !== current.outputs.size) {
                issues++;
            }
        });
        
        if (issues > 0) {
            console.warn(`SwanEditor: Cache validation found ${issues} issues, rebuilding...`);
            this.connectionCache = newCache;
        }
        
    return issues;
}


    /**
     * Initialize connection cache for a node
     */
    initNodeCache(nodeId) {
        if (!this.connectionCache.has(nodeId)) {
            this.connectionCache.set(nodeId, {
                inputs: new Set(),   // Set of edge IDs
                outputs: new Set()   // Set of edge IDs
            });
        }
    }

    /**
     * Update connection cache when edge is created
     * Call this in createEdge() after this.edges.set(id, edge)
     */
    updateCacheOnEdgeCreate(edge) {
        // Initialize cache if needed
        this.initNodeCache(edge.source);
        this.initNodeCache(edge.target);
        
        // Update cache
        this.connectionCache.get(edge.source).outputs.add(edge.id);
        this.connectionCache.get(edge.target).inputs.add(edge.id);
        
        // Mark nodes as dirty for batch re-render
        this.dirtyNodes.add(edge.source);
        this.dirtyNodes.add(edge.target);
        
        // Schedule batch update
        this.scheduleBatchUpdate();
    }

    /**
     * Update connection cache when edge is deleted
     * Call this in deleteEdge() before this.edges.delete(edgeId)
     */
    updateCacheOnEdgeDelete(edge) {
        const sourceCache = this.connectionCache.get(edge.source);
        const targetCache = this.connectionCache.get(edge.target);
        
        if (sourceCache) sourceCache.outputs.delete(edge.id);
        if (targetCache) targetCache.inputs.delete(edge.id);
        
        // Mark nodes as dirty
        this.dirtyNodes.add(edge.source);
        this.dirtyNodes.add(edge.target);
        
        // Schedule batch update
        this.scheduleBatchUpdate();
    }

    /**
     * Batch update dirty nodes (debounced for performance)
     */
    scheduleBatchUpdate() {
        if (this.batchUpdateTimer) {
            clearTimeout(this.batchUpdateTimer);
        }
        
        this.batchUpdateTimer = setTimeout(() => {
            this.processDirtyNodes();
        }, 16); // ~60fps
    }

    /**
     * Process all dirty nodes in one batch
     */
    processDirtyNodes() {
        if (this.dirtyNodes.size === 0) return;
        
        // Process all dirty nodes
        this.dirtyNodes.forEach(nodeId => {
            const node = this.nodes.get(nodeId);
            if (node) {
                // Update connection data
                node._connectionData = this.getConnectionDataCached(nodeId);
                
                // Re-render only if node has connection-aware template
                const nodeType = this.nodeTypes.get(node.type);
                if (nodeType && nodeType.onConnectionChange) {
                    nodeType.onConnectionChange(node, node._connectionData);
                }
                
                // Re-render node
                const oldElement = node.element;
                this.renderNode(node);
                oldElement.remove();
                
                // Update edges
                this.scheduleEdgeUpdate(nodeId);
            }
        });
        
        this.dirtyNodes.clear();
        this.batchUpdateTimer = null;
    }

    /**
     * Get connection data using cache (O(1) lookup)
     */
    getConnectionDataCached(nodeId) {
        const cache = this.connectionCache.get(nodeId);
        if (!cache) {
            return { inputs: [], outputs: [], inputCount: 0, outputCount: 0 };
        }
        
        const inputs = [];
        const outputs = [];
        
        // Convert edge IDs to node data
        cache.inputs.forEach(edgeId => {
            const edge = this.edges.get(edgeId);
            if (edge) {
                const sourceNode = this.nodes.get(edge.source);
                if (sourceNode) {
                    inputs.push({
                        id: sourceNode.id,
                        type: sourceNode.type,
                        data: sourceNode.data,
                        edgeId: edge.id
                    });
                }
            }
        });
        
        cache.outputs.forEach(edgeId => {
            const edge = this.edges.get(edgeId);
            if (edge) {
                const targetNode = this.nodes.get(edge.target);
                if (targetNode) {
                    outputs.push({
                        id: targetNode.id,
                        type: targetNode.type,
                        data: targetNode.data,
                        edgeId: edge.id
                    });
                }
            }
        });
        
        return {
            inputs,
            outputs,
            inputCount: inputs.length,
            outputCount: outputs.length
        };
    }

    /**
     * Handle mouse down event
     */
    handleMouseDown(e) {
        const target = e.target;
        
        // Check if clicking on a port
        if (target.classList.contains('node-port')) {
            this.startConnection(e, target);
            return;
        }
        
        // Check if clicking on node handle or draggable area
        const nodeEl = target.closest('.workflow-node');
        if (nodeEl) {
            // Check if target is interactive element
            const isInteractive = target.matches('input, select, textarea, button') || target.closest('input, select, textarea, button');
            
            if (!isInteractive || target.classList.contains('node-handle')) {
                this.startDrag(e, nodeEl);
            }
            return;
        }
        
        // Clear selection if clicking on canvas
        if (target === this.canvas || target === this.svg) {
            this.clearSelection();
        }
    }
    
    /**
     * Start dragging a node
     */
    startDrag(e, nodeEl) {
        const nodeId = nodeEl.dataset.nodeId;
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        // Prevent text selection
        document.body.classList.add('no-select');
        
        // Calculate offset
        const rect = nodeEl.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        this.dragState = {
            nodes: this.selectedNodes.has(nodeId) ? Array.from(this.selectedNodes) : [nodeId],
            primary: node,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            startPositions: new Map()
        };
        
        // Store start positions for all dragged nodes
        this.dragState.nodes.forEach(id => {
            const n = this.nodes.get(id);
            if (n) {
                this.dragState.startPositions.set(id, {
                    x: n.position.x,
                    y: n.position.y
                });
                n.element.classList.add('dragging');
            }
        });
        
        // Select node if not already selected
        if (!this.selectedNodes.has(nodeId)) {
            this.selectNode(nodeId, e.ctrlKey || e.metaKey);
        }
        
        e.preventDefault();
    }
    
    /**
     * Start creating a connection
     */
    startConnection(e, portEl) {
        const nodeId = portEl.dataset.nodeId;
        const portType = portEl.dataset.portType;
        
        this.connectionState = {
            sourceNodeId: nodeId,
            sourcePortType: portType,
            previewPath: null
        };
        
        // Add connecting class
        portEl.classList.add('connecting');
        
        // Create preview path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'edge-path preview');
        this.svg.appendChild(path);
        this.connectionState.previewPath = path;
        
        e.preventDefault();
        e.stopPropagation();
    }
    
    /**
     * Handle mouse move event
     */
    handleMouseMove(e) {
        // Handle node dragging
        if (this.dragState) {
            this.updateDrag(e);
        }
        
        // Handle connection preview
        if (this.connectionState) {
            this.updateConnectionPreview(e);
        }
    }
    
    /**
     * Update node position during drag
     */
    updateDrag(e) {
        if (!this.dragState) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Calculate primary node delta
        const deltaX = e.clientX - canvasRect.left - this.dragState.offsetX + this.canvas.scrollLeft - this.dragState.startPositions.get(this.dragState.primary.id).x;
        const deltaY = e.clientY - canvasRect.top - this.dragState.offsetY + this.canvas.scrollTop - this.dragState.startPositions.get(this.dragState.primary.id).y;
        
        // Update all selected nodes
        this.dragState.nodes.forEach(nodeId => {
            const node = this.nodes.get(nodeId);
            if (!node) return;
            
            const startPos = this.dragState.startPositions.get(nodeId);
            let x = startPos.x + deltaX;
            let y = startPos.y + deltaY;
            
            // Apply grid snapping
            if (this.options.gridSize > 1) {
                x = Math.round(x / this.options.gridSize) * this.options.gridSize;
                y = Math.round(y / this.options.gridSize) * this.options.gridSize;
            }
            
            // Constrain to canvas bounds
            x = Math.max(0, x);
            y = Math.max(0, y);
            
            // Update position
            node.position.x = x;
            node.position.y = y;
            node.element.style.left = `${x}px`;
            node.element.style.top = `${y}px`;
            
            // Schedule edge updates
            this.scheduleEdgeUpdate(nodeId);
        });
    }
    
    /**
     * Update connection preview
     */
    updateConnectionPreview(e) {
        if (!this.connectionState || !this.connectionState.previewPath) return;
        
        const sourceNode = this.nodes.get(this.connectionState.sourceNodeId);
        if (!sourceNode) return;
        
        const sourcePort = sourceNode.ports[this.connectionState.sourcePortType];
        if (!sourcePort) return;
        
        const sourceRect = sourcePort.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Calculate positions
        const x1 = sourceRect.left - canvasRect.left + sourceRect.width / 2 + this.canvas.scrollLeft;
        const y1 = sourceRect.top - canvasRect.top + sourceRect.height / 2 + this.canvas.scrollTop;
        const x2 = e.clientX - canvasRect.left + this.canvas.scrollLeft;
        const y2 = e.clientY - canvasRect.top + this.canvas.scrollTop;
        
        // Create bezier curve
        const dx = x2 - x1;
        const curvature = Math.abs(dx) * 0.5;
        const ctrl1x = x1 + curvature;
        const ctrl2x = x2 - curvature;
        
        const d = `M ${x1} ${y1} C ${ctrl1x} ${y1}, ${ctrl2x} ${y2}, ${x2} ${y2}`;
        this.connectionState.previewPath.setAttribute('d', d);
    }
    
    /**
     * Handle mouse up event
     */
    handleMouseUp(e) {
        // End dragging
        if (this.dragState) {
            this.endDrag();
        }
        
        // End connection
        if (this.connectionState) {
            this.endConnection(e);
        }
    }
    
    /**
     * End node dragging
     */
    endDrag() {
        if (!this.dragState) return;
        
        // Remove dragging class
        this.dragState.nodes.forEach(nodeId => {
            const node = this.nodes.get(nodeId);
            if (node && node.element) {
                node.element.classList.remove('dragging');
            }
        });
        
        // Re-enable text selection
        document.body.classList.remove('no-select');
        
        // Trigger callbacks for moved nodes
        this.dragState.nodes.forEach(nodeId => {
            const node = this.nodes.get(nodeId);
            const startPos = this.dragState.startPositions.get(nodeId);
            if (node && (startPos.x !== node.position.x || startPos.y !== node.position.y)) {
                this.triggerCallback('onNodeMove', node);
            }
        });
        
        // Clear drag state
        this.dragState = null;
    }
    
    /**
     * End connection creation
     */
    endConnection(e) {
        if (!this.connectionState) return;
        
        // Check if over valid target port
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.classList.contains('node-port')) {
            const targetNodeId = target.dataset.nodeId;
            const targetPortType = target.dataset.portType;
            
            // Validate connection
            if (this.validateConnection(
                this.connectionState.sourceNodeId,
                this.connectionState.sourcePortType,
                targetNodeId,
                targetPortType
            )) {
                // Create edge (output -> input)
                if (this.connectionState.sourcePortType === 'output') {
                    this.createEdge(this.connectionState.sourceNodeId, targetNodeId);
                } else {
                    this.createEdge(targetNodeId, this.connectionState.sourceNodeId);
                }
            }
        }
        
        // Clean up
        if (this.connectionState.previewPath) {
            this.connectionState.previewPath.remove();
        }
        
        this.canvas.querySelectorAll('.node-port.connecting').forEach(port => {
            port.classList.remove('connecting');
        });
        
        this.connectionState = null;
    }
    
    /**
     * Validate a potential connection
     */
    validateConnection(sourceNodeId, sourcePortType, targetNodeId, targetPortType) {
        // Can't connect to same node
        if (sourceNodeId === targetNodeId) return false;
        
        // Can't connect same port types
        if (sourcePortType === targetPortType) return false;
        
        // Check for existing connection
        const existingEdge = Array.from(this.edges.values()).find(edge => {
            return (edge.source === sourceNodeId && edge.target === targetNodeId) ||
                   (edge.source === targetNodeId && edge.target === sourceNodeId);
        });
        
        return !existingEdge;
    }
    
    /**
     * Handle touch events for mobile support
     */
    handleTouchStart(e) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }
    
    handleTouchMove(e) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        const mouseEvent = new MouseEvent('mouseup');
        this.handleMouseUp(mouseEvent);
    }
    
    /**
     * Handle keyboard events
     */
    handleKeyDown(e) {
        // Delete selected nodes/edges
        if (e.key === 'Delete') {
            e.preventDefault();
            this.deleteSelected();
        }
        
        // Select all
        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.selectAll();
        }
        
        // Clear selection
        if (e.key === 'Escape') {
            this.clearSelection();
        }
        
        // Copy
        if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.copySelected();
        }
        
        // Paste
        if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.paste();
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Update all edge paths after resize
        this.edges.forEach(edge => this.updateEdgePath(edge));
    }
    
    /**
     * Select a node
     */
    selectNode(nodeId, multi = false) {
        if (!multi) {
            this.clearSelection();
        }
        
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        node.element.classList.add('selected');
        this.selectedNodes.add(nodeId);
        
        this.triggerCallback('onNodeSelect', node);
    }
    
    /**
     * Select an edge
     */
    selectEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return;
        
        if (confirm('Delete this connection?')) {
            this.deleteEdge(edgeId);
        }
    }
    
    /**
     * Select all nodes
     */
    selectAll() {
        this.nodes.forEach((node, id) => {
            node.element.classList.add('selected');
            this.selectedNodes.add(id);
        });
    }
    
    /**
     * Clear selection
     */
    clearSelection() {
        this.canvas.querySelectorAll('.workflow-node.selected').forEach(el => {
            el.classList.remove('selected');
        });
        this.selectedNodes.clear();
    }
    
    /**
     * Delete selected nodes
     */
    deleteSelected() {
        const nodesToDelete = Array.from(this.selectedNodes);
        nodesToDelete.forEach(nodeId => this.deleteNode(nodeId));
        this.clearSelection();
    }
    
    /**
     * Copy selected nodes
     */
    copySelected() {
        this.clipboard = {
            nodes: Array.from(this.selectedNodes).map(id => {
                const node = this.nodes.get(id);
                return {
                    type: node.type,
                    data: { ...node.data },
                    position: { ...node.position }
                };
            }),
            edges: Array.from(this.edges.values()).filter(edge => 
                this.selectedNodes.has(edge.source) && this.selectedNodes.has(edge.target)
            )
        };
    }
    
    /**
     * Paste copied nodes
     */
    paste() {
        if (!this.clipboard || !this.clipboard.nodes.length) return;
        
        const offset = 50;
        const idMap = new Map();
        
        // Clear selection
        this.clearSelection();
        
        // Create new nodes
        this.clipboard.nodes.forEach(nodeData => {
            const newId = this.createNode(
                nodeData.type,
                {
                    x: nodeData.position.x + offset,
                    y: nodeData.position.y + offset
                },
                nodeData.data
            );
            idMap.set(nodeData, newId);
            this.selectNode(newId, true);
        });
    }
    
    /**
     * Trigger a callback
     */
    triggerCallback(name, ...args) {
        if (this.options.callbacks[name]) {
            this.options.callbacks[name](...args);
        }
    }
    
    /**
     * Get workflow data
     */
    getWorkflowData() {
        return {
            nodes: Array.from(this.nodes.values()).map(node => ({
                id: node.id,
                type: node.type,
                position: { ...node.position },
                data: { ...node.data }
            })),
            edges: Array.from(this.edges.values()).map(edge => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                style: { ...edge.style },
                data: { ...edge.data }
            }))
        };
    }
    
    /**
     * Load workflow data
     */
    loadWorkflowData(data) {
        // Clear existing
        this.clear();
        
        // Map old IDs to new IDs
        const idMap = new Map();
        
        // Create nodes
        if (data.nodes) {
            data.nodes.forEach(nodeData => {
                const newId = this.createNode(
                    nodeData.type,
                    nodeData.position,
                    nodeData.data
                );
                idMap.set(nodeData.id, newId);
            });
        }
        
        // Create edges
        if (data.edges) {
            data.edges.forEach(edgeData => {
                const sourceId = idMap.get(edgeData.source);
                const targetId = idMap.get(edgeData.target);
                if (sourceId && targetId) {
                    this.createEdge(sourceId, targetId, {
                        style: edgeData.style,
                        data: edgeData.data
                    });
                }
            });
        }
    }
    
    /**
     * Clear the workflow
     */
    clear() {
        // Delete all nodes
        Array.from(this.nodes.keys()).forEach(id => this.deleteNode(id));
        
        // Reset counters
        this.nodeIdCounter = 1;
        this.edgeIdCounter = 1;
        
        // Clear selection
        this.clearSelection();
    }
    
    /**
     * Export as JSON
     */
    exportJSON() {
        return JSON.stringify(this.getWorkflowData(), null, 2);
    }
    
    /**
     * Import from JSON
     */
    importJSON(json) {
        try {
            const data = JSON.parse(json);
            this.loadWorkflowData(data);
            return true;
        } catch (error) {
            console.error('SwanEditor: Failed to import JSON', error);
            return false;
        }
    }
    
    /**
     * Center the view on all nodes
     */
    centerView() {
        if (this.nodes.size === 0) return;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        this.nodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + 200);
            maxY = Math.max(maxY, node.position.y + 100);
        });
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;
        
        this.canvas.scrollLeft = centerX - canvasWidth / 2;
        this.canvas.scrollTop = centerY - canvasHeight / 2;
    }
    
    /**
     * Destroy the editor
     */
    destroy() {
        // Remove event listeners
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('resize', this.handleResize);
        
        // Cancel any pending updates
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        // Clear container
        this.container.innerHTML = '';
        
        // Clear references
        this.nodes.clear();
        this.edges.clear();
        this.selectedNodes.clear();
        this.nodeTypes.clear();
        this.canvas = null;
        this.svg = null;
    }
}