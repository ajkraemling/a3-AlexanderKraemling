let checklists = {}; // { name: [ {text, done} ] }
let currentChecklist = null;
let currentUser = null; // {_id/sub, name}

// DOM elements
const checklistList = document.getElementById("checklistList");
const newChecklistBtn = document.getElementById("newChecklistBtn");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const tasksActive = document.getElementById("tasksActive");
const tasksCompleted = document.getElementById("tasksCompleted");
const appDiv = document.getElementById("app");

// -------- Initialize Auth0 and get user --------
async function init() {
    try {
        const res = await fetch("/api/me"); // server route returns logged-in user info
        if (!res.ok) throw new Error("Not logged in");

        const data = await res.json();
        currentUser = {id: data.user.sub, name: data.user.name || data.user.nickname};

        appDiv.classList.remove("hidden");
        await loadChecklists();
    } catch (err) {
        console.error(err);
        // redirect to Auth0 login page if not authenticated
        window.location.href = "/login";
    }
}

window.onload = init;

// -------- Checklist / task logic --------
async function loadChecklists() {
    if (!currentUser) return;

    try {
        const res = await fetch(`/api/checklists`);
        const data = await res.json();

        checklists = {};
        data.forEach(c => {
            if (c.userId === currentUser.id) {
                checklists[c.name] = c.tasks;
            }
        });

        // select first checklist by default if none selected
        if (!currentChecklist && Object.keys(checklists).length > 0) {
            currentChecklist = Object.keys(checklists)[0];
        }

        renderChecklists();
        renderTasks();
    } catch (err) {
        console.error("Failed to load checklists:", err);
    }
}

newChecklistBtn.addEventListener("click", async () => {
    const name = prompt("Enter checklist name:");
    if (!name) return;
    if (checklists[name]) return alert("Checklist already exists");

    try {
        const res = await fetch("/api/checklists", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name})
        });
        const data = await res.json();
        if (data.userId !== currentUser.id) return; // only add if it matches current user

        checklists[data.name] = data.tasks;
        currentChecklist = data.name;
        renderChecklists();
        renderTasks();
    } catch (err) {
        console.error("Failed to create checklist:", err);
    }
});

// Render sidebar checklists
function renderChecklists() {
    checklistList.innerHTML = "";
    Object.keys(checklists).forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        li.className = `cursor-pointer p-2 rounded hover:shadow hover:bg-pink-300 ${name === currentChecklist ? "bg-pink-300 font-bold" : "hover:bg-pink-100"}`;
        li.onclick = () => {
            currentChecklist = name;
            renderChecklists();
            renderTasks();
        };
        checklistList.appendChild(li);
    });
}

// Add a task
taskForm.addEventListener("submit", async e => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;

    try {
        const res = await fetch(`/api/checklists/${currentChecklist}/tasks`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({text})
        });
        const data = await res.json();
        checklists[data.name] = data.tasks;
        taskInput.value = "";
        renderTasks();
    } catch (err) {
        console.error("Failed to add task:", err);
    }
});

// Toggle task done/undone
async function toggleTask(index) {
    try {
        const res = await fetch(`/api/checklists/${currentChecklist}/tasks/${index}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({})
        });
        const data = await res.json();
        checklists[data.name] = data.tasks;
        renderTasks();
    } catch (err) {
        console.error("Failed to toggle task:", err);
    }
}

// Render tasks
function renderTasks() {
    tasksActive.innerHTML = "";
    tasksCompleted.innerHTML = "";
    if (!currentChecklist) return;

    checklists[currentChecklist].forEach((task, index) => {
        const li = document.createElement("li");
        li.className = "flex items-center space-x-2";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.onchange = () => toggleTask(index);

        const span = document.createElement("span");
        span.textContent = task.text;
        if (task.done) span.className = "line-through text-gray-600";

        li.appendChild(checkbox);
        li.appendChild(span);

        if (task.done) {
            tasksCompleted.appendChild(li);
        } else {
            tasksActive.appendChild(li);
        }
    });
}


const userMenuButton = document.getElementById("userMenuButton");
const userMenu = document.getElementById("userMenu");

userMenuButton.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
});

// Example: load user from /api/me
fetch("/api/me")
    .then(res => res.json())
    .then(data => {
        if (data.user) {
            document.getElementById("username").textContent = data.user.name || data.user.email;
        }
    });

document.getElementById("logoutButton").addEventListener("click", () => {
    window.location.href = "/logout";
});
