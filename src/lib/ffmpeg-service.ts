import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;
let ffmpegLoading = false;

export type AudioFormat = 'mp3' | 'flac' | 'wav' | 'ogg' | 'aac';

export interface ConvertOptions {
    format: AudioFormat;
    bitrate?: string;
    sampleRate?: number;
    onProgress?: (progress: number) => void;
    signal?: AbortSignal;
}

export interface MetadataOptions {
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
    track?: number;
    genre?: string;
    cover?: Blob;
}

async function getFFmpeg(): Promise<FFmpeg> {
    if (ffmpegInstance && ffmpegLoaded) return ffmpegInstance;

    if (ffmpegLoading) {
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (ffmpegLoaded) { clearInterval(check); resolve(null); }
            }, 100);
        });
        return ffmpegInstance!;
    }

    ffmpegLoading = true;
    ffmpegInstance = new FFmpeg();

    ffmpegInstance.on('progress', ({ progress }) => {
        // Progress events handled per-call
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegLoaded = true;
    ffmpegLoading = false;
    return ffmpegInstance!;
}

export async function convertAudio(
    inputBlob: Blob,
    options: ConvertOptions
): Promise<Blob> {
    const ffmpeg = await getFFmpeg();

    const ext = inputBlob.type.includes('webm') ? 'webm'
        : inputBlob.type.includes('mp4') || inputBlob.type.includes('m4a') ? 'm4a'
        : inputBlob.type.includes('flac') ? 'flac'
        : inputBlob.type.includes('mp3') ? 'mp3'
        : inputBlob.type.includes('ogg') ? 'ogg'
        : 'webm';

    const inputName = `input.${ext}`;
    const outputName = `output.${options.format}`;

    await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));

    const args = ['-i', inputName];

    if (options.format === 'mp3') {
        args.push('-c:a', 'libmp3lame', '-b:a', options.bitrate || '320k');
        if (options.sampleRate) args.push('-ar', String(options.sampleRate));
    } else if (options.format === 'flac') {
        args.push('-c:a', 'flac');
        if (options.sampleRate) args.push('-ar', String(options.sampleRate));
    } else if (options.format === 'wav') {
        args.push('-c:a', 'pcm_s16le');
        if (options.sampleRate) args.push('-ar', String(options.sampleRate));
    } else if (options.format === 'ogg') {
        args.push('-c:a', 'libvorbis', '-b:a', options.bitrate || '256k');
    } else if (options.format === 'aac') {
        args.push('-c:a', 'aac', '-b:a', options.bitrate || '256k');
    }

    args.push('-y', outputName);

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);

    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    const mimeTypes: Record<string, string> = {
        mp3: 'audio/mpeg',
        flac: 'audio/flac',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        aac: 'audio/aac',
    };

    return new Blob([data], { type: mimeTypes[options.format] || 'application/octet-stream' });
}

// === ID3 Tag Writer (MP3) ===

function writeString(str: string, encoding: number = 0): Uint8Array {
    if (encoding === 3) {
        const encoder = new TextEncoder();
        return new Uint8Array([3, ...encoder.encode(str)]);
    }
    const encoder = new TextEncoder();
    return new Uint8Array([3, ...encoder.encode(str)]);
}

function writeFrame(frameId: string, data: Uint8Array): Uint8Array {
    const size = new Uint8Array(4);
    size[0] = (data.length >> 24) & 0xff;
    size[1] = (data.length >> 16) & 0xff;
    size[2] = (data.length >> 8) & 0xff;
    size[3] = data.length & 0xff;

    const frame = new Uint8Array(10 + data.length);
    frame.set(new TextEncoder().encode(frameId), 0);
    frame.set(size, 4);
    frame.set(new Uint8Array([0, 0]), 8);
    frame.set(data, 10);
    return frame;
}

function writeTextFrame(frameId: string, text: string): Uint8Array {
    return writeFrame(frameId, writeString(text));
}

