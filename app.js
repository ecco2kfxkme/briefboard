const STORAGE_KEY = "briefboard.tasks.v4";
const statuses = { backlog: "Бэклог", progress: "В работе", review: "Проверка", done: "Готово" };
const priorities = { high: "Высокий", medium: "Средний", low: "Низкий" };
const isoAfter = (days) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
const seed = [
  { id: crypto.randomUUID(), title: "Собрать структуру страницы кейса", project: "Portfolio", status: "progress", priority: "high", due: isoAfter(2) },
  { id: crypto.randomUUID(), title: "Проверить мобильный сценарий", project: "Briefboard", status: "review", priority: "medium", due: isoAfter(1) },
  { id: crypto.randomUUID(), title: "Подготовить три варианта текста", project: "Vitrina AI", status: "backlog", priority: "high", due: isoAfter(4) },
  { id: crypto.randomUUID(), title: "Сверить подписи и состояния кнопок", project: "Briefboard", status: "progress", priority: "low", due: isoAfter(5) },
  { id: crypto.randomUUID(), title: "Собрать обратную связь по прототипу", project: "Research", status: "done", priority: "medium", due: isoAfter(-1) }
];

let tasks = readTasks();
let query = "";
let priorityFilter = "all";
let toastTimer;
let deletedTask = null;
let drawerTaskId = null;
const board = document.querySelector("#board");

