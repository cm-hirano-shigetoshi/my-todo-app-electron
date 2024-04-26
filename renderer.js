const {ipcRenderer} = require('electron');

const taskManage = "タスク確認";
const taskManageTaskcode = "c2";
const taskManageEstimate = 30;

const daysToShow = 31;

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
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset() + offset);
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function _getNDaysAgo(date, days) {
    return _modifyTimestamp(date, -60 * 24 * days).slice(0, 10);
}

function _adjustEndTime(startTime, minutes) {
    return _modifyTimestamp(_timestamp(startTime), minutes)
}

function _syncMeetingTime(todo, minutes) {
    todo.times[0].end = _adjustEndTime(todo.times[0].start, minutes);
}

function _toHourMinute(minutes) {
    const hour = parseInt(minutes / 60);
    const minute = parseInt(minutes % 60);
    return hour + ":" + minute;
}

function _moveToNextDay(todo) {
    todo.tags.Date = _modifyTimestamp(todo.tags.Date, 60 * 24).slice(0, 10);
}

function _saveToDoList(todos) {
    ipcRenderer.invoke('save-todos', todos);
}

function _stopRunning(todos) {
    for (let todo of todos) {
        if (_isRunning(todo)) {
            todo.times[todo.times.length - 1].end = _timestamp(Date.now());
        }
    }
}

function _isRunning(todo) {
    if (todo.times.length === 0) return false;
    if (todo.times[todo.times.length - 1].start && !todo.times[todo.times.length - 1].end) {
        return true;
    }
    return false;
}

