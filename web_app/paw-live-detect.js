/**
 * Live animal detection on camera feed (COCO-SSD).
 */
(function (global) {
    var ANIMAL_META = {
        dog: { label: 'Dog', icon: 'fa-dog' },
        cat: { label: 'Cat', icon: 'fa-cat' },
        bird: { label: 'Bird', icon: 'fa-dove' },
        cow: { label: 'Cow', icon: 'fa-cow' },
        horse: { label: 'Horse', icon: 'fa-horse' },
        sheep: { label: 'Sheep', icon: 'fa-sheep' },
        elephant: { label: 'Elephant', icon: 'fa-elephant' },
        bear: { label: 'Bear', icon: 'fa-paw' },
        zebra: { label: 'Zebra', icon: 'fa-paw' },
        giraffe: { label: 'Giraffe', icon: 'fa-paw' }
    };

    var MIN_SCORE = 0.38;
    var DETECT_INTERVAL_MS = 380;
    var LOCK_FRAMES = 2;

    var model = null;
    var modelLoading = null;
    var active = false;
    var timer = null;
    var busy = false;
    var lockHits = 0;
    var locked = null;
    var lastPredictions = [];

    function animalPredictions(preds) {
        return (preds || []).filter(function (p) {
            return ANIMAL_META[p.class] && p.score >= MIN_SCORE;
        }).sort(function (a, b) { return b.score - a.score; });
    }

    function bestAnimal(preds) {
        var list = animalPredictions(preds);
        return list.length ? list[0] : null;
    }

    function labelFor(className) {
        var m = ANIMAL_META[className];
        return m ? m.label : (className.charAt(0).toUpperCase() + className.slice(1));
    }

    function ensureModel(onStatus) {
        if (model) return Promise.resolve(model);
        if (modelLoading) return modelLoading;
        if (typeof cocoSsd === 'undefined') {
            return Promise.reject(new Error('AI library not loaded'));
        }
        modelLoading = cocoSsd.load({ base: 'lite_mobilenet_v2' })
            .then(function (m) {
                model = m;
                if (onStatus) onStatus('ready');
                return m;
            })
            .catch(function (e) {
                modelLoading = null;
                throw e;
            });
        if (onStatus) onStatus('loading');
        return modelLoading;
    }

    function syncOverlaySize(video, canvas) {
        if (!video || !canvas) return;
        var w = video.clientWidth || video.videoWidth;
        var h = video.clientHeight || video.videoHeight;
        if (w < 1 || h < 1) return;
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    }

    function drawOverlay(video, canvas, preds) {
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        syncOverlaySize(video, canvas);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var vw = video.videoWidth || 1;
        var vh = video.videoHeight || 1;
        var sx = canvas.width / vw;
        var sy = canvas.height / vh;
        animalPredictions(preds).forEach(function (p, i) {
            var b = p.bbox;
            var x = b[0] * sx;
            var y = b[1] * sy;
            var w = b[2] * sx;
            var h = b[3] * sy;
            var isTop = i === 0;
            ctx.strokeStyle = isTop ? '#22c55e' : '#f59e0b';
            ctx.lineWidth = isTop ? 3 : 2;
            ctx.strokeRect(x, y, w, h);
            var tag = labelFor(p.class) + ' ' + Math.round(p.score * 100) + '%';
            ctx.font = 'bold 13px Outfit, sans-serif';
            var tw = ctx.measureText(tag).width + 14;
            ctx.fillStyle = isTop ? 'rgba(34,197,94,0.92)' : 'rgba(245,158,11,0.9)';
            ctx.fillRect(x, Math.max(0, y - 22), tw, 22);
            ctx.fillStyle = '#fff';
            ctx.fillText(tag, x + 7, Math.max(14, y - 7));
        });
    }

    function renderFeed(container, preds) {
        if (!container) return;
        var animals = animalPredictions(preds);
        if (!animals.length) {
            container.innerHTML = '<span class="live-feed-empty"><i class="fas fa-crosshairs"></i> Point camera at an animal</span>';
            return;
        }
        container.innerHTML = animals.map(function (p) {
            var meta = ANIMAL_META[p.class];
            return '<span class="live-feed-chip' + (p === animals[0] ? ' live-feed-chip-top' : '') + '">' +
                '<i class="fas ' + (meta.icon || 'fa-paw') + '"></i> ' +
                labelFor(p.class) + ' <em>' + Math.round(p.score * 100) + '%</em></span>';
        }).join('');
    }

    function updateLock(best) {
        if (!best) {
            lockHits = 0;
            locked = null;
            return null;
        }
        if (locked && locked.class === best.class) {
            lockHits++;
            locked = best;
        } else {
            lockHits = 1;
            locked = best;
        }
        if (lockHits >= LOCK_FRAMES) {
            return { class: locked.class, label: labelFor(locked.class), score: locked.score };
        }
        return null;
    }

    function tick(state) {
        if (!active || !state.video) return;
        if (busy || !model) {
            timer = setTimeout(function () { tick(state); }, DETECT_INTERVAL_MS);
            return;
        }
        busy = true;
        model.detect(state.video)
            .then(function (preds) {
                lastPredictions = preds || [];
                var best = bestAnimal(lastPredictions);
                var confirmed = updateLock(best);
                drawOverlay(state.video, state.overlay, lastPredictions);
                renderFeed(state.feedEl, lastPredictions);
                if (state.onUpdate) {
                    state.onUpdate({
                        predictions: lastPredictions,
                        animals: animalPredictions(lastPredictions),
                        best: best,
                        locked: confirmed,
                        allLabels: animalPredictions(lastPredictions).map(function (p) {
                            return { class: p.class, label: labelFor(p.class), score: p.score };
                        })
                    });
                }
            })
            .catch(function () { /* skip frame */ })
            .finally(function () {
                busy = false;
                if (active) timer = setTimeout(function () { tick(state); }, DETECT_INTERVAL_MS);
            });
    }

    function start(opts) {
        stop();
        if (!opts || !opts.video) return;
        active = true;
        lockHits = 0;
        locked = null;
        lastPredictions = [];
        var state = {
            video: opts.video,
            overlay: opts.overlay || null,
            feedEl: opts.feedEl || null,
            onUpdate: opts.onUpdate || null
        };
        tick(state);
    }

    function stop() {
        active = false;
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        busy = false;
        lockHits = 0;
    }

    function getLocked() {
        if (lockHits >= LOCK_FRAMES && locked) {
            return { class: locked.class, label: labelFor(locked.class), score: locked.score };
        }
        return null;
    }

    function clearOverlay(canvas) {
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function snapshotToCanvas(video, canvas) {
        if (!video || !canvas || !video.videoWidth) return false;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        return true;
    }

    function detectOn(element) {
        return ensureModel().then(function (m) {
            return m.detect(element);
        });
    }

    global.PawLiveDetect = {
        ANIMAL_META: ANIMAL_META,
        MIN_SCORE: MIN_SCORE,
        ensureModel: ensureModel,
        detectOn: detectOn,
        start: start,
        stop: stop,
        getLocked: getLocked,
        getLastPredictions: function () { return lastPredictions; },
        bestAnimal: bestAnimal,
        animalPredictions: animalPredictions,
        labelFor: labelFor,
        clearOverlay: clearOverlay,
        snapshotToCanvas: snapshotToCanvas,
        isActive: function () { return active; }
    };
})(window);
