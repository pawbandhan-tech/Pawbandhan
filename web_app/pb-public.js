(function () {
    function initNav() {
        const nav = document.getElementById('pbNav');
        const toggle = document.getElementById('pbNavToggle');
        const links = document.getElementById('pbNavLinks');
        if (!nav) return;
        window.addEventListener('scroll', function () {
            nav.classList.toggle('scrolled', window.scrollY > 40);
        });
        if (toggle && links) {
            toggle.addEventListener('click', function () {
                links.classList.toggle('open');
            });
            links.querySelectorAll('a').forEach(function (a) {
                a.addEventListener('click', function () { links.classList.remove('open'); });
            });
        }
    }

    function initReveal() {
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) e.target.classList.add('visible');
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.pb-reveal').forEach(function (el) { obs.observe(el); });
    }

    function fmt(n) {
        var x = Number(n) || 0;
        return x >= 1000 ? (x / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(x);
    }

    async function loadCms() {
        if (!window.PAW_SITE) return;
        try {
            var config = await PAW_SITE.fetchJson('/api/site-config');
            if (config.hero_subtitle) {
                var sub = document.getElementById('heroSubtitle');
                if (sub) sub.textContent = config.hero_subtitle;
            }
            if (config.hotline) {
                ['heroHotline', 'footerHotline'].forEach(function (id) {
                    var el = document.getElementById(id);
                    if (el) el.textContent = config.hotline;
                });
            }
        } catch (e) { /* optional */ }

        try {
            var stats = await PAW_SITE.fetchJson('/api/stats');
            var map = {
                statRescues: stats.totalRescues,
                statNgos: stats.totalNGOs,
                statHeroes: stats.totalRiders || stats.totalVolunteers,
                statVets: stats.totalDoctors
            };
            Object.keys(map).forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.textContent = fmt(map[id]);
            });
            var hr = document.getElementById('heroRescues');
            if (hr && stats.totalRescues) hr.textContent = fmt(stats.totalRescues) + '+ rescues';
        } catch (e) {
            ['statRescues', 'statNgos', 'statHeroes', 'statVets'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.textContent = '—';
            });
        }

        try {
            var stories = await PAW_SITE.fetchJson('/api/stories');
            var grid = document.getElementById('storiesGrid');
            if (grid && stories && stories.length) {
                grid.innerHTML = stories.slice(0, 6).map(function (s) {
                    return '<article class="pb-story">' +
                        '<img src="' + (s.image_url || '') + '" alt="">' +
                        '<div class="pb-story-body"><h4>' + (s.title || '') + '</h4>' +
                        '<p>' + (s.description || '').slice(0, 120) + '</p></div></article>';
                }).join('');
            }
        } catch (e) { /* optional */ }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initNav();
        initReveal();
        loadCms();
    });
})();
