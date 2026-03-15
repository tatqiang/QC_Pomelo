import { createApp } from 'vue'
import { createPinia } from 'pinia'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import App from './App.vue'
import router from './router'
import './style.css'

// Register dayjs plugins required by hy-vue-gantt (.week() etc.)
dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)
dayjs.extend(customParseFormat)
dayjs.extend(advancedFormat)

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
