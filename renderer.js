const {ipcRenderer} = require('electron');

let todos = [];

function saveToDoList() {
    ipcRenderer.invoke('save-todos', todos);
}

function loadToDoList() {
    // データを同期して、グローバル変数をアップデート
    todos = JSON.parse(ipcRenderer.sendSync('load-todos'));
    updateUI();
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

function isExists(id) {
    return false
}

function getTargetTodo(id) {
    return todos.filter(obj => {
        return obj.id === id;
    })[0];
}

function updateUI(id) {
    if (isExists(id)) {
        //
    } else {
        let todo = getTargetTodo(id);
        addOneTask(todo);
    }
}

function addTask() {
    const todoInput = document.getElementById('todo-input');

    // ToDoアイテムをグローバル変数に追加
    const newTodo = {
        id: Date.now().toString(),
        text: todoInput.value,
        startTime: null,
        elapsedTime: null,
    };
    todos.push(newTodo);
    saveToDoList(); // データを保存
    updateUI(newTodo.id); // UIをアップデート
    todoInput.value = ''; // 入力フィールドのクリア
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-task-btn').addEventListener('click', () => addTask());
    //loadToDoList();
});
