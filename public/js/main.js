async function loadData() {
  const res = await fetch("/data")
  const { bucketList } = await res.json()
  updateList(bucketList)
}

function updateList(items) {
  const list = document.getElementById("bucketList")
  list.innerHTML = ""

  items.forEach((item, idx) => {
    const li = document.createElement("li")
    li.className =
        "flex justify-between items-center bg-pink-100 rounded-xl px-4 py-2 shadow"

    li.innerHTML = `
      <span class="text-pink-800 font-medium">${item}</span>
      <div class="space-x-2">
        <button data-index="${idx}" class="complete text-sm text-green-600 hover:text-green-800">✓ Done</button>
        <button data-index="${idx}" class="delete text-sm text-red-500 hover:text-red-700">Remove</button>
      </div>
    `

    list.appendChild(li)
  })

  // hook up delete buttons
  document.querySelectorAll(".delete").forEach((btn) => {
    btn.onclick = async function () {
      const index = parseInt(this.getAttribute("data-index"))
      const response = await fetch("/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      })
      const { bucketList } = await response.json()
      updateList(bucketList)
    }
  })

  // hook up complete buttons
  document.querySelectorAll(".complete").forEach((btn) => {
    btn.onclick = function () {
      const span = this.closest("li").querySelector("span")
      span.classList.toggle("line-through")
      span.classList.toggle("opacity-60")
    }
  })
}

async function addItem(event) {
  event.preventDefault()

  const input = document.getElementById("bucketItem")
  const value = input.value.trim()
  if (!value) return

  const response = await fetch("/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item: value }),
  })

  const { bucketList } = await response.json()
  updateList(bucketList)
  input.value = ""
}

window.onload = function () {
  loadData()
  document.getElementById("addForm").onsubmit = addItem
}
