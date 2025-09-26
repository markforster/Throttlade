import React from 'react';
import { methodVariant, methodIcon, matchModeBadgeClasses } from '../../src/utils/rules-ui';

describe('rules-ui utils', () => {
  test('methodVariant maps verbs to bootstrap variants', () => {
    expect(methodVariant('GET')).toBe('success');
    expect(methodVariant('POST')).toBe('info');
    expect(methodVariant('PUT')).toBe('warning');
    expect(methodVariant('PATCH')).toBe('primary');
    expect(methodVariant('DELETE')).toBe('danger');
    expect(methodVariant('OPTIONS')).toBe('secondary');
    expect(methodVariant('HEAD')).toBe('secondary');
    expect(methodVariant(undefined)).toBe('secondary');
  });

  test('methodIcon returns correct icon element for core verbs', () => {
    const getIcon = methodIcon('GET') as any;
    const postIcon = methodIcon('POST') as any;
    const putIcon = methodIcon('PUT') as any;
    const patchIcon = methodIcon('PATCH') as any;
    const delIcon = methodIcon('DELETE') as any;

    expect(getIcon?.type?.displayName).toBe('Download');
    expect(postIcon?.type?.displayName).toBe('Upload');
    expect(putIcon?.type?.displayName).toBe('ArrowRepeat');
    expect(patchIcon?.type?.displayName).toBe('PatchCheck');
    expect(delIcon?.type?.displayName).toBe('FileX');
    expect(methodIcon('ANY')).toBeNull();
  });

  test('matchModeBadgeClasses returns outline styles', () => {
    expect(matchModeBadgeClasses(true)).toMatch(/border-dark/);
    expect(matchModeBadgeClasses(false)).toMatch(/border-secondary/);
  });
});
