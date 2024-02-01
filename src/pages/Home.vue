<script setup>
import { NH1, NForm, NFormItem, NInput, NButton, NInputGroup } from 'naive-ui'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/states'

// Store
const store = useStore()

// Form
const formRef = ref()

const userInfo = ref({
    roomId: "",
    username: "",
})
if (localStorage && localStorage.u5tcname)
    userInfo.value.username = localStorage.u5tcname

const rules = ref({
    roomId: {
        required: false,
    },
    username: {
        required: true,
        min: 3,
        max: 15,
        message: "用户名长度在3~15个字符！",
        trigger: 'blur'
    }
})

const router = useRouter()

function randId() {
    const words = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
    let res = ""
    for (let i = 0; i < 6; ++i)
        res += words[Math.floor(Math.random() * words.length)]
    return res
}

function enterRoom(e) {
    e.preventDefault()
    formRef.value?.validate((e) => {
        if (!e) {
            store.username = userInfo.value.username
            if (localStorage)
                localStorage.u5tcname = userInfo.value.username
            if (userInfo.value.roomId.length !== 6) {
                userInfo.value.roomId = randId()
            }
            router.push({
                name: "Room",
                params: { id: userInfo.value.roomId }
            })
        }
    })
}
</script>

<template>
    <div class="show">
        <n-h1>U5TC Code Live Platform</n-h1>
        <n-form ref="formRef" inline :model="userInfo" :rules="rules">
            <n-form-item path="username">
                <n-input v-model:value="userInfo.username" type="text" placeholder="输入用户名" />
            </n-form-item>
            <n-form-item path="roomId">
                <n-input v-model:value="userInfo.roomId" type="text" placeholder="输入Live Room ID(留空将随机生成)" />
            </n-form-item>
            <n-form-item>
                <n-button type="primary" attr-type="button" @click="enterRoom">
                    进入
                </n-button>
            </n-form-item>
        </n-form>
    </div>
</template>

<style scoped>
.show {
    position: absolute;
    top: 50%;
    left: 50%;
    text-align: center;
    transform: translate(-50%, -50%);
}
</style>