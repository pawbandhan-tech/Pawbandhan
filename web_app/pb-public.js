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
                const open = links.classList.toggle('open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
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

    function animateCounter(el, target, duration) {
        if (!el || isNaN(target)) return;
        var start = 0;
        var startTime = null;
        var card = el.closest('.pb-stat');
        function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min((ts - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = fmt(Math.round(start + (target - start) * eased));
            if (p < 1) requestAnimationFrame(step);
            else if (card) card.classList.add('pb-stat-animated');
        }
        requestAnimationFrame(step);
    }

    function initTrackerDemo() {
        var steps = document.querySelectorAll('.pb-track-step');
        if (!steps.length) return;
        var idx = 2;
        setInterval(function () {
            steps.forEach(function (s, i) {
                s.classList.remove('active');
                if (i < idx) s.classList.add('done');
                else s.classList.remove('done');
            });
            if (steps[idx]) steps[idx].classList.add('active');
            idx = (idx + 1) % steps.length;
            if (idx === 0) idx = 1;
        }, 2800);
    }

    async function loadCms() {
        if (!window.PAW_SITE) {
            loadStories();
            return;
        }
        try {
            var config = await PAW_SITE.fetchJson('/api/site-config');
            if (config.hero_title) {
                var h1 = document.querySelector('.pb-hero h1');
                if (h1 && config.hero_title.indexOf('paw') === -1) {
                    /* keep creative headline unless CMS has custom full title */
                }
            }
            if (config.hero_subtitle) {
                var sub = document.getElementById('heroSubtitle');
                if (sub) sub.textContent = config.hero_subtitle;
            }
            var contactEmail = config.emergency_hotline || config.contact_email || 'pawbandhan@gmail.com';
            ['heroHotline', 'footerHotline'].forEach(function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                el.textContent = contactEmail;
                if (el.href !== undefined) el.href = 'mailto:' + contactEmail;
            });
        } catch (e) { /* optional */ }

        try {
            var stats = await PAW_SITE.fetchJson('/api/stats');
            var map = {
                statRescues: stats.totalRescues,
                statNgos: stats.totalNGOs,
                statHeroes: stats.totalRiders,
                statVets: stats.totalDoctors
            };
            Object.keys(map).forEach(function (id) {
                var el = document.getElementById(id);
                if (el) animateCounter(el, Number(map[id]) || 0, 1400);
            });
            var hr = document.getElementById('heroRescues');
            if (hr && stats.totalRescues) {
                var t = Number(stats.totalRescues) || 0;
                var start = 0;
                var startTime = null;
                function heroStep(ts) {
                    if (!startTime) startTime = ts;
                    var p = Math.min((ts - startTime) / 1200, 1);
                    var eased = 1 - Math.pow(1 - p, 3);
                    hr.textContent = fmt(Math.round(start + (t - start) * eased)) + '+ rescues';
                    if (p < 1) requestAnimationFrame(heroStep);
                }
                requestAnimationFrame(heroStep);
            }
        } catch (e) {
            ['statRescues', 'statNgos', 'statHeroes', 'statVets'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.textContent = '—';
            });
        }

        loadStories();
    }

    var FALLBACK_STORIES = [
        {
            title: 'Bruno walked again',
            description: 'A hit-and-run left Bruno unable to stand. An NGO accepted the case within minutes; a hero reached the spot in 12 minutes. After surgery and foster care, he was adopted by the family that first reported him.',
            image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=85',
            tag: 'Full recovery',
            meta: 'Mumbai · 14 days'
        },
        {
            title: 'Kittens under the flyover',
            description: 'Five neonatal kittens were boxed and left near traffic. Volunteers warmed them, a vet stabilized feeding, and a shelter found bottle-feed fosters within 48 hours.',
            image_url: 'https://images.unsplash.com/photo-1548199973-03cce0fe87b9?w=600&q=80',
            tag: 'Litter rescue',
            meta: 'Pune · 2 days'
        },
        {
            title: 'Spirit healed at sunrise',
            description: 'Malnutrition and mange had left Spirit too weak to move. Live tracking kept the reporter updated through treatment until release back to a monitored colony.',
            image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&q=80',
            tag: 'Released safe',
            meta: 'Delhi · 3 weeks'
        }
    ];

    function esc(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function storyCard(s, featured) {
        var img = s.image_url || 'https://images.unsplash.com/photo-1548199973-03cce0fe87b9?w=600&q=80';
        var tag = s.tag || 'Rescue story';
        var meta = s.meta || s.location || '';
        var desc = (s.description || '').slice(0, featured ? 220 : 130);
        var cls = featured ? 'pb-story pb-story-featured' : 'pb-story';
        return '<article class="' + cls + '">' +
            '<div class="pb-story-media">' +
            '<span class="pb-story-tag">' + esc(tag) + '</span>' +
            '<img src="' + esc(img) + '" alt="" loading="lazy">' +
            '</div>' +
            '<div class="pb-story-body">' +
            '<h4>' + esc(s.title || 'A life saved') + '</h4>' +
            '<p>' + esc(desc) + (desc.length < (s.description || '').length ? '…' : '') + '</p>' +
            (meta ? '<span class="pb-story-meta"><i class="fas fa-location-dot"></i> ' + esc(meta) + '</span>' : '') +
            '</div></article>';
    }

    function renderStories(list) {
        var grid = document.getElementById('storiesGrid');
        if (!grid) return;
        var items = (list && list.length) ? list.slice(0, 3) : FALLBACK_STORIES;
        if (!items.length) items = FALLBACK_STORIES;
        grid.setAttribute('aria-busy', 'false');
        grid.innerHTML = items.map(function (s, i) {
            return storyCard(s, i === 0);
        }).join('');
    }

    async function loadStories() {
        var grid = document.getElementById('storiesGrid');
        if (!grid || !window.PAW_SITE) {
            renderStories(FALLBACK_STORIES);
            return;
        }
        try {
            var stories = await PAW_SITE.fetchJson('/api/stories');
            if (stories && stories.length) {
                var mapped = stories.slice(0, 3).map(function (s, i) {
                    return {
                        title: s.title,
                        description: s.description,
                        image_url: s.image_url,
                        location: s.location,
                        tag: i === 0 ? 'Featured' : 'Recovery',
                        meta: s.location || ''
                    };
                });
                renderStories(mapped);
            } else {
                renderStories(FALLBACK_STORIES);
            }
        } catch (e) {
            renderStories(FALLBACK_STORIES);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initNav();
        initReveal();
        initTrackerDemo();
        loadCms();
    });
})();
