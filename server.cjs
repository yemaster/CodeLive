/**
 * Codelive v0.0.1
 * /server.js
 * 
 * CopyRight 2023 (c) yemaster
 */


// Basic Configurations
// Set the host and port for the server to listen on
const host = process.env.HOST || '::'
const port = process.env.PORT || 3000
const devMode = false
const chatQueueMaxLength = 30

const appName = "Codelive"
const appVersion = "0.0.1"

const { join } = require("path")

// Create Fastify and set Static Directory
const fastify = require('fastify')
const app = fastify({
    logger: false,
})

app.register(require('@fastify/static'), {
    root: join(__dirname, 'dist'),
    prefix: '/'
})

app.get('/room/:id', (req, rep) => {
    rep.sendFile("index.html")
})

const socketio = require('fastify-socket.io')
app.register(socketio, {
    cors: true,
    options: {
        maxPayload: 1048576
    }
})

/**
 * Show Start Info
 */
function startPage() {
    console.log("     __  __  ______  ______  ____");
    console.log("    /\\ \\/\\ \\/\\  ___\\/\\__  _\\/\\  _`\\");
    console.log("    \\ \\ \\ \\ \\ \\ \\__/\\/_/\\ \\/\\ \\ \\/\\_\\");
    console.log("     \\ \\ \\ \\ \\ \\___``\\ \\ \\ \\ \\ \\ \\/_/_");
    console.log("      \\ \\ \\_\\ \\/\\ \\L\\ \\ \\ \\ \\ \\ \\ \\L\\ \\");
    console.log("       \\ \\_____\\ \\____/  \\ \\_\\ \\ \\____/");
    console.log("        \\/_____/\\/___/    \\/_/  \\/___/");
    console.log(`${appName} - v${appVersion}`)
    console.log("----------------------")
}

// Store Each Room Info
let roomList = {}
// Store Each players' room
let playerRoom = {}
// Store Each Room Code
let roomCode = {}
let roomCodeVersion = {}
let roomCodeReserve = {}

let updateLock = {}

function updateRoomCode(rid) {
    if (updateLock[rid])
        return
    updateLock[rid] = true
    let nowVersion = roomCodeVersion[rid]
    let p = roomCodeReserve[rid].findIndex(v => v.v === nowVersion + 1)
    let codeSlice = roomCode[rid].split("\n")
    while (p !== -1) {
        let codeDiff = roomCodeReserve[rid][p].d
        let addCount = 0, deleteCount = 0
        codeDiff.forEach(i => {
            // Add a Line
            if (i.t === 'a') {
                codeSlice.splice(i.p, 0, i.c)
                addCount++
            }
            // Delete a Line
            else {
                codeSlice.splice(i.p - deleteCount + addCount, 1)
                deleteCount++
            }
            //console.log(i)
            //console.log(codeSlice)
        })
        roomCodeVersion[rid]++
        nowVersion = roomCodeVersion[rid]
        roomCodeReserve[rid].splice(p, 1)
        p = roomCodeReserve[rid].findIndex(v => { v.v === nowVersion + 1 })
    }
    roomCode[rid] = codeSlice.join("\n")
    delete updateLock[rid]
    //console.log(roomCodeVersion[rid], roomCode[rid])
}

app.listen({ port, host }, (err, add) => {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    startPage()
    console.log(`App is running at ${add}!`)

    // Socket.io system
    app.io.on('connection', socket => {
        socket.on('update_room', (rid, uinfo) => {
            socket.join(`Room-${rid}`)
            playerRoom[socket.id] = rid
            if (!roomList[rid])
                roomList[rid] = {
                    rid,
                    share: null,
                    members: [],
                    code: "",
                }
            let pid = -1
            for (let i = 0; i < roomList[rid].members.length; ++i) {
                if (roomList[rid].members[i].id === socket.id) {
                    pid = i
                    break
                }
            }
            if (pid === -1) {
                const t = uinfo
                t["id"] = socket.id
                roomList[rid].members.push(t)
                socket.emit("init-room", roomList[rid])
                app.io.to(`Room-${rid}`).emit("update-member", t)
                if (roomList[rid].share) {
                    socket.emit("init-code", {
                        c: roomCode[rid],
                        v: roomCodeVersion[rid],
                        r: roomCodeReserve[rid],
                    })
                }
            }
            else {
                for (let i in uinfo) {
                    roomList[rid].members[pid][i] = uinfo[i]
                }
                app.io.to(`Room-${rid}`).emit("update-member", t)
            }
        })

        socket.on("update-share", () => {
            const rid = playerRoom[socket.id]
            if (roomList[rid].share) {
                socket.emit("notification", { t: "error", c: "已经有人在分享代码了" })
                return
            }
            roomList[rid].share = socket.id
            app.io.to(`Room-${rid}`).emit("update-share", socket.id)
            roomCode[rid] = ""
            roomCodeVersion[rid] = 0
            roomCodeReserve[rid] = []
        })

        socket.on("end-share", () => {
            const rid = playerRoom[socket.id]
            delete roomCode[rid]
            delete roomCodeVersion[rid]
            delete roomCodeReserve[rid]
            if (roomList[rid].share === socket.id) {
                app.io.to(`Room-${rid}`).emit("update-share", null)
                roomList[rid].share = null
            }
            else {
                socket.emit("notification", { t: "error", c: "你并没有在分享代码" })
            }
        })

        socket.on("update-code", (data) => {
            const rid = playerRoom[socket.id]
            if (roomList[rid].share === socket.id) {
                //console.log(data)
                app.io.to(`Room-${rid}`).emit("update-code", data)
                roomCodeReserve[rid].push(data)
                updateRoomCode(rid)

            }
            else {
                socket.emit("notification", { t: "error", c: "你并没有在分享代码" })
            }
        })

        socket.on('disconnect', () => {
            const joinedRoom = playerRoom[socket.id]
            roomList[joinedRoom].members = roomList[joinedRoom].members.filter((v) => v.id !== socket.id)
            if (roomList[joinedRoom].share === socket.id) {
                app.io.to(`Room-${joinedRoom}`).emit("update-share", null)
                roomList[joinedRoom].share = null
            }
            if (roomList[joinedRoom].members.length === 0)
                delete roomList[joinedRoom]
            delete playerRoom[socket.id]
            app.io.to(`Room-${joinedRoom}`).emit("leave-member", socket.id)
            //console.log(`${socket.id} disconnected`)
        })

        socket.on('chat', (m) => {
            const joinedRoom = playerRoom[socket.id]
            app.io.to(`Room-${joinedRoom}`).emit("chat", { i: socket.id, c: m })
        })
    })
})