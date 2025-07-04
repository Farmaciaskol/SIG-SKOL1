
'use client';

import React from 'react';

export const PREDEFINED_AVATARS: Record<string, React.ReactNode> = {
    'avatar-01': <svg viewBox="0 0 36 36" width="100%" height="100%"><rect fill="#FFC107" width="36" height="36"/><path fill="#607D8B" d="M18,24c-5,0-9,4-9,4v2h18v-2C27,28,23,24,18,24z"/><path fill="#FFFFFF" d="M11.6,18.8c0,0-1.6-4.5,2.1-7.1c3.7-2.6,8.5,0,8.5,0s-1,5.5-5.6,7.5C11.1,21.7,11.6,18.8,11.6,18.8z"/></svg>,
    'avatar-02': <svg viewBox="0 0 36 36" width="100%" height="100%"><rect fill="#03A9F4" width="36" height="36"/><path fill="#FFFFFF" d="M13,27.8c0,0,0-3.3,5-3.3s5,3.3,5,3.3l-1.3,4.8H14.2L13,27.8z"/><circle fill="#FFFFFF" cx="18" cy="14" r="5"/></svg>,
    'avatar-03': <svg viewBox="0 0 36 36" width="100%" height="100%"><rect fill="#E91E63" width="36" height="36"/><path fill="#FFFFFF" d="M18,22c-7.7,0-14-6.3-14-14h28C32,15.7,25.7,22,18,22z"/><path fill="#F8BBD0" d="M18,24c-5.5,0-10,4.5-10,10h20C28,28.5,23.5,24,18,24z"/></svg>,
    'avatar-04': <svg viewBox="0 0 36 36" width="100%" height="100%"><rect fill="#8BC34A" width="36" height="36"/><path fill="#33691E" d="M18,23c0,0-7-4-7-9c0-3.9,3.1-7,7-7s7,3.1,7,7C25,19,18,23,18,23z"/><path fill="#FFFFFF" d="M18,23c0,0,7,4,7,9c0,3.9-3.1,7-7,7s-7-3.1-7-7C11,27,18,23,18,23z"/></svg>,
    'avatar-05': <svg viewBox="0 0 36 36" width="100%" height="100%"><rect fill="#673AB7" width="36" height="36"/><circle fill="#FFFFFF" cx="18" cy="18" r="12"/><circle fill="#673AB7" cx="18" cy="18" r="5"/></svg>,
    'avatar-06': <svg viewBox="0 0 36 36" width="100%" height="100%"><rect fill="#FF5722" width="36" height="36"/><path fill="#FFFFFF" d="M30,28H6v-4.9c0-2.8,2.2-5.1,5-5.1h14c2.8,0,5,2.2,5,5.1V28z"/><path fill="#BF360C" d="M18,6L6,18h24L18,6z"/></svg>,
    'avatar-07': <svg viewBox="0 0 36 36" width="100%" height="100%"><rect x="0" y="0" width="36" height="36" fill="#4CAF50"/><path transform="translate(4 4) scale(0.8)" fill="#FFFFFF" d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 26c-6.627 0-12-5.373-12-12S9.373 4 16 4s12 5.373 12 12-5.373 12-12 12zm-3-12h6v2h-6v-2z" /></svg>,
    'avatar-08': <svg viewBox="0 0 36 36" width="100%" height="100%"><rect x="0" y="0" width="36" height="36" fill="#9C27B0"/><path transform="translate(4 4) scale(0.8)" fill="#FFFFFF" d="M16,2L2,16l14,14l14-14L16,2z M16,24.3L5.7,14L16,3.7L26.3,14L16,24.3z"/></svg>,
};

export function getAvatar(avatarId?: string): React.ReactNode {
    return avatarId ? PREDEFINED_AVATARS[avatarId] : null;
}