async function jpegBlobToUint8Array(blob: Blob): Promise<Uint8Array> {
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
}

export async function writeID3Tags(
    audioBlob: Blob,
    metadata: MetadataOptions
): Promise<Blob> {
    const frames: Uint8Array[] = [];

    if (metadata.title) frames.push(writeTextFrame('TIT2', metadata.title));
    if (metadata.artist) frames.push(writeTextFrame('TPE1', metadata.artist));
    if (metadata.album) frames.push(writeTextFrame('TALB', metadata.album));
    if (metadata.year) frames.push(writeTextFrame('TDRC', String(metadata.year)));
    if (metadata.track) frames.push(writeTextFrame('TRCK', String(metadata.track)));
    if (metadata.genre) frames.push(writeTextFrame('TCON', metadata.genre));

    if (metadata.cover) {
        const coverData = await jpegBlobToUint8Array(metadata.cover);
        const pictureFrame = new Uint8Array([
            0x03, 0x00, 0x00,
            0x00, 0x03, 0x00, 0x00, 0x00,
        ]);
        const mimeStr = new TextEncoder().encode('image/jpeg');
        const desc = new Uint8Array([0x00]);
        const data = new Uint8Array(4 + mimeStr.length + 1 + desc.length + coverData.length);
        let offset = 0;
        data.set(pictureFrame, offset); offset += pictureFrame.length;
        data[offset] = mimeStr.length; offset += 1;
        data.set(mimeStr, offset); offset += mimeStr.length;
        data.set(desc, offset); offset += desc.length;
        data.set(coverData, offset);
        frames.push(writeFrame('APIC', data));
    }

    if (frames.length === 0) return audioBlob;

    let totalSize = 0;
    for (const frame of frames) totalSize += frame.length;

    const tagSize = totalSize + 10;
    const sizeBytes = [
        (tagSize >> 21) & 0x7f,
        (tagSize >> 14) & 0x7f,
        (tagSize >> 7) & 0x7f,
        tagSize & 0x7f,
    ];

    const header = new Uint8Array(10);
    header.set(new TextEncoder().encode('ID3'), 0);
    header[3] = 4;
    header[5] = 0;
    header.set(sizeBytes, 6);

    const tagData = new Uint8Array(10 + totalSize);
    tagData.set(header, 0);
    let offset = 10;
    for (const frame of frames) {
        tagData.set(frame, offset);
        offset += frame.length;
    }

    const audioData = await audioBlob.arrayBuffer();
    const result = new Uint8Array(tagData.length + audioData.byteLength);
    result.set(tagData, 0);
    result.set(new Uint8Array(audioData), tagData.length);

    return new Blob([result], { type: 'audio/mpeg' });
}

// === FLAC Metadata Writer ===

export async function writeFLACMetadata(
    audioBlob: Blob,
    metadata: MetadataOptions
): Promise<Blob> {
    const audioData = new Uint8Array(await audioBlob.arrayBuffer());

    const vorbisComments: string[] = [];
    if (metadata.title) vorbisComments.push(`TITLE=${metadata.title}`);
    if (metadata.artist) vorbisComments.push(`ARTIST=${metadata.artist}`);
    if (metadata.album) vorbisComments.push(`ALBUM=${metadata.album}`);
    if (metadata.year) vorbisComments.push(`DATE=${metadata.year}`);
    if (metadata.track) vorbisComments.push(`TRACKNUMBER=${metadata.track}`);
    if (metadata.genre) vorbisComments.push(`GENRE=${metadata.genre}`);

    if (metadata.cover) {
        const coverData = await jpegBlobToUint8Array(metadata.cover);
        const pictureBlock = buildFLACPictureBlock(coverData, 'image/jpeg');
        vorbisComments.push(`METADATA_BLOCK_PICTURE=${btoa(String.fromCharCode(...pictureBlock))}`);
    }

    const vendor = 'Barashka';
    const commentData = buildVorbisCommentBlock(vendor, vorbisComments);

    const streamInfo = audioData.slice(0, 34);
    if (streamInfo[0] !== 0x66 || streamInfo[1] !== 0x4C || streamInfo[2] !== 0x61 || streamInfo[3] !== 0x43) {
        return audioBlob;
    }

    const result = new Uint8Array(4 + commentData.length + audioData.length);
    result.set(audioData.slice(0, 4), 0);
    result.set(commentData, 4);
    result.set(audioData.slice(4), 4 + commentData.length);

    return new Blob([result], { type: 'audio/flac' });
}

