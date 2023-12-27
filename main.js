const {app, BrowserWindow, ipcMain} = require('electron');
const fs = require('fs');
const path = require('path');

function createWindow() {
    // 新しいウィンドウを作成
    let win = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Electron 12からはtrueにして、preloadスクリプトを使うのが推奨されているけど、ここでは簡単にするためにfalseにしているよ
        }
    });

    // index.htmlをロード
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// ToDoデータのファイルパス
const DATA_PATH = path.join(app.getPath('userData'), 'todos.json');

// ToDoリストの保存処理
ipcMain.on('save-todos', (event, todos) => {
    fs.writeFileSync(DATA_PATH, JSON.stringify(todos, null, 2), 'utf-8');
});

// ToDoリストの読み込み処理
ipcMain.on('load-todos', (event) => {
    if (!fs.existsSync(DATA_PATH)) {
        event.returnValue = '[]';
        return;
    }
    const data = fs.readFileSync(DATA_PATH, 'utf-8');
    event.returnValue = data;
});