function _isMeeting(todo) {
    return todo.id.startsWith("#MTG_");
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

function _getUlWithText(ul, text, today) {
    let day;
    if (document.querySelector(`li[date='${text}']`) ? true : false) {
        day = ul.querySelector(`li[date='${text}']`);
    } else {
        day = document.createElement('li');
        day.textContent = text;
        day.setAttribute("date", text);
        if (text === today) {
            day.id = "today";
        }
    }
    ul.appendChild(day);
    const taskList = document.createElement('ul');
    day.appendChild(taskList)
    return taskList;
}

function _strToIntOrNull(str) {
    let num = parseInt(str);
    if (isNaN(num)) {
        return null;
    } else {
        return num;
    }
}

function _betweenDate(d, start, end = null) {
    if (end === null) {
        return d.toString() >= start.toString();
    } else {
        return start.toString() <= d.toString() && d.toString() <= end.toString();
    }
}

function _filterTodos(todos) {
    for (let i = 0; i < daysToShow; i++) {
        return todos.filter(x => _betweenDate((x.tags?.Date), _getNDaysAgo(_getToday(), daysToShow)));
    }
    return todos;
}

function _refreshTodos(todos) {
    const filteredTodos = _filterTodos(todos);
    const today = _getToday();
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
        if (a.tags.Order === "MTG") {
            return 1;
        }
        if (b.tags.Order === "MTG") {
            return -1;
        }
        const aa = _strToIntOrNull(a.tags.Order);
        const bb = _strToIntOrNull(b.tags.Order);
        if (aa === null) {
            return 1;
        }
        if (bb === null) {
            return -1;
        }
        return aa < bb ? -1 : 1;
    }
    for (let todo of filteredTodos.sort(order)) {
        const li = drawTask(todo, today);
        _getUlWithText(todoList, todo.tags.Date, today).appendChild(li);
    }
    let sumTimeRequired = 0;
    for (let todo of filteredTodos.sort(order)) {
        if (todo.tags.Date != today) {
            continue;
        }
        if (!todo.done) {
            if (_isMeeting(todo)) {
                sumTimeRequired += parseInt(todo.estimate);
            } else if (todo.tags?.Order?.length) {
                if (!Number.isInteger(parseInt(todo.estimate)) ? true : false) {
                    console.log(todo.text, "120");
                    sumTimeRequired += 120;
                } else if (_getElapsedTime(todo) <= todo.estimate) {
                    console.log(todo.text, parseInt(todo.estimate) - _getElapsedTime(todo));
                    sumTimeRequired += parseInt(todo.estimate) - _getElapsedTime(todo);
                } else {
                    console.log(todo.text, "120");
                    sumTimeRequired += 120;
                }
            }
        }
    }
    const finishTime = document.createElement("label");
    finishTime.textContent = "+" + _toHourMinute(sumTimeRequired) + " ";
    finishTime.textContent += _adjustEndTime(_timestamp(Date.now()), sumTimeRequired);
    finishTime.style.background = "yellow";
    const todayHeader = document.getElementById('today');
    if (todayHeader) {
        todayHeader.appendChild(finishTime);
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
    _refreshTodos(todos);
}

function loadToDoList() {
    todos = JSON.parse(ipcRenderer.sendSync('load-todos'));
    _refreshTodos(todos);
}


function drawTask(todo, today) {
    // ToDoのリストアイテムを作成
    const li = document.createElement('li');
    if (_isMeeting(todo)) {
        const order = document.createElement('input');
        order.id = "order";
        order.value = todo.tags.Order;
        const title = document.createElement('input');
        title.id = "title";
        title.value = todo.text;
        if (todo.done) {
            title.style.background = "hotpink";
        } else {
            title.style.background = "pink";
        }
        const taskcode = document.createElement('input');
        taskcode.id = "taskcode";
        taskcode.value = todo.taskcode;
        const estimateTime = document.createElement('input');
        estimateTime.id = "estimate-time";
        estimateTime.value = todo.estimate;
        const decreaseButton = document.createElement('button');
        decreaseButton.textContent = "⏪";
        const timeDisplay = document.createElement('input');
        timeDisplay.disabled = true;
        timeDisplay.id = "time-display";
        timeDisplay.value = _getElapsedTime(todo);
        const increaseButton = document.createElement('button');
        increaseButton.textContent = "⏩";
        const completeBtn = document.createElement('button');
        if (todo.done) {
            completeBtn.textContent = '🔲';
        } else {
            completeBtn.textContent = '✅';
        }
        const comment = document.createElement('input');
        comment.id = "comment"
        comment.value = todo.comment;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = "🗑️";

        // リストアイテムへのボタンの追加
        li.appendChild(order);
        li.appendChild(title);
        li.appendChild(taskcode);
        li.appendChild(estimateTime);
        li.appendChild(decreaseButton);
        li.appendChild(timeDisplay);
        li.appendChild(increaseButton);
        li.appendChild(completeBtn);
        li.appendChild(comment);
        li.appendChild(deleteButton);

        order.addEventListener('blur', function () {
            todo.tags.Order = order.value;
            _syncMeetingTime(todo, parseInt(order.value))
            refresh();
        });

        title.addEventListener('blur', function () {
            todo.text = title.value;
            _saveToDoList(todos);
        });

        taskcode.addEventListener('blur', function () {
            todo.taskcode = taskcode.value;
            _saveToDoList(todos);
        });

        estimateTime.addEventListener('blur', function () {
            todo.estimate = estimateTime.value;
            _syncMeetingTime(todo, parseInt(estimateTime.value))
            refresh();
        });

        decreaseButton.addEventListener('click', () => {
            todo.times[todo.times.length - 1].end = _modifyTimestamp(todo.times[todo.times.length - 1].end, -5);
            todo.done = true;
            refresh();
        });

        increaseButton.addEventListener('click', () => {
            todo.times[todo.times.length - 1].end = _modifyTimestamp(todo.times[todo.times.length - 1].end, 5);
            todo.done = true;
            refresh();
        });

        completeBtn.addEventListener('click', () => {
            todo.done = !todo.done;
            refresh();
        });

        comment.addEventListener('blur', function () {
            todo.comment = comment.value;
            _saveToDoList(todos);
        });

        deleteButton.addEventListener('click', () => {
            removeTodo(todo);
            refresh();
        });
    } else {
        const order = document.createElement('input');
        order.id = "order";
        order.value = todo.tags.Order;
        const title = document.createElement('input');
        title.id = "title";
        title.value = todo.text;
        const taskcode = document.createElement('input');
        taskcode.id = "taskcode"
        taskcode.value = todo.taskcode;
        if (todo.done) {
            title.style.background = "lightgreen";
        } else if (todo.tags.Date < today) {
            title.style.background = "lightgray";
        } else if (_isRunning(todo)) {
            title.style.fontWeight = 'bold';
            title.style.background = "lightblue";
        }
        const estimateTime = document.createElement('input');
        estimateTime.id = "estimate-time";
        estimateTime.value = todo.estimate;
        const measureButton = document.createElement('button');
        if (_isRunning(todo)) {
            measureButton.textContent = '⏸️';
        } else {
            measureButton.textContent = '⏱️';
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
            completeBtn.textContent = '🔲';
        } else {
            completeBtn.textContent = '✅';
        }
        const tomorrowButton = document.createElement('button');
        tomorrowButton.textContent = "⇪";
        const comment = document.createElement('input');
        comment.id = "comment"
        comment.value = todo.comment;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = "🗑️";

        // リストアイテムへのボタンの追加
        li.appendChild(order);
        li.appendChild(title);
        li.appendChild(taskcode);
        li.appendChild(estimateTime);
        li.appendChild(measureButton);
        li.appendChild(timeDisplay);
        li.appendChild(tomorrowButton);
        li.appendChild(completeBtn);
        li.appendChild(comment);
        li.appendChild(deleteButton);

        order.addEventListener('blur', function () {
            todo.tags.Order = order.value;
            _saveToDoList(todos);
        });

        title.addEventListener('blur', function () {
            todo.text = title.value;
            _saveToDoList(todos);
        });

        taskcode.addEventListener('blur', function () {
            todo.taskcode = taskcode.value;
            _saveToDoList(todos);
        });

        estimateTime.addEventListener('blur', function () {
            todo.estimate = estimateTime.value;
            refresh();
        });

        measureButton.addEventListener('click', () => {
            if (_isRunning(todo)) {
                const times = todo.times[todo.times.length - 1];
                times.end = _timestamp(Date.now());
                console.log(times);
                console.log(_calcElapsedTime(times.start, times.end));
                if (_calcElapsedTime(times.start, times.end) < 60) {
                    todo.times.splice(todo.times.length - 1, 1);
                }
                refresh();
            } else {
                todo.times.push({start: _timestamp(Date.now()), end: null});
                refresh();
            }
        });

        completeBtn.addEventListener('click', () => {
            todo.done = !todo.done;
            if (todo.times.length > 0 && todo.done) {
                if (!todo.times[todo.times.length - 1].end) {
                    // endがすでにある場合は単純に再度完了に戻すだけ
                    todo.times[todo.times.length - 1].end = _timestamp(Date.now());
                }
            }
            refresh();
        });

        tomorrowButton.addEventListener('click', () => {
            _moveToNextDay(todo);
            refresh();
        });

        comment.addEventListener('blur', function () {
            todo.comment = comment.value;
            _saveToDoList(todos);
        });

        deleteButton.addEventListener('click', () => {
            removeTodo(todo);
            refresh();
        });
    }
    return li
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

function _copyUncompletedTasks(todos, today) {
    for (let todo of todos) {
        if (todo.tags.Date >= today) {
            continue;
        }
        if (!_isMeeting(todo) && !todo.done && !todo.id.endsWith("_expired")) {
            if (todo.times.length === 0) {
                todo.tags.Date = today;
            } else {
                let newTodo = JSON.parse(JSON.stringify(todo));;
                todo.id += "_expired";
                newTodo.tags.Date = today;
                todos.push(newTodo)
            }
        }
    }
    refresh();
}

function startToday(today = "") {
    if (today === "") {
        today = _getToday();
    }
    _closeTaskManage(todos, today);
    _addTask(todos, taskManage, taskManageTaskcode, today, taskManageEstimate)
    _copyUncompletedTasks(todos, today);
}

function _addTask(todos, text, taskcode = "", date = null, estimate = "", comment = "") {
    const now = Date.now();
    if (date === null) {
        date = _getToday(now);
    }
    const newTodo = {
        id: now.toString(),
        text: text,
        taskcode: taskcode,
        estimate: estimate,
        times: [],
        done: false,
        comment: comment,
        tags: {"Date": date, "Order": "1"},
    };
    todos.push(newTodo);
    refresh();
    return newTodo;
}

function addTask(todoInput) {
    _addTask(todos, todoInput.value);
    todoInput.value = '';
}

function startAnonymouseTask() {
    const todo = _addTask(todos, _timestamp(Date.now()));
    todo.times.push({start: _timestamp(Date.now()), end: null});
}

function dakoku() {
    _stopRunning(todos);
    startAnonymouseTask();
    refresh();
}

document.addEventListener('DOMContentLoaded', () => {
    const targetToday = document.getElementById('target-today');
    const todoInput = document.getElementById('todo-input');
    loadToDoList();
    document.getElementById('reload').addEventListener('click', () => loadToDoList());
    document.getElementById('start-today').addEventListener('click', () => startToday(targetToday.value));
    document.getElementById('add-task-btn').addEventListener('click', () => addTask(todoInput));
});

ipcRenderer.on('add-task', (event, task) => {
    let taskcode = ("taskcode" in task) ? task["taskcode"] : "";
    let date = ("date" in task) ? task["date"] : null;
    let comment = ("comment" in task) ? task["comment"] : "";
    let estimation = ("estimation" in task) ? task["estimation"] : "";
    _addTask(todos, task.task, taskcode, date, estimation, comment);
});

ipcRenderer.on('dakoku', (event, task) => {
    dakoku();
});
