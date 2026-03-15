import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

/**
 * QC System — Teal/Slate dark theme
 * Palette: #192428 bg | #2d383c surface | #414c50 variant | #0784b5 primary | #39ace7 accent
 */
const qcTheme = {
    dark: true,
    colors: {
        background: '#192428',
        surface: '#2d383c',
        'surface-bright': '#414c50',
        'surface-variant': '#414c50',
        primary: '#39ace7',
        'primary-darken-1': '#0784b5',
        secondary: '#0784b5',
        'secondary-darken-1': '#065f8a',
        error: '#EF4444',
        info: '#39ace7',
        success: '#22C55E',
        warning: '#F59E0B',
        'on-background': '#E2E8F0',
        'on-surface': '#E2E8F0',
        'on-primary': '#FFFFFF',
        'on-secondary': '#FFFFFF',
    }
}

export default createVuetify({
    theme: {
        defaultTheme: 'qcTheme',
        themes: { qcTheme }
    },
    defaults: {
        VBtn: {
            rounded: 'lg',
            variant: 'flat',
        },
        VCard: {
            rounded: 'xl',
            variant: 'outlined',
        },
        VTextField: {
            variant: 'outlined',
            density: 'comfortable',
        },
        VDialog: {
            // Cards inside dialogs must be elevated (solid bg), not outlined (transparent)
            VCard: {
                variant: 'flat',
                color: 'surface',
            },
        },
    }
})
