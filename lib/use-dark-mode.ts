import useDarkModeImpl from '@fisch0920/use-dark-mode'

export function useDarkMode() {
  const darkMode = useDarkModeImpl(false, { 
    classNameDark: 'dark-mode',
    storageKey: 'darkMode',
    // Ensure consistent initial value for SSR
    initialValue: false
  })

  return {
    isDarkMode: darkMode.value,
    toggleDarkMode: darkMode.toggle
  }
}
