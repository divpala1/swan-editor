# SwanEditor
A lightweight, modular, and extensible workflow-editor framework for building node-based interfaces in the browser.

SwanEditor provides draggable nodes, smooth bezier edges, custom node types, ports, event callbacks, connection handling, JSON import/export, and a fully customizable rendering layer — all without external dependencies.

---

## ✨ Features
- Node-based workflow editor
- Drag, move, copy, paste nodes
- Smooth, dynamic bezier edges
- Input/output ports with connection rules
- Custom node types with templates, styles & lifecycle hooks
- JSON import/export for saving workflows
- Built-in zoom/pan support
- Pure JS — no frameworks required

---

## 📦 Installation

### Option 1: Direct `<script>` import
```html
<script type="module">
    import SwanEditor from './SwanEditor.js';
</script>
```

### Option 2: ES module bundlers
```js
import SwanEditor from './SwanEditor.js';
```

## 🚀 Quick Usage
```html
<div id="editor"></div>

<script type="module">
    import SwanEditor from './SwanEditor.js';

    const editor = new SwanEditor('#editor', {
        canvas: { height: '600px' },
        callbacks: {
            onNodeCreate(node) { console.log("Node created:", node); }
        }
    });

    // Create a default node
    editor.createNode('default', { x: 200, y: 150 }, { title: "My Node" });
</script>
```

For more detailed usage examples, refer to the `module_usage.js` file included in this repository.

---