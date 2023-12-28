const {ipcRenderer} = require('electron');

let todos = [];

function _saveToDoList(todos) {
    ipcRenderer.invoke('save-todos', todos);
}

function loadToDoList() {
    todos = JSON.parse(ipcRenderer.sendSync('load-todos'));
    for (let todo of todos) {
        _updateUI(todo);
    }
}


function addOneTask(todo) {
    const todoList = document.getElementById('todo-list');

    // ToDoのリストアイテムを作成
    const li = document.createElement('li');

    const title = document.createElement('label');
    title.textContent = todo.text;
    const startButton = document.createElement('button');
    startButton.textContent = '開始';
    const stopButton = document.createElement('button');
    stopButton.textContent = '停止';
    stopButton.disabled = true;
    const timeDisplay = document.createElement('label');
    if (todo.endTime && todo.startTime) {
        timeDisplay.textContent = (todo.endTime - todo.startTime) / 1000;
    } else {
        timeDisplay.textContent = '--';
    }
    const completeBtn = document.createElement('button');
    completeBtn.textContent = '完了';

    startButton.addEventListener('click', () => {
        todo.startTime = Date.now().toString();
        _saveToDoList(todos)
        startButton.disabled = true;
        stopButton.disabled = false;
    });

    stopButton.addEventListener('click', () => {
        todo.endTime = Date.now();
        _saveToDoList(todos)
        timeDisplay.textContent = (todo.endTime - todo.startTime) / 1000;
        stopButton.disabled = true;
        startButton.disabled = false;
    });

    completeBtn.addEventListener('click', () => {
        todoList.removeChild(li);
    });

    // リストアイテムへのボタンの追加
    li.appendChild(title);
    li.appendChild(startButton);
    li.appendChild(stopButton);
    li.appendChild(timeDisplay);
    li.appendChild(completeBtn);
    todoList.appendChild(li);
}

function _isExists() {
    return false
    //return todoList.querySelector('#' + id) ? true : false;
}

function _updateUI(todo) {
    if (_isExists()) {
        // 未実装
    } else {
        // 新しいtodoを追加
        addOneTask(todo);
    }
}

function addTask(todoInput) {
    // ToDoアイテムをグローバル変数に追加
    const newTodo = {
        id: Date.now().toString(),
        text: todoInput.value,
        startTime: null,
        endTime: null,
    };
    todos.push(newTodo);
    _saveToDoList(todos); // データを保存
    _updateUI(newTodo); // UIをアップデート
    todoInput.value = ''; // 入力フィールドのクリア
}

document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    loadToDoList();
    document.getElementById('add-task-btn').addEventListener('click', () => addTask(todoInput));
});
