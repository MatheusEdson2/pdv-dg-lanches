const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashAPI', {
  pronto: () => ipcRenderer.send('splash:pronto'),
});