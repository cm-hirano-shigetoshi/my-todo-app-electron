const {ipcRenderer} = require('electron');

const taskManage = "タスク確認";
const taskManageEstimate = 30;

let todos = [];

function _timestamp(epoch, timezoneOffset = 9) {
    date = new Date(epoch);
    const d = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
    const pad = (num) => (num < 10 ? '0' + num : '' + num);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} `
        + `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function _getToday(now = null) {
    if (now === null) {
        return _timestamp(Date.now()).substring(0, 10);
    } else {
        return _timestamp(now).substring(0, 10);
    }
}

function _epochtime(timestamp, timezoneOffset = 9) {
    const date = new Date(timestamp);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + timezoneOffset * 60);
    return date.getTime();
}

function _modifyTimestamp(timestamp, offset) {
    const date = new Date(timestamp);
    date.setMinutes(date.getMinutes() + offset);
    return date.toISOString();
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
    return parseInt(elapsedTime / 60 + 0.5);
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
    const order = (a, b) => {
        if (a.tags.Date < b.tags.Date) {
            return 1;
        }
        if (a.tags.Date > b.tags.Date) {
            return -1;
        }
        return a.id > b.id ? -1 : 1;
    }
    for (let todo of todos.sort(order)) {
        drawTask(todo, _getUlWithText(todoList, todo.tags.Date));
    }
}

function _removeTodo(todos, todo) {
    const index = todos.findIndex(item => {
        return item.id === todo.id;
    });
    todos.splice(index, 1);
}

function removeTodo(todo) {
    _removeTodo(todos, todo);
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
    if (todo.id.startsWith("#MTG_")) {
        const title = document.createElement('input');
        title.id = "title";
        title.value = todo.text;
        title.style.background = "pink";
        const estimateTime = document.createElement('input');
        estimateTime.id = "estimate-time";
        estimateTime.value = todo.estimate;
        const decreaseButton = document.createElement('button');
        decreaseButton.textContent = "<-";
        const timeDisplay = document.createElement('input');
        timeDisplay.disabled = true;
        timeDisplay.id = "time-display";
        timeDisplay.value = _getElapsedTime(todo);
        const increaseButton = document.createElement('button');
        increaseButton.textContent = "->";
        const deleteButton = document.createElement('button');
        deleteButton.textContent = "削除";

        // リストアイテムへのボタンの追加
        li.appendChild(title);
        li.appendChild(estimateTime);
        li.appendChild(decreaseButton);
        li.appendChild(timeDisplay);
        li.appendChild(increaseButton);
        li.appendChild(deleteButton);
        day.appendChild(li);

        title.addEventListener('input', function () {
            todo.text = title.value;
            _saveToDoList(todos);
        });

        estimateTime.addEventListener('input', function () {
            todo.estimate = estimateTime.value;
            _saveToDoList(todos);
        });

        decreaseButton.addEventListener('click', () => {
            todo.times[todo.times.length - 1].end = _modifyTimestamp(todo.times[todo.times.length - 1].end, -5);
            refresh();
        });

        increaseButton.addEventListener('click', () => {
            todo.times[todo.times.length - 1].end = _modifyTimestamp(todo.times[todo.times.length - 1].end, 5);
            refresh();
        });

        deleteButton.addEventListener('click', () => {
            removeTodo(todo);
            refresh();
        });
    } else {
        const title = document.createElement('input');
        title.id = "title";
        title.value = todo.text;
        if (todo.id.startsWith("#MTG_")) {
            title.style.background = "pink";
        } else if (todo.done) {
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
        const timeDisplay = document.createElement('input');
        timeDisplay.disabled = true;
        timeDisplay.id = "time-display";
        timeDisplay.value = _getElapsedTime(todo);
        const completeBtn = document.createElement('button');
        if (todo.done) {
            completeBtn.textContent = '取消';
        } else {
            completeBtn.textContent = '完了';
        }
        const deleteButton = document.createElement('button');
        deleteButton.textContent = "削除";

        // リストアイテムへのボタンの追加
        li.appendChild(title);
        li.appendChild(estimateTime);
        li.appendChild(measureButton);
        li.appendChild(timeDisplay);
        li.appendChild(completeBtn);
        li.appendChild(deleteButton);
        day.appendChild(li);

        title.addEventListener('input', function () {
            todo.text = title.value;
            _saveToDoList(todos);
        });

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

        deleteButton.addEventListener('click', () => {
            removeTodo(todo);
            refresh();
        });
    }
}

function _closeTaskManage(todos, today) {
    for (let todo of todos) {
        if (todo.tags.Date >= today) {
            continue;
        }
        if (todo.text === taskManage && !todo.done) {
            todo.done = true;
        }
    }
    refresh();
}

function startToday() {
    const today = _getToday();
    _closeTaskManage(todos, today);
    _addTask(todos, taskManage, taskManageEstimate)
}

function _addTask(todos, text, estimate = "") {
    const now = Date.now();
    const newTodo = {
        id: now.toString(),
        text: text,
        estimate: estimate,
        times: [],
        done: false,
        tags: {"Date": _getToday(now)},
    };
    todos.push(newTodo);
    refresh();
}

function addTask(todoInput) {
    _addTask(todos, todoInput.value);
    todoInput.value = ''; // 入力フィールドのクリア
}

document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    loadToDoList();
    document.getElementById('start-today').addEventListener('click', () => startToday());
    document.getElementById('add-task-btn').addEventListener('click', () => addTask(todoInput.value));
});
