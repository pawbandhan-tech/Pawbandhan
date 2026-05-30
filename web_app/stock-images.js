/** Curated Unsplash imagery (free to use per Unsplash License) */
window.PB_IMAGES = {
    hero: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=80',
    heroAlt: 'https://images.unsplash.com/photo-1548199973-03cce77bbc87?w=1200&q=80',
    rescueDog: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
    rescueCat: 'https://images.unsplash.com/photo-1514881248727-9ea13baf8b6f?w=800&q=80',
    vetCare: 'https://images.unsplash.com/photo-1628007586316-41fec11f21d4?w=800&q=80',
    community: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80',
    volunteer: 'https://images.unsplash.com/photo-1596495578065-aa2cfacdab65?w=800&q=80',
    shelter: 'https://images.unsplash.com/photo-1608096299210-95663ee608b0?w=800&q=80'
};

function applyStockImages() {
    const heroImg = document.querySelector('.hero-image-frame img, .hero-visual img');
    if (heroImg && PB_IMAGES.hero) heroImg.src = PB_IMAGES.hero;

    document.querySelectorAll('[data-pb-image]').forEach(el => {
        const key = el.getAttribute('data-pb-image');
        if (PB_IMAGES[key]) {
            if (el.tagName === 'IMG') el.src = PB_IMAGES[key];
            else el.style.backgroundImage = `url(${PB_IMAGES[key]})`;
        }
    });
}
document.addEventListener('DOMContentLoaded', applyStockImages);
