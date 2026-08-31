const { app, BrowserWindow } = require('electron');
const path = require('path');

// Hardware Acceleration GPU Flags (Smooth 60-144 FPS VSync Match)
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-hardware-overlays');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        title: 'Air Magic - Hand Tracking Sandbox',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
