const http = require("http"),
    fs = require("fs"),
    mime = require("mime"),
    dir = "public/",
    port = 3000

let bucketList = ["Go stargazing", "Take a cooking class", "Weekend road trip"]

const server = http.createServer(function (request, response) {
  if (request.method === "GET") {
    handleGet(request, response)
  } else if (request.method === "POST") {
    handlePost(request, response)
  }
})

const handleGet = function (request, response) {
  const filename = dir + request.url.slice(1)

  if (request.url === "/") {
    sendFile(response, "public/index.html")
  } else if (request.url === "/data") {
    response.writeHead(200, { "Content-Type": "application/json" })
    response.end(JSON.stringify({ bucketList }))
  } else {
    sendFile(response, filename)
  }
}

const handlePost = function (request, response) {
  let dataString = ""

  request.on("data", function (data) {
    dataString += data
  })

  request.on("end", function () {
    let data = {}
    try {
      data = JSON.parse(dataString)
    } catch (e) {
      console.error("Invalid JSON received")
    }

    if (request.url === "/add") {
      if (data.item && typeof data.item === "string") {
        bucketList.push(data.item.trim())
      }
    } else if (request.url === "/delete") {
      const index = data.index
      if (typeof index === "number" && index >= 0 && index < bucketList.length) {
        bucketList.splice(index, 1)
      }
    }

    response.writeHead(200, { "Content-Type": "application/json" })
    response.end(JSON.stringify({ bucketList }))
  })
}

const sendFile = function (response, filename) {
  const type = mime.getType(filename)

  fs.readFile(filename, function (err, content) {
    if (err === null) {
      response.writeHeader(200, { "Content-Type": type })
      response.end(content)
    } else {
      response.writeHeader(404)
      response.end("404 Error: File Not Found")
    }
  })
}

server.listen(process.env.PORT || port, () =>
    console.log(`Server running on port ${port}`)
)
