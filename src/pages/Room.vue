<script setup>
// Naive-ui components
import { NButton, NSplit, NTabs, NTabPane, NPopover, NAvatar, NDivider, NCard, NRadioGroup, NRadio, NScrollbar, NList, NListItem, NInput, NIcon, NSelect, useMessage } from 'naive-ui'
import { MenuSharp } from '@vicons/ionicons5'

// monaco-editor units
import * as monaco from 'monaco-editor'
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution'

import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

import { onBeforeUnmount, nextTick, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'

// result dom
const resultShow = ref()

// code Content
let codeContent = ref(`<!DOCTYPE html>
<html>

<body style='margin:0'>
    <p style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:42px;font-weight:300'>U5TC
        CodeLive</p>
</body>

</html>`)

// monaco-editor set
self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new htmlWorker()
        }
        return new editorWorker()
    },
}

let editor

function updateIframe() {
    codeContent.value = editor.getValue();
    if (resultShow?.value) {
        const ifr = document.createElement("iframe")
        ifr.setAttribute("frameborder", "0")
        ifr.setAttribute("id", "iframeResult")
        ifr.setAttribute("width", "100%")
        ifr.setAttribute("height", "100%")
        resultShow.value.innerHTML = ""
        resultShow.value.appendChild(ifr)
        const ifrw = (ifr.contentWindow) ? ifr.contentWindow : (ifr.contentDocument.document) ? ifr.contentDocument.document : ifr.contentDocument
        ifrw.document.open()
        ifrw.document.write(codeContent.value)
        ifrw.document.close()
    }
}

// Editor Themes
//import { tomorrow, tomorrowNight, textmate } from "@/assets/editor-themes"
const nowTheme = ref("vs")
//const editorThemes = ref([{ label: "tomorrow", value: "tomorrow", v: tomorrow },
//{ label: "tomorrow-night", value: "tomorrow-night", v: tomorrowNight },
//{ label: "Textmate", value: "textmate", v: textmate }])
const editorThemes = ref([{ label: "vs", value: "vs" }, { label: "vs-dark", value: "vs-dark" }])

const editorInit = () => {
    nextTick(() => {
        for (let i of editorThemes.value)
            if (i.v)
                monaco.editor.defineTheme(i.label, i.v)
        if (!editor) {
            editor = monaco.editor.create(document.getElementById('codeEditor'), {
                value: codeContent.value,
                language: 'html',
                theme: 'tomorrow',
                automaticLayout: true,
                readOnly: false,
                fontSize: 16,
            })
        }
        else {
            editor.setValue(codeContent.value)
            editor.updateOptions({
                language: 'html',
                theme: 'vs',
            })
        }

        editor.onDidChangeModelContent((val) => {
            updateIframe()
        })

        updateIframe()
    })
}

watch(() => nowTheme.value, (v) => {
    editor.updateOptions({
        theme: v
    })
})

editorInit()

let combineDirection = ref("horizontal")
let tabPosition = ref("top")
let isDragging = ref(false)

function handleOnDragStart() {
    isDragging.value = true
}
function handleOnDragEnd() {
    isDragging.value = false
}

// pinia Store
import { useStore } from '@/states'
const store = useStore()

if (localStorage && localStorage.u5tcname)
    store.username = localStorage.u5tcname

const route = useRoute()
const roomId = ref(route.params.id)
const userInfo = ref({
    username: store.username
})
const roomInfo = ref({
    rid: route.params.id,
    share: null,
    members: [],
    code: "",
})

// Socket.io
import { io } from "socket.io-client"

const connected = ref(false)
let socket

// Message Queue
const popMessage = useMessage()
const messages = ref([])
const messageBox = ref()
const chatMessage = ref("")
const memberMap = {}

