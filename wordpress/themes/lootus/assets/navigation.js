document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('[data-lootus-menu-toggle]')
  const menu = document.getElementById('lootus-nav-menu')

  if (!button || !menu) return

  const closeMenu = () => {
    menu.classList.remove('lootus-nav-menu-open')
    button.classList.remove('lootus-burger-open')
    button.setAttribute('aria-expanded', 'false')
    menu.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
  }

  const openMenu = () => {
    menu.classList.add('lootus-nav-menu-open')
    button.classList.add('lootus-burger-open')
    button.setAttribute('aria-expanded', 'true')
    menu.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
  }

  button.addEventListener('click', () => {
    menu.classList.contains('lootus-nav-menu-open') ? closeMenu() : openMenu()
  })

  menu.addEventListener('click', (event) => {
    if (event.target === menu) closeMenu()
  })

  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu))
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu()
  })
})