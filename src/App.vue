<template>
    <router-view />
    <div class="footer">
        CopyRight &copy; {{ year }} yemaster. <a href="https://github.com/yemaster/codelive" target="_blank">GITHUB</a>
    </div>
</template>

<script>
export default {
    data () {
        return {
            year: new Date().getFullYear()
        }
    }
}
</script>
