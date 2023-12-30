const {ipcRenderer} = require('electron');

let todos = [];

function _saveToDoList(todos) {
    ipcRenderer.invoke('save-todos', todos);
}

function _isRunning(todo) {
    if (todo.times.length === 0) return false;
    if (todo.times[todo.times.length - 1].start && !todo.times[todo.times.length - 1].end) {
        return true;
    }
    return false;
}

function _getElapsedTime(todo) {
    elapsedTime = 0;
    for (let time of todo.times) {
        if (time.end && time.start) {
            elapsedTime += time.end - time.start;
        }
    }
    return elapsedTime / 1000;
}

function _refreshAllTodos(todos) {
    const todoList = document.getElementById('todo-list');
    while (todoList.firstChild) {
        todoList.removeChild(todoList.firstChild);
    }
    for (let todo of todos) {
        drawTask(todo);
    }
}

function refresh() {
    _saveToDoList(todos);
    _refreshAllTodos(todos);
}

function loadToDoList() {
    todos = JSON.parse(ipcRenderer.sendSync('load-todos'));
    _refreshAllTodos(todos);
}


function drawTask(todo) {
    const todoList = document.getElementById('todo-list');

    // ToDoのリストアイテムを作成
    const li = document.createElement('li');

    const title = document.createElement('label');
    title.textContent = todo.text;
    if (todo.done) {
        title.style.color = "lightgray";
    }
    const startButton = document.createElement('button');
    startButton.textContent = '開始';
    const timeDisplay = document.createElement('label');
    timeDisplay.textContent = _getElapsedTime(todo);
    const stopButton = document.createElement('button');
    stopButton.textContent = '中断';
    if (todo.done) {
        startButton.disabled = true;
        stopButton.disabled = true;
    } else {
        if (_isRunning(todo)) {
            startButton.disabled = true;
        } else {
            stopButton.disabled = true;
        }
    }
    const completeBtn = document.createElement('button');
    if (todo.done) {
        completeBtn.textContent = '取消';
    } else {
        completeBtn.textContent = '完了';
    }

    // リストアイテムへのボタンの追加
    li.appendChild(title);
    li.appendChild(startButton);
    li.appendChild(timeDisplay);
    li.appendChild(stopButton);
    li.appendChild(completeBtn);
    todoList.appendChild(li);

    startButton.addEventListener('click', () => {
        todo.times.push({start: Date.now(), end: null});
        refresh();
    });

    stopButton.addEventListener('click', () => {
        todo.times[todo.times.length - 1].end = Date.now();
        refresh();
    });

    completeBtn.addEventListener('click', () => {
        todo.done = !todo.done;
        if (todo.done) {
            todo.times[todo.times.length - 1].end = Date.now();
        }
        refresh();
    });
}

function addTask(todoInput) {
    const newTodo = {
        id: Date.now().toString(),
        text: todoInput.value,
        times: [],
        done: false,
    };
    todos.push(newTodo);
    todoInput.value = ''; // 入力フィールドのクリア
    refresh();
}

document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    loadToDoList();
    document.getElementById('add-task-btn').addEventListener('click', () => addTask(todoInput));
});
