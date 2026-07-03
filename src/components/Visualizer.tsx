import { useRef, useEffect, useState } from 'react';
import { equalizer } from '../lib/equalizer';
import { audioEngine } from '../lib/audio-engine';

type VisualizerMode = 'bars' | 'wave' | 'circular';

interface VisualizerProps {
    mode?: VisualizerMode;
    className?: string;
}

export default function Visualizer({ mode = 'bars', className = '' }: VisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const [currentMode, setCurrentMode] = useState<VisualizerMode>(mode);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyser = equalizer.getAnalyser();
        if (!analyser) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const timeArray = new Uint8Array(bufferLength);

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            animFrameRef.current = requestAnimationFrame(draw);

            const rect = canvas.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            ctx.clearRect(0, 0, width, height);

            const isPlaying = audioEngine.getState().isPlaying;
            if (!isPlaying) {
                // Draw idle state
                drawIdle(ctx, width, height, currentMode);
                return;
            }

            analyser.getByteFrequencyData(dataArray);
            analyser.getByteTimeDomainData(timeArray);

            switch (currentMode) {
                case 'bars':
                    drawBars(ctx, width, height, dataArray, bufferLength);
                    break;
                case 'wave':
                    drawWave(ctx, width, height, timeArray, bufferLength);
                    break;
                case 'circular':
                    drawCircular(ctx, width, height, dataArray, bufferLength);
                    break;
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [currentMode]);

    return (
        <div className={`relative ${className}`}>
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ imageRendering: 'auto' }}
            />
            {/* Mode toggle */}
            <div className="absolute top-4 right-4 flex gap-1 bg-black/20 backdrop-blur-md rounded-full p-1">
                {(['bars', 'wave', 'circular'] as VisualizerMode[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => setCurrentMode(m)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                            currentMode === m
                                ? 'bg-white/20 text-white'
                                : 'text-white/50 hover:text-white/80'
                        }`}
                    >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
}

function drawIdle(ctx: CanvasRenderingContext2D, width: number, height: number, mode: VisualizerMode) {
    ctx.globalAlpha = 0.3;

    switch (mode) {
        case 'bars': {
            const barCount = 32;
            const barWidth = width / barCount - 2;
            for (let i = 0; i < barCount; i++) {
                const barHeight = 4 + Math.sin(Date.now() / 1000 + i * 0.3) * 2;
                const x = i * (barWidth + 2);
                ctx.fillStyle = `hsl(${240 + i * 3}, 70%, 60%)`;
                ctx.beginPath();
                ctx.roundRect(x, height - barHeight, barWidth, barHeight, 2);
                ctx.fill();
            }
            break;
        }
        case 'wave': {
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            for (let x = 0; x < width; x++) {
                const y = height / 2 + Math.sin(x / 50 + Date.now() / 1000) * 5;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            break;
        }
        case 'circular': {
            const cx = width / 2;
            const cy = height / 2;
            const radius = Math.min(width, height) / 3;
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }
    }

    ctx.globalAlpha = 1;
}

function drawBars(ctx: CanvasRenderingContext2D, width: number, height: number, dataArray: Uint8Array, bufferLength: number) {
    const barCount = Math.min(64, bufferLength);
    const barWidth = width / barCount - 1;

    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * bufferLength / barCount);
        const value = dataArray[dataIndex] / 255;
        const barHeight = value * height * 0.85;

        const hue = 240 + (i / barCount) * 60;
        const saturation = 70 + value * 30;
        const lightness = 50 + value * 20;

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

        const x = i * (barWidth + 1);
        const radius = Math.min(barWidth / 2, 3);

        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth, barHeight, [radius, radius, 0, 0]);
        ctx.fill();

        // Glow effect
        if (value > 0.7) {
            ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}

function drawWave(ctx: CanvasRenderingContext2D, width: number, height: number, timeArray: Uint8Array, bufferLength: number) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const v = timeArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        x += sliceWidth;
    }

    ctx.stroke();

    // Draw filled area below
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
}

function drawCircular(ctx: CanvasRenderingContext2D, width: number, height: number, dataArray: Uint8Array, bufferLength: number) {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 3;
    const bars = Math.min(128, bufferLength);

    for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const dataIndex = Math.floor(i * bufferLength / bars);
        const value = dataArray[dataIndex] / 255;
        const barLength = value * radius * 0.8 + 2;

        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle) * (radius + barLength);
        const y2 = cy + Math.sin(angle) * (radius + barLength);

        const hue = (i / bars) * 360;
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.5 + value * 0.5})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Center circle
    const avgValue = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.3 + avgValue * 10, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139, 92, 246, ${0.1 + avgValue * 0.3})`;
    ctx.fill();
}
