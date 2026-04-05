import axios from 'axios';

// --- CLOUDINARY CONFIGURATION ---
// Cloud name from your Cloudinary dashboard
const CLOUD_NAME = 'dxkjmvbuz';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = 'After-app';
const API_KEY = '998818242228497';

/**
 * Uploads a local image (file:// or base64 data URI) to Cloudinary and returns the secure URL.
 * @param imageUri Local path from ImagePicker or a base64 data URI
 * @returns Production-ready HTTPS URL
 */
export const uploadImage = async (imageUri: string): Promise<string> => {
    // Already a remote URL — skip upload
    if (!imageUri || imageUri.startsWith('http')) return imageUri;

    try {
        console.log('[Cloudinary] Starting upload for URI:', imageUri.slice(0, 50) + '...');
        // ── Base64 path (ImagePicker with base64: true) ────────────────────────
        if (imageUri.startsWith('data:')) {
            console.log('[Cloudinary] Detected base64 data.');
            const data = new FormData();
            data.append('file', imageUri);
            data.append('upload_preset', UPLOAD_PRESET);
            data.append('api_key', API_KEY);

            const res = await axios.post(CLOUDINARY_URL, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data?.secure_url) {
                console.log('✅ Image uploaded (base64):', res.data.secure_url);
                return res.data.secure_url;
            }
            throw new Error('Upload failed: No secure_url in response');
        }

        // ── File URI path (file://) ────────────────────────────────────────────
        console.log('[Cloudinary] Detected file URI.');
        const data = new FormData();
        const rawName = imageUri.split('/').pop() || 'upload.jpg';
        // Strip any remaining slashes/special chars Cloudinary rejects in display name
        const fileName = rawName.replace(/[/\\?%*:|"<>]/g, '-').replace(/^-+|-+$/g, '') || 'upload.jpg';
        const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

        data.append('file', {
            uri: imageUri,
            type: fileType,
            name: fileName,
        } as any);
        data.append('upload_preset', UPLOAD_PRESET);
        data.append('api_key', API_KEY);

        const res = await axios.post(CLOUDINARY_URL, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data?.secure_url) {
            console.log('✅ Image uploaded (file URI):', res.data.secure_url);
            return res.data.secure_url;
        }

        throw new Error('Upload failed: No secure_url in response');
    } catch (error: any) {
        const msg = error?.response?.data?.error?.message || error.message;
        console.error('[Cloudinary] Upload Error:', msg, error?.response?.data);

        // Helpful diagnosis for the most common mistake
        if (msg?.toLowerCase().includes('unknown api key') || msg?.toLowerCase().includes('upload preset')) {
            console.warn(`[Asset Service] Cloudinary misconfiguration detected: ${msg}. Check upload presets in dashboard.`);
        } else {
            console.warn(`[Asset Service] Media upload issue: ${msg}`);
        }
        throw error;
    }
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
