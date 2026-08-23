const STORAGE_KEY = "briefboard.tasks.v1";
const seed = [
  { id: crypto.randomUUID(), title: "Собрать структуру MVP", project: "Launch 01", priority: "high", done: false },
  { id: crypto.randomUUID(), title: "Проверить мобильный сценарий", project: "Launch 01", priority: "medium", done: true },
  { id: crypto.randomUUID(), title: "Подготовить демо для клиента", project: "Vitrina AI", priority: "low", done: false }
];
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || seed;
let filter = "all";

const board = document.querySelector("#board");
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
const visible = () => tasks.filter((task) => filter === "all" || (filter === "done") === task.done);

function render() {
  document.querySelector("#all-count").textContent = tasks.length;
  const list = visible();
  board.innerHTML = list.length ? list.map((task) => `
    <article class="task ${task.done ? "done" : ""}" data-id="${task.id}">
      <input type="checkbox" aria-label="Отметить задачу" ${task.done ? "checked" : ""}>
      <h2>${escapeHtml(task.title)}</h2>
      <span class="project">${escapeHtml(task.project)}</span>
      <span class="priority ${task.priority}">${({ high: "Высокий", medium: "Средний", low: "Низкий" })[task.priority]}</span>
      <button class="remove" aria-label="Удалить задачу">×</button>
    </article>`).join("") : '<p class="empty">В этом разделе пока нет задач.</p>';
}

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

document.querySelector("#task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  tasks.unshift({
    id: crypto.randomUUID(),
    title: document.querySelector("#title").value.trim(),
    project: document.querySelector("#project").value.trim(),
    priority: document.querySelector("#priority").value,
    done: false
  });
  save(); event.target.reset(); render();
});

board.addEventListener("click", (event) => {
  const row = event.target.closest(".task");
  if (!row) return;
  if (event.target.matches("input")) tasks = tasks.map((task) => task.id === row.dataset.id ? { ...task, done: event.target.checked } : task);
  if (event.target.matches(".remove")) tasks = tasks.filter((task) => task.id !== row.dataset.id);
  save(); render();
});

document.querySelector("#filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  filter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
  render();
});

document.querySelector("#export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
  const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "briefboard.json" });
  link.click(); URL.revokeObjectURL(link.href);
});

console.assert(escapeHtml("<b>") === "&lt;b&gt;", "HTML escaping must stay enabled");
render();