onMounted(() => {
    socket = io("http://127.0.0.1:3000")
    socket.on("connect", () => {
        connected.value = true
        userInfo.value.id = socket.id
        socket.emit("update_room", roomId.value, userInfo.value)
    })
    socket.on("disconnect", () => {
        connected.value = false
    })
    // Initialize room info
    socket.on("init-room", data => {
        roomInfo.value = data
        for (let i of roomInfo.value.members)
            memberMap[i.id] = i
    })
    // Room member info update
    socket.on("update-member", data => {
        let pid = -1
        //console.log(data, roomInfo.value.members)
        memberMap[data.id] = data
        for (let i = 0; i < roomInfo.value.members.length; ++i)
            if (roomInfo.value.members[i].id === data.id) {
                pid = i
                break
            }
        if (pid === -1) {
            messages.value.push({ t: 's', c: `${data.username}进入了房间` })
            roomInfo.value.members.push(data)
        }
        else {
            for (let i in data)
                roomInfo.value.members[pid][i] = data[i]
        }
    })
    // Room member leave
    socket.on("leave-member", data => {
        const u = memberMap[data].username
        messages.value.push({ t: 's', c: `${u}退出了房间` })
        delete memberMap[data]
        roomInfo.value.members = roomInfo.value.members.filter(v => v.id !== data)
    })

    // Chat Message
    socket.on("chat", (d) => {
        d.t = "m"
        d.u = memberMap[d.i].username
        messages.value.push(d)
    })
})

function sendMessage() {
    if (chatMessage.value.length === 0) {
        popMessage.error("消息内容不能为空")
        return
    }
    socket.emit("chat", chatMessage.value)
    chatMessage.value = ""
}

watch(() => messages.value.length, () => {
    messageBox.value.scrollTo({ top: 2100000 })
})

onBeforeUnmount(() => {
    // Disconnect socket before unmounted
    socket.disconnect()
})
</script>

