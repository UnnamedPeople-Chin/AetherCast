const fs = require('fs');
const path = require('path');
const https = require('https');

const VENDOR_DIR = path.resolve('D:/Project/AetherCast/assets/vendor/mediapipe');
const WASM_DIR = path.join(VENDOR_DIR, 'wasm');

fs.mkdirSync(WASM_DIR, { recursive: true });

const ASSETS = [
    {
        url: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs',
        out: path.join(VENDOR_DIR, 'vision_bundle.mjs')
    },
    {
        url: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/vision_wasm_internal.wasm',
        out: path.join(WASM_DIR, 'vision_wasm_internal.wasm')
    },
    {
        url: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/vision_wasm_internal.js',
        out: path.join(WASM_DIR, 'vision_wasm_internal.js')
    },
    {
        url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
        out: path.join(VENDOR_DIR, 'hand_landmarker.task')
    }
];

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const req = https.get(url, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                file.close();
                try { fs.unlinkSync(dest); } catch (e) {}
                return download(res.headers.location, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                file.close();
                try { fs.unlinkSync(dest); } catch (e) {}
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
        });
        req.on('error', err => {
            file.close();
            try { fs.unlinkSync(dest); } catch (e) {}
            reject(err);
        });
    });
}

(async () => {
    console.log('📦 Downloading MediaPipe offline vendor assets...');
    for (const item of ASSETS) {
        process.stdout.write(`Downloading: ${path.basename(item.out)}... `);
        await download(item.url, item.out);
        const sizeMb = (fs.statSync(item.out).size / (1024 * 1024)).toFixed(2);
        console.log(`OK (${sizeMb} MB)`);
    }
    console.log('✅ Offline bundle successfully prepared in assets/vendor/mediapipe/');
})().catch(err => {
    console.error('❌ Download error:', err);
    process.exit(1);
});
