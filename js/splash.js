window.addEventListener('load', () => {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');

    // arrancar la animación (fade+zoom in)
    requestAnimationFrame(() => splash.classList.add('show'));

    // simula inicialización de la app y oculta el splash
    setTimeout(() => {
        splash.classList.remove('show'); // fade out
        splash.style.transition = 'opacity 300ms ease';
        setTimeout(() => {
            splash.style.display = 'none';
            app.classList.add('show');
            app.removeAttribute('aria-hidden');
        }, 300);
    }, 1200); // duración total del splash visible (ajusta si hace falta)
});