<template>
    <div class="status-bar">
        <n-popover trigger="hover">
            <template #trigger>
                <div class="ball" :class="{ red: !connected, green: connected }"></div>
            </template>
            <span>
                <template v-if="connected">已连接</template>
                <template v-else>未连接</template>
            </span>
        </n-popover>
    </div>
    <n-split :direction="combineDirection" @drag-start="handleOnDragStart" @drag-end="handleOnDragEnd" style="height: 100vh"
        :min="0.25" :max="0.75">
        <template #1>
            <div id="codeEditor" style="height: 100%; width: 100%"></div>
        </template>
        <template #2>
            <div class="resultBox">
                <div class="resultMog" v-show="isDragging"></div>
                <div class="resultShow" ref="resultShow"></div>
            </div>
        </template>
    </n-split>
    <n-popover style="max-height: 60vh; height: 400px; width: 300px; padding: 0;" trigger="click"
        content-style="height: 100%;">
        <template #trigger>
            <n-button size="large" circle class="command-button">
                <template #icon>
                    <n-icon><menu-sharp /></n-icon>
                </template>
            </n-button>
        </template>
        <n-tabs :placement="tabPosition" type="line" animated :tabs-padding="20"
            pane-wrapper-style="position: relative; height: 100%"
            pane-style="position: relative; padding: 0; height: 100%;">
            <n-tab-pane display-directive="show" name="chat" tab="聊天">
                <div style="height: 100%">
                    <n-scrollbar style="height:calc(100% - 34px);width: 100%;padding: 12px 20px;box-sizing: border-box;"
                        :x-scrollable="true" ref="messageBox">
                        <template v-for="m in messages">
                            <div v-if="m.t === 's'" class="v-message-system">
                                {{ m.c }}
                            </div>
                            <div v-else-if="m.i === userInfo.id" class="v-message me">
                                <div class="left">
                                    <div class="v-message-info">{{ m.u }}</div>
                                    <div class="v-message-content">{{ m.c }}</div>
                                </div>
                                <div class="v-message-avatar">
                                    <n-avatar round>
                                        {{ userInfo.username[0] }}
                                    </n-avatar>
                                </div>
                            </div>
                            <div v-else class="v-message">
                                <div class="v-message-avatar">
                                    <n-avatar round>
                                        {{ m.u[0] }}
                                    </n-avatar>
                                </div>
                                <div class="right">
                                    <div class="v-message-info">{{ m.u }}</div>
                                    <div class="v-message-content">{{ m.c }}</div>
                                </div>
                            </div>
                        </template>
                    </n-scrollbar>
                    <n-input class="v-chatter" v-model:value="chatMessage" placeholder="输入以聊天" @keyup.enter="sendMessage"
                        :disabled="!connected"></n-input>
                </div>
            </n-tab-pane>
            <n-tab-pane display-directive="show" name="info" tab="信息">
                <n-scrollbar style="height: 100%;width: 100%;padding: 12px 20px;box-sizing: border-box;"
                    :x-scrollable="true">
                    <n-divider title-placement="left">
                        房间信息
                    </n-divider>
                    <n-card title="房间ID" size="small">
                        {{ roomId }}
                    </n-card>
                    <n-card title="代码分享者" size="small">
                        <template v-if="roomInfo.share">
                            {{ roomInfo.share }}
                        </template>
                        <template v-else>
                            还没人分享
                        </template>
                    </n-card>
                    <n-card title="观看者" size="small">
                        共{{ roomInfo.members.length }}人观看
                        <n-list>
                            <n-list-item v-for="(p, i) in roomInfo.members">
                                {{ p.username }}({{ p.id }})
                            </n-list-item>
                        </n-list>
                    </n-card>
                    <n-divider title-placement="left">
                        个人信息
                    </n-divider>
                    <n-card title="Socket ID" size="small">
                        {{ userInfo.id }}
                    </n-card>
                </n-scrollbar>
            </n-tab-pane>
            <n-tab-pane display-directive="show" name="settings" tab="设置">
                <n-scrollbar style="height: 100%;width: 100%;padding: 12px 20px;box-sizing: border-box;"
                    :x-scrollable="true">
                    <n-divider title-placement="left">
                        个人信息
                    </n-divider>
                    <n-card title="用户名" size="small">
                        <n-input v-model:value="userInfo.username" type="text" placeholder="输入用户名" />
                    </n-card>
                    <n-divider title-placement="left">
                        界面设置
                    </n-divider>
                    <n-card title="代码预览排布" size="small">
                        <n-radio-group v-model:value="combineDirection">
                            <n-radio label="横向" value="horizontal" />
                            <n-radio label="纵向" value="vertical" />
                        </n-radio-group>
                    </n-card>
                    <n-card title="标签页位置" size="small">
                        <n-radio-group v-model:value="tabPosition">
                            <n-radio label="左侧" value="left" />
                            <n-radio label="上侧" value="top" />
                            <n-radio label="右侧" value="right" />
                        </n-radio-group>
                    </n-card>
                    <n-divider title-placement="left">
                        编辑器设置
                    </n-divider>
                    <n-card title="编辑器主题" size="small">
                        <n-select placeholder="选择语言" filterable v-model:value="nowTheme" :options="editorThemes"></n-select>
                    </n-card>
                </n-scrollbar>
            </n-tab-pane>
        </n-tabs>
    </n-popover>
</template>

<style scoped>
.resultBox {
    position: relative;
    width: 100%;
    height: 100%;
}

.resultMog {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background-color: transparent;
}

.resultShow {
    width: 100%;
    height: 100%;
}

.n-card {
    margin-top: 10px;
}

.status-bar {
    position: fixed;
    bottom: 10px;
    right: 10px;
}

.ball {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.ball.red {
    background-color: #db2828;
}

.ball.green {
    background-color: #47af50;
}

.command-button {
    position: fixed;
    bottom: 50px;
    right: 50px;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, .2);
}

.command-button:hover {
    border: none;
    box-shadow: 0 4px 8px rgba(0, 0, 0, .2);
}
</style>