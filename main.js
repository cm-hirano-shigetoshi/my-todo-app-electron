const {app, BrowserWindow, ipcMain} = require('electron');
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

const expressApp = express();
expressApp.use(bodyParser.json());

let win;

function createWindow() {
    // 新しいウィンドウを作成
    win = new BrowserWindow({
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

// ToDoリストの非同期保存処理
ipcMain.handle('save-todos', async (event, todos) => {
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

expressApp.post('/add-task', (req, res) => {
    const task = req.body;
    win.webContents.send('add-task', task);
    res.status(200).send('Task added successfully');
});

expressApp.post('/dakoku', (req, res) => {
    win.webContents.send('dakoku', null);
    res.status(200).send('Dakoku successfully');
});

// 3000番ポートでサーバーを起動
expressApp.listen(3000, () => {
    console.log('Express server listening on port 3000');
});
