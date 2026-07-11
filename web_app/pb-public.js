(function () {
    var PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1548199973-03cce0fe87b9?w=800&q=80';

    function initNav() {
        var nav = document.getElementById('pbNav');
        var toggle = document.getElementById('pbNavToggle');
        var links = document.getElementById('pbNavLinks');
        if (!nav) return;
        window.addEventListener('scroll', function () {
            nav.classList.toggle('scrolled', window.scrollY > 40);
        });
        if (toggle && links) {
            toggle.addEventListener('click', function () {
                var open = links.classList.toggle('open');
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
                if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
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
        function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min((ts - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = fmt(Math.round(start + (target - start) * eased));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function initJourneyHighlight() {
        var track = document.getElementById('pbJourneyTrack');
        if (!track) return;
        var steps = track.querySelectorAll('.pb-journey-step');
        if (!steps.length) return;
        var idx = 0;
        setInterval(function () {
            steps.forEach(function (s) { s.classList.remove('active'); });
            steps[idx].classList.add('active');
            idx = (idx + 1) % steps.length;
        }, 3200);
    }

    function resolveImageUrl(url) {
        if (!url || !String(url).trim()) return '';
        var u = String(url).trim();
        if (/^https?:\/\//i.test(u)) return u;
        var base = window.PAW_MEDIA_BASE != null ? window.PAW_MEDIA_BASE : (window.PAW_API_BASE || '');
        if (u.startsWith('/')) return base + u;
        return base + '/' + u.replace(/^\//, '');
    }

    function esc(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el && text) el.textContent = text;
    }

    function applySiteConfig(config) {
        if (!config) return;
        setText('siteNameNav', config.site_name);
        setText('siteTaglineNav', config.site_tagline);
        setText('footerSiteName', config.site_name);
        setText('footerSiteTagline', config.site_tagline);
        if (config.site_name) {
            document.title = config.site_name + ' | India\'s kindest animal rescue network';
        }
        if (config.hero_badge) {
            var badge = document.getElementById('heroBadge');
            if (badge) badge.innerHTML = '<i class="fas fa-shield-heart"></i> ' + esc(config.hero_badge);
        }
        if (config.hero_title) {
            var h1 = document.getElementById('heroTitle');
            if (h1) h1.textContent = config.hero_title;
        }
        if (config.hero_subtitle) {
            var sub = document.getElementById('heroSubtitle');
            if (sub) sub.textContent = config.hero_subtitle;
        }
        if (config.hero_banner) {
            var img = document.getElementById('heroBannerImg');
            if (img) {
                img.src = resolveImageUrl(config.hero_banner) || config.hero_banner;
                img.onerror = function () {
                    this.onerror = null;
                    this.src = PLACEHOLDER_IMG;
                };
            }
        }
        setText('storiesSectionTitle', config.stories_section_title);
        setText('storiesSectionLead', config.stories_section_lead);
        setText('storiesEmptyMsg', config.stories_empty_message);
        if (config.footer_tagline) {
            var ft = document.querySelector('.pb-footer-brand p');
            if (ft) ft.textContent = config.footer_tagline;
        }
        setText('footerCopyright', config.footer_copyright);
        var contactEmail = config.emergency_hotline || config.contact_email || 'pawbandhan@gmail.com';
        ['heroHotline', 'footerHotline'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.textContent = contactEmail;
            if (el.href !== undefined) el.href = 'mailto:' + contactEmail;
        });
    }

    async function loadCms() {
        if (!window.PAW_SITE) {
            loadStories();
            return;
        }
        try {
            var config = await PAW_SITE.fetchJson('/api/site-config');
            applySiteConfig(config);
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

    function storyCard(s, featured) {
        var img = resolveImageUrl(s.image_url) || PLACEHOLDER_IMG;
        var tag = s.category || s.tag || 'Rescue story';
        var meta = s.location || s.meta || '';
        var desc = (s.description || '').slice(0, featured ? 220 : 130);
        var cls = featured ? 'pb-story pb-story-featured' : 'pb-story';
        var safeImg = img.replace(/"/g, '&quot;');
        return '<article class="' + cls + '">' +
            '<div class="pb-story-media">' +
            '<span class="pb-story-tag">' + esc(tag) + '</span>' +
            '<img src="' + safeImg + '" alt="' + esc(s.title || 'Rescue story') + '" loading="lazy" ' +
            'onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMG + '\'">' +
            '</div>' +
            '<div class="pb-story-body">' +
            '<h4>' + esc(s.title || 'A life saved') + '</h4>' +
            '<p>' + esc(desc) + (desc.length < (s.description || '').length ? '…' : '') + '</p>' +
            (meta ? '<span class="pb-story-meta"><i class="fas fa-location-dot"></i> ' + esc(meta) + '</span>' : '') +
            '</div></article>';
    }

    function renderStories(list) {
        var grid = document.getElementById('storiesGrid');
        var empty = document.getElementById('storiesEmpty');
        if (!grid) return;

        if (!list || !list.length) {
            grid.innerHTML = '';
            grid.setAttribute('aria-busy', 'false');
            grid.classList.remove('pb-stories-has-items');
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';
        var max = Math.min(list.length, 6);
        var items = list.slice(0, max);
        grid.setAttribute('aria-busy', 'false');
        grid.classList.toggle('pb-stories-many', max > 3);
        grid.classList.add('pb-stories-has-items');
        grid.innerHTML = items.map(function (s, i) {
            return storyCard(s, i === 0);
        }).join('');
    }

    async function loadStories() {
        var grid = document.getElementById('storiesGrid');
        if (!grid) return;

        if (!window.PAW_SITE) {
            renderStories([]);
            return;
        }

        grid.setAttribute('aria-busy', 'true');
        grid.innerHTML = '<div class="pb-stories-loading"><i class="fas fa-spinner fa-spin"></i> Loading stories…</div>';

        try {
            var stories = await PAW_SITE.fetchJson('/api/stories');
            if (stories && stories.length) {
                renderStories(stories);
            } else {
                renderStories([]);
            }
        } catch (e) {
            grid.innerHTML = '';
            grid.setAttribute('aria-busy', 'false');
            var empty = document.getElementById('storiesEmpty');
            if (empty) {
                empty.style.display = 'block';
                var msg = document.getElementById('storiesEmptyMsg');
                if (msg) msg.textContent = 'Could not load stories. Please try again later.';
            }
        }
    }

    function fmtCount(n) {
        return (Number(n) || 0).toLocaleString('en-IN');
    }

    function animateCount(el) {
        var to = Number(el.getAttribute('data-to')) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        var start = 0, startTime = null, dur = 1500;
        function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min((ts - startTime) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = fmtCount(Math.round(start + (to - start) * eased)) + suffix;
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function initCounts() {
        var els = document.querySelectorAll('.pb-count');
        if (!els.length) return;
        if (!('IntersectionObserver' in window)) {
            els.forEach(animateCount);
            return;
        }
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); }
            });
        }, { threshold: 0.4 });
        els.forEach(function (el) { obs.observe(el); });
    }

    var TICKER_MSGS = [
        'A injured Indie was rescued in Pune — vet care underway.',
        'Stray pup transported to shelter in Bengaluru.',
        'NGO accepted a critical case in Hyderabad.',
        'Field responder en route in Jaipur — ETA 12 min.',
        'Recovered dog handed over after treatment in Mumbai.'
    ];
    function initTicker() {
        var el = document.getElementById('tickerText');
        if (!el) return;
        var i = 0;
        setInterval(function () {
            i = (i + 1) % TICKER_MSGS.length;
            el.style.opacity = '0';
            setTimeout(function () { el.textContent = TICKER_MSGS[i]; el.style.opacity = '1'; }, 300);
        }, 4000);
        el.style.transition = 'opacity 0.3s ease';
    }

    document.addEventListener('DOMContentLoaded', function () {
        initNav();
        initReveal();
        initJourneyHighlight();
        initCounts();
        initTicker();
        loadCms();
    });
})();
