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

function renderChecklists() {
    checklistList.innerHTML = "";
    Object.keys(checklists).forEach(name => {
        const li = document.createElement("li");
        li.className = `flex items-center justify-between p-2 rounded cursor-pointer
                        ${name === currentChecklist ? "bg-pink-300 font-bold" : "hover:bg-pink-100"}`;

        // Select checklist when clicking anywhere in the li
        li.onclick = () => {
            currentChecklist = name;
            renderChecklists();
            renderTasks();
        };

        const span = document.createElement("span");
        span.textContent = name;

        // Button container (right aligned)
        const btnContainer = document.createElement("div");
        btnContainer.className = "flex gap-2";

        // Edit button
        const editBtn = document.createElement("button");
        editBtn.innerHTML = `<i class="fa-solid fa-pen text-pink-200 hover:text-pink-400"></i>`;
        editBtn.setAttribute("aria-label", `Edit task`);
        editBtn.setAttribute("aria-label", `Edit checklist`);
        editBtn.onclick = async (e) => {
            e.stopPropagation(); // prevent selecting checklist
            const newName = prompt("Rename checklist:", name);
            if (!newName) return;
            try {
                const res = await fetch(`/api/checklists/${name}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newName })
                });
                const data = await res.json();
                delete checklists[name];
                checklists[data.name] = data.tasks;
                currentChecklist = data.name;
                renderChecklists();
                renderTasks();
            } catch (err) {
                console.error("Failed to rename checklist:", err);
            }
        };

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = `<i class="fa-solid fa-trash text-pink-200 hover:text-pink-400"></i>`;
        deleteBtn.setAttribute("aria-label", `Delete checklist`);
        deleteBtn.setAttribute("aria-label", `Delete task`);
        deleteBtn.onclick = async (e) => {
            e.stopPropagation(); // prevent selecting checklist
            if (!confirm(`Delete checklist "${name}"?`)) return;
            try {
                await fetch(`/api/checklists/${name}`, { method: "DELETE" });
                delete checklists[name];
                if (currentChecklist === name) {
                    currentChecklist = Object.keys(checklists)[0] || null;
                }
                renderChecklists();
                renderTasks();
            } catch (err) {
                console.error("Failed to delete checklist:", err);
            }
        };

        btnContainer.appendChild(editBtn);
        btnContainer.appendChild(deleteBtn);

        li.appendChild(span);
        li.appendChild(btnContainer);
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

function renderTasks() {
    tasksActive.innerHTML = "";
    tasksCompleted.innerHTML = "";
    if (!currentChecklist) return;

    checklists[currentChecklist].forEach((task, index) => {
        const li = document.createElement("li");
        li.className = "flex items-center justify-between space-x-2";

        const leftDiv = document.createElement("div");
        leftDiv.className = "flex items-center space-x-2";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.onchange = () => toggleTask(index);

        const span = document.createElement("span");
        span.textContent = task.text;
        if (task.done) span.className = "line-through text-gray-600";

        leftDiv.appendChild(checkbox);
        leftDiv.appendChild(span);

        const btnContainer = document.createElement("div");
        btnContainer.className = "flex gap-2";

        // Edit button
        const editBtn = document.createElement("button");
        editBtn.innerHTML = `<i class="fa-solid fa-pen text-black hover:text-gray"></i>`;
        editBtn.onclick = async () => {
            const newText = prompt("Edit task:", task.text);
            if (!newText) return;
            try {
                const res = await fetch(`/api/checklists/${currentChecklist}/tasks/${index}/edit`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: newText })
                });
                const data = await res.json();
                checklists[data.name] = data.tasks;
                renderTasks();
            } catch (err) {
                console.error("Failed to edit task:", err);
            }
        };

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = `<i class="fa-solid fa-trash text-black hover:text-gray"></i>`;
        deleteBtn.onclick = async () => {
            if (!confirm("Delete this task?")) return;
            try {
                const res = await fetch(`/api/checklists/${currentChecklist}/tasks/${index}`, {
                    method: "DELETE"
                });
                const data = await res.json();
                checklists[data.name] = data.tasks;
                renderTasks();
            } catch (err) {
                console.error("Failed to delete task:", err);
            }
        };

        btnContainer.appendChild(editBtn);
        btnContainer.appendChild(deleteBtn);

        li.appendChild(leftDiv);
        li.appendChild(btnContainer);

        if (task.done) {
            tasksCompleted.appendChild(li);
        } else {
            tasksActive.appendChild(li);
        }
    });
}



const userMenuButton = document.getElementById("userMenuButton");
userMenuButton.setAttribute("aria-label", "User menu button");
const userMenu = document.getElementById("userMenu");
userMenu.setAttribute("aria-label", "User menu");

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

document.getElementById("logoutButton").setAttribute("aria-label", `Logout`);

document.getElementById("logoutButton").addEventListener("click", () => {
    window.location.href = "/logout";
});
