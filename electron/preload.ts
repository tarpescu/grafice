// --------- Preload scripts loading ---------
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // You can expose APIs here
})
