// Inicializar en DOMContentLoaded para que lottie pueda medir el contenedor
// antes de que otros recursos pesados bloqueen el hilo.
(function initSplash() {
    const LOTTIE_TIMEOUT_MS = 2000;   // máximo esperando a que DOMLoaded dispare
    const LOTTIE_DURATION_MS = 4500;  // tiempo máximo total de la animación
    const FADE_OUT_MS = 350;

    let hidden = false;

    function hideSplash() {
        if (hidden) return;
        hidden = true;
        const splash = document.getElementById('splash');
        const app   = document.getElementById('app');
        if (!splash || !app) return;
        splash.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            app.classList.add('show');
            app.removeAttribute('aria-hidden');
        }, FADE_OUT_MS);
    }

    function startFallback() {
        // Fallback CSS puro: muestra logo+texto durante 1.4s
        const splash = document.getElementById('splash');
        if (splash) requestAnimationFrame(() => splash.classList.add('show'));
        setTimeout(hideSplash, 1400);
    }

    function tryLottie() {
        const splash    = document.getElementById('splash');
        const container = document.getElementById('splash-lottie');

        if (!splash || !container || typeof lottie === 'undefined') {
            startFallback();
            return;
        }

        // Mostrar el splash con fallback visible desde el primer frame
        requestAnimationFrame(() => splash.classList.add('show'));

        let lottieReady = false;

        const anim = lottie.loadAnimation({
            container : container,
            renderer  : 'svg',
            loop      : false,
            autoplay  : true,
            path      : 'animations/splash-navirea.json'
        });

        anim.addEventListener('DOMLoaded', function () {
            lottieReady = true;
            container.classList.add('active');
            // Ocultar fallback: el SVG lottie toma el canvas completo
            var fb = document.querySelector('.splash-fallback');
            if (fb) fb.style.visibility = 'hidden';
        });

        anim.addEventListener('complete', hideSplash);

        anim.addEventListener('error', function () {
            // JSON inválido u otro error de lottie → cerrar con fallback
            setTimeout(hideSplash, 600);
        });

        // Si lottie no dispara DOMLoaded en LOTTIE_TIMEOUT_MS, usamos el fallback
        setTimeout(function () {
            if (!lottieReady) {
                anim.destroy();
                setTimeout(hideSplash, 800);
            }
        }, LOTTIE_TIMEOUT_MS);

        // Guardia absoluta por si complete nunca dispara
        setTimeout(hideSplash, LOTTIE_DURATION_MS);
    }

    // Ejecutar tan pronto como el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryLottie);
    } else {
        tryLottie();
    }
}());