function buildVorbisCommentBlock(vendor: string, comments: string[]): Uint8Array {
    const encoder = new TextEncoder();
    const vendorBytes = encoder.encode(vendor);
    const vendorLen = new Uint8Array(4);
    vendorLen[0] = vendorBytes.length & 0xff;
    vendorLen[1] = (vendorBytes.length >> 8) & 0xff;
    vendorLen[2] = (vendorBytes.length >> 16) & 0xff;
    vendorLen[3] = (vendorBytes.length >> 24) & 0xff;

    const countBytes = new Uint8Array(4);
    countBytes[0] = comments.length & 0xff;
    countBytes[1] = (comments.length >> 8) & 0xff;
    countBytes[2] = (comments.length >> 16) & 0xff;
    countBytes[3] = (comments.length >> 24) & 0xff;

    const parts: Uint8Array[] = [vendorLen, vendorBytes, countBytes];
    for (const comment of comments) {
        const commentBytes = encoder.encode(comment);
        const len = new Uint8Array(4);
        len[0] = commentBytes.length & 0xff;
        len[1] = (commentBytes.length >> 8) & 0xff;
        len[2] = (commentBytes.length >> 16) & 0xff;
        len[3] = (commentBytes.length >> 24) & 0xff;
        parts.push(len, commentBytes);
    }

    let total = 0;
    for (const p of parts) total += p.length;
    const result = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) {
        result.set(p, offset);
        offset += p.length;
    }

    const blockType = new Uint8Array([0x84]);
    const sizeBytes2 = new Uint8Array(3);
    const s = result.length;
    sizeBytes2[0] = (s >> 16) & 0xff;
    sizeBytes2[1] = (s >> 8) & 0xff;
    sizeBytes2[2] = s & 0xff;

    const block = new Uint8Array(1 + 3 + result.length);
    block.set(blockType, 0);
    block.set(sizeBytes2, 1);
    block.set(result, 4);
    return block;
}

function buildFLACPictureBlock(imageData: Uint8Array, mimeType: string): Uint8Array {
    const encoder = new TextEncoder();
    const mimeBytes = encoder.encode(mimeType);
    const desc = new Uint8Array(0);

    const block = new Uint8Array(32 + mimeBytes.length + imageData.length);
    let offset = 0;

    block[offset] = 3; offset += 4;
    const mimeLen = new Uint8Array(4);
    mimeLen[0] = mimeBytes.length;
    block.set(mimeLen, offset); offset += 4;
    block.set(mimeBytes, offset); offset += mimeBytes.length;
    block[offset] = 0; offset += 1 + desc.length;
    block[offset] = 0; offset += 1;
    const w = new Uint8Array(4); w[0] = imageData.length >> 24; w[1] = imageData.length >> 16; w[2] = imageData.length >> 8; w[3] = imageData.length;
    block.set(w, offset); offset += 4;
    block.set(imageData, offset);

    return block;
}

export function isFFmpegSupported(): boolean {
    return typeof SharedArrayBuffer !== 'undefined' || typeof WebAssembly !== 'undefined';
}

export function getFFmpegStatus(): { loaded: boolean; loading: boolean } {
    return { loaded: ffmpegLoaded, loading: ffmpegLoading };
}
