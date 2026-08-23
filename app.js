const STORAGE_KEY = "briefboard.tasks.v2";
const THEME_KEY = "briefboard.theme";
const statuses = {
  backlog: "Бэклог",
  progress: "В работе",
  review: "Проверка",
  done: "Готово"
};
const priorities = { high: "Высокий", medium: "Средний", low: "Низкий" };
const isoAfter = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const seed = [
  { id: crypto.randomUUID(), title: "Собрать структуру MVP", project: "Launch", status: "progress", priority: "high", due: isoAfter(2) },
  { id: crypto.randomUUID(), title: "Проверить мобильный сценарий", project: "Launch", status: "review", priority: "medium", due: isoAfter(1) },
  { id: crypto.randomUUID(), title: "Подготовить демо для клиента", project: "Vitrina AI", status: "backlog", priority: "low", due: isoAfter(5) },
  { id: crypto.randomUUID(), title: "Собрать обратную связь", project: "Research", status: "done", priority: "medium", due: isoAfter(-1) }
];

let tasks = readTasks();
let query = "";
let priorityFilter = "all";
let toastTimer;
const board = document.querySelector("#board");

function readTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return Array.isArray(saved) ? saved.filter(validTask) : seed;
  } catch {
    return seed;
  }
}

function validTask(task) {
  return task && typeof task.id === "string" && typeof task.title === "string" && statuses[task.status] && priorities[task.priority];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function filteredTasks() {
  const needle = query.toLocaleLowerCase("ru");
  return tasks.filter((task) => {
    const matchesText = `${task.title} ${task.project}`.toLocaleLowerCase("ru").includes(needle);
    return matchesText && (priorityFilter === "all" || task.priority === priorityFilter);
  });
}

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function formatDate(value) {
  if (!value) return "Без срока";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function isOverdue(task) {
  return task.due && task.status !== "done" && task.due < new Date().toISOString().slice(0, 10);
}

function render() {
  const visible = filteredTasks();
  board.innerHTML = Object.entries(statuses).map(([status, label]) => {
    const cards = visible.filter((task) => task.status === status);
    return `<section class="column" data-status="${status}">
      <header class="column-head"><h2>${label}</h2><span>${cards.length}</span></header>
      <div class="task-list" data-drop="${status}">
        ${cards.length ? cards.map(cardTemplate).join("") : '<p class="empty">Перетащите задачу сюда</p>'}
      </div>
    </section>`;
  }).join("");

  const done = tasks.filter((task) => task.status === "done").length;
  document.querySelector("#metric-total").textContent = tasks.length;
  document.querySelector("#metric-active").textContent = tasks.length - done;
  document.querySelector("#metric-done").textContent = done;
  document.querySelector("#metric-progress").textContent = tasks.length ? `${Math.round(done / tasks.length * 100)}%` : "0%";
}

function cardTemplate(task) {
  return `<article class="task" draggable="true" data-id="${task.id}">
    <div class="task-top"><span class="project">${escapeHtml(task.project)}</span><span class="priority ${task.priority}" title="${priorities[task.priority]}"></span></div>
    <h3>${escapeHtml(task.title)}</h3>
    <button class="remove" type="button" aria-label="Удалить задачу">×</button>
    <div class="task-meta">
      <select class="status-select" aria-label="Этап задачи">${Object.entries(statuses).map(([value, label]) => `<option value="${value}" ${value === task.status ? "selected" : ""}>${label}</option>`).join("")}</select>
      <span class="due ${isOverdue(task) ? "overdue" : ""}">${formatDate(task.due)}</span>
    </div>
  </article>`;
}

function updateTask(id, patch) {
  tasks = tasks.map((task) => task.id === id ? { ...task, ...patch } : task);
  save();
  render();
}

function notify(message) {
  const toast = document.querySelector("#toast");
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

document.querySelector("#task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  tasks.unshift({
    id: crypto.randomUUID(),
    title: document.querySelector("#title").value.trim(),
    project: document.querySelector("#project").value.trim(),
    status: document.querySelector("#status").value,
    priority: document.querySelector("#priority").value,
    due: document.querySelector("#due").value
  });
  save();
  event.target.reset();
  render();
  notify("Задача добавлена");
});

board.addEventListener("change", (event) => {
  if (!event.target.matches(".status-select")) return;
  updateTask(event.target.closest(".task").dataset.id, { status: event.target.value });
  notify("Этап обновлён");
});

board.addEventListener("click", (event) => {
  const button = event.target.closest(".remove");
  if (!button) return;
  const id = button.closest(".task").dataset.id;
  tasks = tasks.filter((task) => task.id !== id);
  save();
  render();
  notify("Задача удалена");
});

board.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".task");
  if (!card) return;
  card.classList.add("dragging");
  event.dataTransfer.setData("text/plain", card.dataset.id);
  event.dataTransfer.effectAllowed = "move";
});

board.addEventListener("dragend", (event) => {
  event.target.closest(".task")?.classList.remove("dragging");
  document.querySelectorAll(".drop-active").forEach((item) => item.classList.remove("drop-active"));
});

board.addEventListener("dragover", (event) => {
  const target = event.target.closest("[data-drop]");
  if (!target) return;
  event.preventDefault();
  document.querySelectorAll(".drop-active").forEach((item) => item.classList.toggle("drop-active", item === target));
});

board.addEventListener("drop", (event) => {
  const target = event.target.closest("[data-drop]");
  if (!target) return;
  event.preventDefault();
  updateTask(event.dataTransfer.getData("text/plain"), { status: target.dataset.drop });
  notify("Задача перемещена");
});

document.querySelector("#search").addEventListener("input", (event) => { query = event.target.value; render(); });
document.querySelector("#priority-filter").addEventListener("change", (event) => { priorityFilter = event.target.value; render(); });
document.querySelector("#clear-filters").addEventListener("click", () => {
  query = ""; priorityFilter = "all";
  document.querySelector("#search").value = "";
  document.querySelector("#priority-filter").value = "all";
  render();
});

document.querySelector("#export").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: "briefboard.json" });
  link.click();
  URL.revokeObjectURL(url);
  notify("JSON выгружен");
});

document.querySelector("#import").addEventListener("click", () => document.querySelector("#import-file").click());
document.querySelector("#import-file").addEventListener("change", async (event) => {
  try {
    const incoming = JSON.parse(await event.target.files[0].text());
    if (!Array.isArray(incoming) || !incoming.every(validTask)) throw new Error();
    tasks = incoming;
    save(); render(); notify("Данные импортированы");
  } catch {
    notify("Не удалось прочитать файл");
  }
  event.target.value = "";
});

const initialTheme = localStorage.getItem(THEME_KEY) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
document.documentElement.dataset.theme = initialTheme;
document.querySelector("#theme").addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
});

console.assert(validTask(seed[0]) && !validTask({ title: "broken" }), "Task validation must reject malformed imports");
render();
