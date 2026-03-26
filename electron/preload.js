const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clearalert', {
  // Send a file path to the Python ML engine for processing
  processFile: (filePath) => ipcRenderer.invoke('process-file', filePath),

  // Open native file dialog and return the selected path
  selectFile: () => ipcRenderer.invoke('select-file'),

  // Get app metadata
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Listen for responses from the Python sidecar
  onPythonResponse: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('python-response', handler);
    return () => ipcRenderer.removeListener('python-response', handler);
  },

  // Listen for Python process errors
  onPythonError: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('python-error', handler);
    return () => ipcRenderer.removeListener('python-error', handler);
  },
});
