// --- CLOUDINARY CONFIGURATION ---
const CLOUD_NAME = 'dxkjmvbuz';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = 'After-app';
const TIMEOUT_MS = 45000;
const MAX_RETRIES = 2;

/**
 * Upload a local image URI (file://) to Cloudinary.
 * Returns the secure URL on success, or the original URI on failure (graceful fallback).
 * 
 * ✅ Always use file URI — never pass base64 strings. They are 33% larger and slow.
 */
export const uploadImage = async (imageUri: string): Promise<string> => {
    // Already a remote URL — skip upload
    if (!imageUri || imageUri.startsWith('http')) return imageUri;

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
        try {
            const rawName = imageUri.split('/').pop() || 'upload.jpg';
            const uniqueId = Math.random().toString(36).substring(2, 10) + '-' + Date.now();
            const fileName = uniqueId + '-' + (rawName.replace(/[/\\?%*:|"<>]/g, '-').replace(/^-+|-+$/g, '') || 'upload.jpg');
            const fileType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

            const data = new FormData();
            data.append('file', { uri: imageUri, type: fileType, name: fileName } as any);
            data.append('upload_preset', UPLOAD_PRESET);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            const res = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: data,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Cloudinary error ${res.status}: ${errorText}`);
            }

            const json = await res.json();
            
            if (json.secure_url) return json.secure_url;
            throw new Error(json.error?.message || 'No secure_url in Cloudinary response');

        } catch (error: any) {
            attempt++;
            if (attempt > MAX_RETRIES) {
                console.warn('[Cloudinary] Upload failed after max retries:', error?.message || error);
                return imageUri; // graceful fallback
            }
            console.log(`[Cloudinary] Upload attempt ${attempt} failed, retrying in ${attempt * 2}s...`, error?.message);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
    }
    return imageUri;
};



/**
 * ─── CLOUDINARY IMAGE OPTIMIZATION ─────────────────────────────────────────
 * Central utility for all image URL transforms. Always use these instead of
 * raw URLs to ensure minimal bandwidth and instant loads.
 *
 * Sizes:
 *   thumb  → w_200  (list cards, chat avatars, grids)
 *   detail → w_500  (detail screens, modals)
 *   hero   → w_800  (full-width hero banners)
 *   avatar → w_100  (profile pics, small circles)
 */

const FALLBACK = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500';

/** Inject Cloudinary transforms into a URL. Non-Cloudinary URLs pass through. Fallback to UI-Avatar if null. */
export const cloudinaryUrl = (
    url: string | undefined | null,
    width: number = 500,
    extraTransforms: string = '',
    name?: string
): string => {
    if (!url) {
        // High-Fidelity UI Avatar Fallback
        const seed = name || 'User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&background=7c4dff&color=fff&bold=true&size=512`;
    }
    if (!url.includes('cloudinary.com')) return url;

    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;

    const transforms = `w_${width},c_fill,q_auto,f_auto${extraTransforms ? ',' + extraTransforms : ''}`;
    return `${parts[0]}/upload/${transforms}/${parts[1]}`;
};

/** w_200 — for list thumbnails, grid cards */
export const thumb = (url: string | undefined | null): string => cloudinaryUrl(url, 200);

/** w_500 — for detail screens, modals */
export const detail = (url: string | undefined | null): string => cloudinaryUrl(url, 500);

/** w_800 — for full-width hero images */
export const hero = (url: string | undefined | null): string => cloudinaryUrl(url, 800);

/** w_100 — for profile pics, small circles. Supports 'name' for initials fallback. */
export const avatar = (url: string | undefined | null, name?: string): string => cloudinaryUrl(url, 100, 'ar_1:1,g_face,c_fill', name);

/** @deprecated Use cloudinaryUrl() instead */
export const getOptimizedUrl = (url: string | undefined, width: number = 500): string => cloudinaryUrl(url, width);