function validTask(task) { return task && typeof task.id === "string" && typeof task.title === "string" && typeof task.project === "string" && statuses[task.status] && priorities[task.priority]; }
function readTasks() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); return Array.isArray(saved) && saved.every(validTask) ? saved : seed; } catch { return seed; } }
function save(message = "Сохранено локально") { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); document.querySelector("#save-state").textContent = message; }
function escapeHtml(value) { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }
function taskCode(task) { return `BB-${String(tasks.indexOf(task) + 1).padStart(3, "0")}`; }
function formatDate(value) { if (!value) return "Без срока"; return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`)); }
function isOverdue(task) { return task.due && task.status !== "done" && task.due < new Date().toISOString().slice(0, 10); }
function filteredTasks() { const needle = query.toLocaleLowerCase("ru"); return tasks.filter((task) => `${task.title} ${task.project}`.toLocaleLowerCase("ru").includes(needle) && (priorityFilter === "all" || task.priority === priorityFilter)); }

function cardTemplate(task) {
  return `<article class="task" draggable="true" data-id="${task.id}" tabindex="0" aria-label="Открыть задачу ${escapeHtml(task.title)}">
    <div class="task-top"><span class="task-id">${taskCode(task)}</span><span class="priority-label ${task.priority}"><i aria-hidden="true"></i>${priorities[task.priority]}</span></div>
    <h3>${escapeHtml(task.title)}</h3><p class="task-project">${escapeHtml(task.project)}</p>
    <button class="remove" type="button" aria-label="Удалить задачу">×</button>
    <div class="task-meta"><select class="status-select" aria-label="Этап задачи">${Object.entries(statuses).map(([value, label]) => `<option value="${value}" ${value === task.status ? "selected" : ""}>${label}</option>`).join("")}</select><span class="due ${isOverdue(task) ? "overdue" : ""}">${formatDate(task.due)}</span></div>
  </article>`;
}

function render() {
  const visible = filteredTasks();
  board.innerHTML = Object.entries(statuses).map(([status, label], index) => {
    const cards = visible.filter((task) => task.status === status);
    return `<section class="column" data-status="${status}"><header class="column-head" data-index="${String(index + 1).padStart(2, "0")}"><h2>${label}</h2><span>${cards.length}</span></header><div class="task-list" data-drop="${status}">${cards.length ? cards.map(cardTemplate).join("") : '<p class="empty">Нет задач в этом этапе</p>'}</div></section>`;
  }).join("");
  const done = tasks.filter((task) => task.status === "done").length;
  const progress = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  document.querySelector("#metric-active").textContent = tasks.length - done;
  document.querySelector("#metric-done").textContent = done;
  document.querySelector("#metric-overdue").textContent = tasks.filter(isOverdue).length;
  document.querySelector("#metric-progress").textContent = `${progress}%`;
  document.querySelector("#nav-count").textContent = tasks.length;
}

function notify(message, withUndo = false) {
  clearTimeout(toastTimer);
  document.querySelector("#toast-message").textContent = message;
  document.querySelector("#undo").hidden = !withUndo;
  document.querySelector("#toast").classList.add("show");
  toastTimer = setTimeout(() => { document.querySelector("#toast").classList.remove("show"); deletedTask = null; }, 4200);
}

function updateTask(id, patch) { tasks = tasks.map((task) => task.id === id ? { ...task, ...patch } : task); save(); render(); }

function openDrawer(id) {
  const task = tasks.find((item) => item.id === id); if (!task) return;
  drawerTaskId = id;
  document.querySelector("#drawer-id").textContent = taskCode(task);
  document.querySelector("#drawer-title").textContent = task.title;
  document.querySelector("#drawer-task-title").value = task.title;
  document.querySelector("#drawer-project").value = task.project;
  document.querySelector("#drawer-status").innerHTML = Object.entries(statuses).map(([value, label]) => `<option value="${value}" ${value === task.status ? "selected" : ""}>${label}</option>`).join("");
  document.querySelector("#drawer-priority").innerHTML = Object.entries(priorities).map(([value, label]) => `<option value="${value}" ${value === task.priority ? "selected" : ""}>${label}</option>`).join("");
  document.querySelector("#drawer-due").value = task.due || "";
  document.querySelector("#task-drawer").classList.add("open");
  document.querySelector("#task-drawer").setAttribute("aria-hidden", "false");
  document.querySelector("#drawer-backdrop").hidden = false;
  document.querySelector("#drawer-task-title").focus();
}
function closeDrawer() { document.querySelector("#task-drawer").classList.remove("open"); document.querySelector("#task-drawer").setAttribute("aria-hidden", "true"); document.querySelector("#drawer-backdrop").hidden = true; drawerTaskId = null; }

document.querySelector("#open-create").addEventListener("click", () => document.querySelector("#create-dialog").showModal());
document.querySelector("#close-create").addEventListener("click", () => document.querySelector("#create-dialog").close());
document.querySelector("#cancel-create").addEventListener("click", () => document.querySelector("#create-dialog").close());
document.querySelector("#task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  tasks.unshift({ id: crypto.randomUUID(), title: document.querySelector("#title").value.trim(), project: document.querySelector("#project").value.trim(), status: document.querySelector("#status").value, priority: document.querySelector("#priority").value, due: document.querySelector("#due").value });
  save(); event.target.reset(); document.querySelector("#create-dialog").close(); render(); notify("Задача добавлена");
});

board.addEventListener("change", (event) => { if (!event.target.matches(".status-select")) return; updateTask(event.target.closest(".task").dataset.id, { status: event.target.value }); notify("Этап обновлён"); });
board.addEventListener("click", (event) => {
  const remove = event.target.closest(".remove");
  if (remove) { const id = remove.closest(".task").dataset.id; const index = tasks.findIndex((task) => task.id === id); deletedTask = { task: tasks[index], index }; tasks.splice(index, 1); save(); render(); notify("Задача удалена", true); return; }
  if (event.target.closest("select")) return;
  const card = event.target.closest(".task"); if (card) openDrawer(card.dataset.id);
});
board.addEventListener("keydown", (event) => { if ((event.key === "Enter" || event.key === " ") && event.target.matches(".task")) { event.preventDefault(); openDrawer(event.target.dataset.id); } });
document.querySelector("#undo").addEventListener("click", () => { if (!deletedTask) return; tasks.splice(deletedTask.index, 0, deletedTask.task); deletedTask = null; save(); render(); notify("Задача восстановлена"); });

board.addEventListener("dragstart", (event) => { const card = event.target.closest(".task"); if (!card) return; card.classList.add("dragging"); event.dataTransfer.setData("text/plain", card.dataset.id); event.dataTransfer.effectAllowed = "move"; });
board.addEventListener("dragend", (event) => { event.target.closest(".task")?.classList.remove("dragging"); document.querySelectorAll(".drop-active").forEach((item) => item.classList.remove("drop-active")); });
board.addEventListener("dragover", (event) => { const target = event.target.closest("[data-drop]"); if (!target) return; event.preventDefault(); document.querySelectorAll(".drop-active").forEach((item) => item.classList.toggle("drop-active", item === target)); });
board.addEventListener("drop", (event) => { const target = event.target.closest("[data-drop]"); if (!target) return; event.preventDefault(); updateTask(event.dataTransfer.getData("text/plain"), { status: target.dataset.drop }); notify("Задача перемещена"); });

document.querySelector("#drawer-form").addEventListener("submit", (event) => { event.preventDefault(); if (!drawerTaskId) return; updateTask(drawerTaskId, { title: document.querySelector("#drawer-task-title").value.trim(), project: document.querySelector("#drawer-project").value.trim(), status: document.querySelector("#drawer-status").value, priority: document.querySelector("#drawer-priority").value, due: document.querySelector("#drawer-due").value }); closeDrawer(); notify("Изменения сохранены"); });
document.querySelector("#close-drawer").addEventListener("click", closeDrawer);
document.querySelector("#drawer-backdrop").addEventListener("click", closeDrawer);
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && drawerTaskId) closeDrawer(); });

document.querySelector("#search").addEventListener("input", (event) => { query = event.target.value; render(); });
document.querySelector("#priority-filter").addEventListener("change", (event) => { priorityFilter = event.target.value; render(); });
document.querySelector("#clear-filters").addEventListener("click", () => { query = ""; priorityFilter = "all"; document.querySelector("#search").value = ""; document.querySelector("#priority-filter").value = "all"; render(); });
document.querySelector("#export").addEventListener("click", () => { const url = URL.createObjectURL(new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" })); const link = Object.assign(document.createElement("a"), { href: url, download: "briefboard.json" }); link.click(); URL.revokeObjectURL(url); notify("JSON выгружен"); });
document.querySelector("#import").addEventListener("click", () => document.querySelector("#import-file").click());
document.querySelector("#import-file").addEventListener("change", async (event) => { try { const incoming = JSON.parse(await event.target.files[0].text()); if (!Array.isArray(incoming) || !incoming.every(validTask)) throw new Error(); tasks = incoming; save(); render(); notify("Данные импортированы"); } catch { notify("Не удалось прочитать файл"); } event.target.value = ""; });

console.assert(validTask(seed[0]) && !validTask({ title: "broken" }), "Task validation must reject malformed imports");
render();
