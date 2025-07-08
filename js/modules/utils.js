// Utility functions
export const random = (a, b) => Math.random() * (b - a) + a;

export function wrap(object, width, height) {
    if (object.x < 0) object.x += width;
    if (object.x > width) object.x -= width;
    if (object.y < 0) object.y += height;
    if (object.y > height) object.y -= height;
}

export function collision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy) < a.radius + b.radius;
}

export function triggerHapticFeedback(duration = 10) {
    if (navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

export function checkOrientation() {
    const isMobile = window.matchMedia("(any-pointer: coarse)").matches;
    return isMobile && window.innerHeight > window.innerWidth;
} 