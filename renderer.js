const {ipcRenderer} = require('electron');

let todos = [];

function _saveToDoList(todos) {
    ipcRenderer.invoke('save-todos', todos);
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

function _isRunning(todo) {
    console.log(todo.times[todo.times.length - 1]);
    console.log(todo.times[todo.times.length - 1].start);
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

function loadToDoList() {
    todos = JSON.parse(ipcRenderer.sendSync('load-todos'));
    for (let todo of todos) {
        if (!todo.done) _updateUI(todo);
    }
}


function addOneTask(todo) {
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

    startButton.addEventListener('click', () => {
        todo.times.push({start: null, end: null});
        todo.times[todo.times.length - 1].start = Date.now();
        _saveToDoList(todos)
        startButton.disabled = true;
        stopButton.disabled = false;
    });

    stopButton.addEventListener('click', () => {
        todo.times[todo.times.length - 1].end = Date.now();
        _saveToDoList(todos)
        timeDisplay.textContent = _getElapsedTime(todo);
        stopButton.disabled = true;
        startButton.disabled = false;
    });

    completeBtn.addEventListener('click', () => {
        todo.done = !todo.done;
        if (todo.done) {
            todo.times[todo.times.length - 1].end = Date.now();
            _saveToDoList(todos)
            title.style.color = "lightgray";
            completeBtn.textContent = "取消";
            timeDisplay.textContent = _getElapsedTime(todo);
            startButton.disabled = true;
            stopButton.disabled = true;
        } else {
            _saveToDoList(todos)
            title.style.color = "black";
            completeBtn.textContent = "完了";
            startButton.disabled = false;
            stopButton.disabled = true;
        }
    });

    // リストアイテムへのボタンの追加
    li.appendChild(title);
    li.appendChild(startButton);
    li.appendChild(timeDisplay);
    li.appendChild(stopButton);
    li.appendChild(completeBtn);
    todoList.appendChild(li);
}

function addTask(todoInput) {
    // ToDoアイテムをグローバル変数に追加
    const newTodo = {
        id: Date.now().toString(),
        text: todoInput.value,
        times: [{start: null, end: null}],
        done: false,
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
