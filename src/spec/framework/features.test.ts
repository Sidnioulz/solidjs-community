import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getPresets } from 'storybook/internal/common';
import { describe, expect, it } from 'vitest';

import * as frameworkPreset from '../../framework/preset';

const require = createRequire(import.meta.url);

/**
 * Storybook's own common preset. It runs before every framework preset and seeds
 * `features` with core defaults, among them `componentsManifest: false`.
 * It is not on the `storybook` package's export map, so resolve it by path.
 */
async function loadStorybookCommonPreset(): Promise<Record<string, unknown>> {
    const storybookDir = dirname(require.resolve('storybook/package.json'));
    const presetPath = join(storybookDir, 'dist/core-server/presets/common-preset.js');

    return import(pathToFileURL(presetPath).href);
}

/**
 * Resolves `features` the way Storybook core does: its common preset first, then this
 * framework preset, then whatever a project's `main.ts` adds. No mocks, so a change in
 * how core merges presets shows up here.
 */
async function resolveFeatures(projectMain: Record<string, unknown> = {}) {
    const presets = await getPresets(
        [
            { type: 'virtual', name: 'storybook/common-preset', ...(await loadStorybookCommonPreset()) },
            { type: 'virtual', name: 'storybook-solidjs-vite/preset', ...frameworkPreset },
            { type: 'virtual', name: 'main.ts', ...projectMain },
        ] as never[],
        { configDir: process.cwd(), configType: 'PRODUCTION' } as never
    );

    return presets.apply('features') as Promise<Record<string, unknown>>;
}

describe('features preset', () => {
    it('keeps componentsManifest on when core has already defaulted it off', async() => {
        // No `features` in main.ts: this is the value a project gets without touching the flag.
        const result = await resolveFeatures();

        expect(result).toMatchObject({
            componentsManifest: true,
            experimentalCodeExamples: true,
        });
    });

    it('lets a project turn componentsManifest off from main.ts', async() => {
        const result = await resolveFeatures({ features: { componentsManifest: false } });

        expect(result).toMatchObject({
            componentsManifest: false,
            experimentalCodeExamples: true,
        });
    });
});
