const {ipcRenderer} = require('electron');

function saveToDoList() {
    const todos = Array.from(
        document.querySelectorAll('#todo-list li')
    ).map(
        li => li.querySelector('label').textContent
    );
    ipcRenderer.send('save-todos', todos);
}

function loadToDoList() {
    const todos = JSON.parse(ipcRenderer.sendSync('load-todos'));
    todos.forEach(todoText => {
        addTask(todoText);
    });
}

function addTask(text) {
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');

    // テキストが空の場合は追加しない
    if (!text && !todoInput.value.trim()) return;
    const todoText = text || todoInput.value;

    // ToDoのリストアイテムを作成
    const li = document.createElement('li');

    const title = document.createElement('label');
    title.textContent = todoText;
    const startButton = document.createElement('button');
    startButton.textContent = '開始';
    const stopButton = document.createElement('button');
    stopButton.textContent = '停止';
    stopButton.disabled = true;
    const timeDisplay = document.createElement('label');
    timeDisplay.textContent = '--';
    const completeBtn = document.createElement('button');
    completeBtn.textContent = '完了';

    let startTime;

    startButton.addEventListener('click', () => {
        startTime = Date.now();
        startButton.disabled = true;
        stopButton.disabled = false;
    });

    stopButton.addEventListener('click', () => {
        const endTime = Date.now();
        elapsedTime = (endTime - startTime) / 1000; // ミリ秒を秒に変換

        timeDisplay.textContent = elapsedTime;
        stopButton.disabled = true;
        startButton.disabled = false;
        saveToDoList();
    });

    completeBtn.addEventListener('click', () => {
        todoList.removeChild(li);
        saveToDoList();
    });

    // リストアイテムへのボタンの追加
    li.appendChild(title);
    li.appendChild(startButton);
    li.appendChild(stopButton);
    li.appendChild(timeDisplay);
    li.appendChild(completeBtn);
    todoList.appendChild(li);

    // 入力フィールドのクリア
    todoInput.value = '';

    saveToDoList();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-task-btn').addEventListener('click', () => addTask());
    loadToDoList();
});
