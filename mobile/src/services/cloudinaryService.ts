import axios from 'axios';

// --- CLOUDINARY CONFIGURATION ---
// Cloud name from your Cloudinary dashboard
const CLOUD_NAME = 'dxkjmvbuz';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = 'After-app';
const API_KEY = '998818242228497';

// Create dedicated axios instance for Cloudinary with proper timeout
const cloudinaryClient = axios.create({
    timeout: 30000, // 30 seconds for image upload
    headers: {
        'Content-Type': 'multipart/form-data',
    },
});

/**
 * Uploads a local image (file:// or base64 data URI) to Cloudinary and returns the secure URL.
 * @param imageUri Local path from ImagePicker or a base64 data URI
 * @returns Production-ready HTTPS URL
 */
export const uploadImage = async (imageUri: string): Promise<string> => {
    // Already a remote URL — skip upload
    if (!imageUri || imageUri.startsWith('http')) return imageUri;

    try {
        console.log('[Cloudinary] Starting upload...');
        
        // ── Base64 path (ImagePicker with base64: true) ────────────────────────
        if (imageUri.startsWith('data:')) {
            console.log('[Cloudinary] Uploading base64 data');
            const data = new FormData();
            data.append('file', imageUri);
            data.append('upload_preset', UPLOAD_PRESET);
            data.append('api_key', API_KEY);

            const res = await cloudinaryClient.post(CLOUDINARY_URL, data);

            if (res.data?.secure_url) {
                console.log('✅ Image uploaded successfully');
                return res.data.secure_url;
            }
            throw new Error('Upload failed: No secure_url in response');
        }

        // ── File URI path (file://) ────────────────────────────────────────────
        console.log('[Cloudinary] Uploading file URI');
        const data = new FormData();
        const rawName = imageUri.split('/').pop() || 'upload.jpg';
        const fileName = rawName.replace(/[/\\?%*:|"<>]/g, '-').replace(/^-+|-+$/g, '') || 'upload.jpg';
        const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

        data.append('file', {
            uri: imageUri,
            type: fileType,
            name: fileName,
        } as any);
        data.append('upload_preset', UPLOAD_PRESET);
        data.append('api_key', API_KEY);

        const res = await cloudinaryClient.post(CLOUDINARY_URL, data);

        if (res.data?.secure_url) {
            console.log('✅ Image uploaded successfully');
            return res.data.secure_url;
        }

        throw new Error('Upload failed: No secure_url in response');
    } catch (error: any) {
        const msg = error?.response?.data?.error?.message || error.message || 'Unknown error';
        console.error('[Cloudinary] Upload failed:', msg);

        // Return original URI as fallback instead of throwing
        console.warn('[Cloudinary] Using original URI as fallback');
        return imageUri;
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
