const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#0a0e1a',
    show: false,
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: {
      color: '#0a0e1a',
      symbolColor: '#94a3b8',
      height: 38,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function getPythonCommand() {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    let pythonExe = process.platform === 'win32' ? 'py' : 'python3';
    let scriptPath = path.join(__dirname, '..', 'python', 'main.py');
    return { command: pythonExe, args: [scriptPath] };
  } else {
    const exePath = path.join(process.resourcesPath, 'python_backend', 'main.exe');
    return { command: exePath, args: [] };
  }
}

function spawnPython() {
  const { command, args } = getPythonCommand();

  try {
    pythonProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: '1' },
    });

    let buffer = '';
    pythonProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('python-response', response);
            }
          } catch (e) {
            console.error('Failed to parse Python response:', line);
          }
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python stderr:', data.toString());
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err.message);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('python-error', {
          message: 'Failed to start ML engine: ' + err.message,
        });
      }
    });

    pythonProcess.on('close', (code) => {
      console.log('Python process exited with code:', code);
    });
  } catch (err) {
    console.error('Error spawning Python:', err);
  }
}

function sendToPython(message) {
  if (pythonProcess && !pythonProcess.killed) {
    pythonProcess.stdin.write(JSON.stringify(message) + '\n');
  }
}

// ─── IPC Handlers ──────────────────────────────────

ipcMain.handle('process-file', async (_event, filePath) => {
  const requestId = Date.now().toString();
  sendToPython({
    action: 'process_file',
    filepath: filePath,
    request_id: requestId,
  });
  return { request_id: requestId };
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Data Files', extensions: ['csv', 'xlsx', 'xls'] },
    ],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-app-info', async () => {
  return {
    name: 'ClearAlert',
    version: app.getVersion(),
    platform: process.platform,
  };
});

// ─── App Lifecycle ─────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  spawnPython();
});

app.on('window-all-closed', () => {
  if (pythonProcess && !pythonProcess.killed) pythonProcess.kill();
  app.quit();
});

app.on('before-quit', () => {
  if (pythonProcess && !pythonProcess.killed) pythonProcess.kill();
});

// Security: block navigation and new windows
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event) => event.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
