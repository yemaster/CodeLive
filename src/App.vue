<template>
    <n-message-provider>
        <router-view />
        <div class="footer">
            CopyRight &copy; {{ year }} yemaster. <a href="https://github.com/yemaster/codelive" target="_blank">GITHUB</a>
        </div>
    </n-message-provider>
</template>

<script>
import { NMessageProvider } from 'naive-ui'

export default {
    data() {
        return {
            year: new Date().getFullYear()
        }
    },
    components: {
        NMessageProvider
    }
}
</script>
