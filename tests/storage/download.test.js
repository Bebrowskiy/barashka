import { describe, it, expect, beforeEach } from 'vitest';
import {
    downloadQualitySettings,
    losslessContainerSettings,
    bulkDownloadSettings,
} from '../../js/storage/download.js';

describe('downloadQualitySettings', () => {
    beforeEach(() => localStorage.clear());

    it('returns default quality "HI_RES_LOSSLESS"', () => {
        expect(downloadQualitySettings.getQuality()).toBe('HI_RES_LOSSLESS');
    });

    it('sets and gets quality', () => {
        downloadQualitySettings.setQuality('LOSSLESS');
        expect(downloadQualitySettings.getQuality()).toBe('LOSSLESS');
    });
});

describe('losslessContainerSettings', () => {
    beforeEach(() => localStorage.clear());

    it('returns default container "flac"', () => {
        expect(losslessContainerSettings.getContainer()).toBe('flac');
    });

    it('sets and gets container', () => {
        losslessContainerSettings.setContainer('wav');
        expect(losslessContainerSettings.getContainer()).toBe('wav');
    });
});

describe('bulkDownloadSettings', () => {
    beforeEach(() => localStorage.clear());

    it('defaults to false', () => {
        expect(bulkDownloadSettings.shouldForceIndividual()).toBe(false);
    });

    it('toggles', () => {
        bulkDownloadSettings.setForceIndividual(true);
        expect(bulkDownloadSettings.shouldForceIndividual()).toBe(true);
    });
});
