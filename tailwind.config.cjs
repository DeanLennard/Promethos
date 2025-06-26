/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/app/**/*.{js,jsx,ts,tsx}',      // your App Router files
        './src/pages/**/*.{js,jsx,ts,tsx}',    // if you have a pages/ dir
        './src/components/**/*.{js,jsx,ts,tsx}'// if you have a components/ dir
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50:  '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
                neutral: {
                    DEFAULT: '#4b5563',
                    light:   '#6b7280',
                    dark:    '#374151',
                },
                accent: {
                    50:  '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                },
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui'],
            },
            boxShadow: {
                card: '0 4px 12px rgba(0,0,0,0.05)',
            },
        },
    },
    plugins: [],
};
