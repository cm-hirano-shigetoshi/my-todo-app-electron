const {ipcRenderer} = require('electron');

let todos = [];

function _getDate(timestamp, timezone = 9) {
    const date = new Date(timestamp);
    const YYYY = date.getFullYear();
    const MM = ("0" + (date.getMonth() + 1)).slice(-2);
    const DD = ("0" + date.getDate()).slice(-2);

    return YYYY + "-" + MM + "-" + DD;
}

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

function _getUlWithText(ul, text) {
    let day;
    if (document.querySelector(`li[date='${text}']`) ? true : false) {
        day = ul.querySelector(`li[date='${text}']`);
    } else {
        day = document.createElement('li');
        day.textContent = text;
        day.setAttribute("date", text);
    }
    ul.appendChild(day);
    const taskList = document.createElement('ul');
    day.appendChild(taskList)
    return taskList;
}

function _refreshAllTodos(todos) {
    const todoList = document.getElementById('todo-list');
    while (todoList.firstChild) {
        todoList.removeChild(todoList.firstChild);
    }
    for (let todo of todos.sort((a, b) => b.id - a.id)) {
        drawTask(todo, _getUlWithText(todoList, todo.tags.Date));
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


function drawTask(todo, day) {
    // ToDoのリストアイテムを作成
    const li = document.createElement('li');

    const title = document.createElement('label');
    title.textContent = todo.text;
    if (todo.done) {
        title.style.background = "lightgreen";
    } else if (_isRunning(todo)) {
        title.style.fontWeight = 'bold';
        title.style.background = "lightblue";
    }
    const measureButton = document.createElement('button');
    if (_isRunning(todo)) {
        measureButton.textContent = '中断';
    } else {
        measureButton.textContent = '開始';
    }
    if (todo.done) {
        measureButton.disabled = true;
    }
    const timeDisplay = document.createElement('label');
    timeDisplay.textContent = _getElapsedTime(todo);
    const completeBtn = document.createElement('button');
    if (todo.done) {
        completeBtn.textContent = '取消';
    } else {
        completeBtn.textContent = '完了';
    }

    // リストアイテムへのボタンの追加
    li.appendChild(title);
    li.appendChild(measureButton);
    li.appendChild(timeDisplay);
    li.appendChild(completeBtn);
    day.appendChild(li);

    measureButton.addEventListener('click', () => {
        if (_isRunning(todo)) {
            todo.times[todo.times.length - 1].end = Date.now();
            refresh();
        } else {
            todo.times.push({start: Date.now(), end: null});
            refresh();
        }
    });

    completeBtn.addEventListener('click', () => {
        todo.done = !todo.done;
        if (todo.done) {
            if (!todo.times[todo.times.length - 1].end) {
                // endがすでにある場合は単純に再度完了に戻すだけ
                todo.times[todo.times.length - 1].end = Date.now();
            }
        }
        refresh();
    });
}

function addTask(todoInput) {
    const now = Date.now();
    const newTodo = {
        id: now.toString(),
        text: todoInput.value,
        times: [],
        done: false,
        tags: {"Date": _getDate(now)},
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
