// js/visualizers/anime.js

export class AnimePreset {
    constructor(presetName = 'Anime (Waifu)', endpoint = 'https://api.waifu.pics/sfw/waifu') {
        this.name = presetName;
        this.endpoint = endpoint;
        this.contextType = '2d';
        
        this._imageObject = new Image();
        this._isImageReady = false;
        
        this._imageObject.onload = () => {
            this._isImageReady = true;
        };

        this._lastTrackId = null;
        this._coverObserver = null;
        this.isInitialized = false;

        this._originalCoverDisplay = '';
    }

    async lazyInit(canvas, audioContext, sourceNode) {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        // Hide the default fullscreen cover image
        const coverImage = document.getElementById('fullscreen-cover-image');
        if (coverImage) {
            this._originalCoverDisplay = coverImage.style.display || '';
            coverImage.style.display = 'none';
        }

        this._observeTrackChange();
        
        // Fetch current cover straight away to trigger the first waifu
        const el = document.querySelector('.now-playing-bar .cover');
        if (el?.tagName === 'IMG' && el.src) {
            this._lastTrackId = el.src;
        }
        this._fetchNewWaifu(); 
    }

    _observeTrackChange() {
        const container = document.querySelector('.now-playing-bar');
        if (!container) return;

        this._coverObserver = new MutationObserver(() => {
            const el = document.querySelector('.now-playing-bar .cover');
            const src = el?.tagName === 'IMG' ? el.src : null;
            if (!src || src === this._lastTrackId) return;
            
            this._lastTrackId = src; // using cover src as track ID to trigger fetch
            this._fetchNewWaifu();
        });

        this._coverObserver.observe(container, {
            attributes: true,
            attributeFilter: ['src'],
            subtree: true,
            childList: true,
        });
    }

    async _fetchNewWaifu() {
        this._isImageReady = false;
        try {
            const res = await fetch(this.endpoint);
            const data = await res.json();
            if (data && data.url) {
                this._imageObject.src = data.url;
            }
        } catch(e) {
            console.error('[AnimePreset] Failed to fetch waifu image:', e);
        }
    }

    resize(w, h) {}

    draw(ctx, canvas, analyser, dataArray, params) {
        const { width, height } = canvas;
        const { kick, intensity } = params;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Fill mostly dark background first
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);

        if (!this._isImageReady || !this._imageObject.src) return;

        const time = performance.now();
        // Calculate sway and bounce
        const basePathSwayY = Math.sin(time / 1000) * 10;
        const kickBounce = kick * 15;
        const totalOffsetY = basePathSwayY + kickBounce;
        
        const baseScale = 1.0;
        const kickScale = kick * 0.03;
        const scale = baseScale + kickScale;

        // 1. Draw blurred background
        ctx.save();
        ctx.filter = `blur(40px) brightness(50%)`;
        
        // Cover background logic
        const imgRatio = this._imageObject.width / this._imageObject.height;
        const canvasRatio = width / height;
        let drawW = width;
        let drawH = height;
        let drawX = 0;
        let drawY = 0;

        if (imgRatio > canvasRatio) {
            drawH = height;
            drawW = height * imgRatio;
            drawX = (width - drawW) / 2;
        } else {
            drawW = width;
            drawH = width / imgRatio;
            drawY = (height - drawH) / 2;
        }

        // Slight scale to prevent blur edges from showing black
        ctx.translate(width/2, height/2);
        ctx.scale(1.1 + kickScale, 1.1 + kickScale);
        ctx.translate(-width/2, -height/2);

        ctx.drawImage(this._imageObject, drawX, drawY, drawW, drawH);
        ctx.restore();

        // 2. Draw sharp album square in center
        ctx.save();
        
        // Base square size constraints
        const maxSquare = Math.min(width, height) * 0.65;
        const squareSize = maxSquare;
        
        const cx = width / 2;
        const cy = height / 2;
        
        ctx.translate(cx, cy + totalOffsetY);
        ctx.scale(scale, scale);

        // Shadow configuration
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 30 + kick * 20;
        ctx.shadowOffsetY = 15;
        
        // Rounded corners clip
        const radius = 16;
        const x = -squareSize / 2;
        const y = -squareSize / 2;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + squareSize - radius, y);
        ctx.quadraticCurveTo(x + squareSize, y, x + squareSize, y + radius);
        ctx.lineTo(x + squareSize, y + squareSize - radius);
        ctx.quadraticCurveTo(x + squareSize, y + squareSize, x + squareSize - radius, y + squareSize);
        ctx.lineTo(x + radius, y + squareSize);
        ctx.quadraticCurveTo(x, y + squareSize, x, y + squareSize - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        
        ctx.fill(); // For shadow trick: need fill before clip
        
        // Remove shadow for the actual image drawing
        ctx.shadowColor = 'transparent';
        
        // Clip for image
        ctx.clip();
        
        // Draw image
        // To behave like 'object-fit: cover', calculate ratios again for the square
        let sx = 0, sy = 0, sw = this._imageObject.width, sh = this._imageObject.height;
        if (imgRatio > 1) { // wider
            sw = sh;
            sx = (this._imageObject.width - sw) / 2;
        } else { // taller
            sh = sw;
            sy = (this._imageObject.height - sh) / 2;
        }
        
        ctx.drawImage(this._imageObject, sx, sy, sw, sh, x, y, squareSize, squareSize);

        ctx.restore();
    }

    destroy() {
        if (this._coverObserver) {
            this._coverObserver.disconnect();
            this._coverObserver = null;
        }
        
        // Restore fullscreen-cover display
        const coverImage = document.getElementById('fullscreen-cover-image');
        if (coverImage) {
            coverImage.style.display = this._originalCoverDisplay;
        }

        this.isInitialized = false;
        this._isImageReady = false;
        this._imageObject.src = '';
    }
}
