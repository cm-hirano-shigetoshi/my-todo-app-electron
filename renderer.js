const {ipcRenderer} = require('electron');

let todos = [];

function _timestamp(epoch, timezoneOffset = 9) {
    date = new Date(epoch);
    const d = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
    const pad = (num) => (num < 10 ? '0' + num : '' + num);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} `
        + `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
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

function _calcElapsedTime(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return (endDate - startDate) / 1000;
}

function _getElapsedTime(todo) {
    elapsedTime = 0;
    for (let time of todo.times) {
        if (time.end && time.start) {
            elapsedTime += _calcElapsedTime(time.start, time.end);
        }
    }
    return parseInt(elapsedTime / 60 - 0.5);
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
    const estimateTime = document.createElement('input');
    estimateTime.id = "estimate-time";
    estimateTime.value = todo.estimate;
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
    li.appendChild(estimateTime);
    li.appendChild(measureButton);
    li.appendChild(timeDisplay);
    li.appendChild(completeBtn);
    day.appendChild(li);

    estimateTime.addEventListener('input', function () {
        todo.estimate = estimateTime.value;
        _saveToDoList(todos);
    });

    measureButton.addEventListener('click', () => {
        if (_isRunning(todo)) {
            todo.times[todo.times.length - 1].end = _timestamp(Date.now());
            refresh();
        } else {
            todo.times.push({start: _timestamp(Date.now()), end: null});
            refresh();
        }
    });

    completeBtn.addEventListener('click', () => {
        todo.done = !todo.done;
        if (todo.done) {
            if (!todo.times[todo.times.length - 1].end) {
                // endがすでにある場合は単純に再度完了に戻すだけ
                todo.times[todo.times.length - 1].end = _timestamp(Date.now());
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
        estimate: "",
        times: [],
        done: false,
        tags: {"Date": _timestamp(now).substring(0, 10)},
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
