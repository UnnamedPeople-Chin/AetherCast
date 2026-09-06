const { app, BrowserWindow } = require('electron');
const path = require('path');

// Safe GPU Acceleration Flags & Disk Cache Fix
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        title: 'AetherCast - Hand Tracking Sandbox',
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
