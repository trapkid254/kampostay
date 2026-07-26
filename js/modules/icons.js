/**
 * Clean stroke SVG icons (Lucide-style). No emoji / "AI sticker" look.
 */
function svg(paths, attrs = '') {
  return `<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${attrs}>${paths}</svg>`;
}

export const icons = {
  sun: () => svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'),
  moon: () => svg('<path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"/>'),
  heart: () => svg('<path d="M19.5 12.6 12 20l-7.5-7.4a4.5 4.5 0 0 1 7.1-5.5 4.5 4.5 0 0 1 7.4 5.5z"/>'),
  heartFilled: () =>
    `<svg class="icon icon--filled" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  compare: () => svg('<path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/><path d="M10 12h4"/>'),
  mapPin: () => svg('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  walk: () => svg('<circle cx="12" cy="5" r="2"/><path d="M9 22l3-8 2 3 3 5"/><path d="M11 12l-2-3 4-2 2 3"/>'),
  bed: () => svg('<path d="M2 17v2"/><path d="M2 12V7a2 2 0 0 1 2-2h8v7"/><path d="M14 5h4a2 2 0 0 1 2 2v5"/><path d="M2 12h20v5H2z"/>'),
  home: () => svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  search: () => svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  check: () => svg('<path d="M20 6 9 17l-5-5"/>'),
  checkCircle: () => svg('<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L16 9.5"/>'),
  shield: () => svg('<path d="M12 3 4 6v6c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5V6l-8-3z"/>'),
  share: () => svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 3.9M15.4 6.6l-6.8 3.9"/>'),
  phone: () => svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.2a2 2 0 0 1 2.1-.4c.9.3 1.7.6 2.6.7A2 2 0 0 1 22 16.9z"/>'),
  message: () => svg('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  chat: () => svg('<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>'),
  whatsapp: () => svg('<path d="M20.5 11.7A8.5 8.5 0 0 1 7.2 19.4L3.5 20.5l1.2-3.6A8.5 8.5 0 1 1 20.5 11.7z"/><path d="M9.2 8.8c.2-.5.4-.5.7-.5h.6c.2 0 .4 0 .5.4l.8 1.9c.1.2 0 .4-.1.6l-.4.5c-.1.2-.2.4 0 .6.3.5.9 1.2 1.7 1.8.7.5 1.3.8 1.7.9.2.1.5 0 .6-.1l.6-.7c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.5 0 .7-.3 2.2-2.4 2.2-1.7 0-4-.9-5.7-2.6-1.6-1.6-2.6-3.8-2.6-5.5 0-.4.1-.7.4-.9z"/>'),
  apple: () => svg('<path d="M16.5 2.5c-.8.1-1.8.6-2.4 1.3-.5.6-.9 1.5-.8 2.4.9.1 1.8-.4 2.4-1.1.6-.7.9-1.6.8-2.6z"/><path d="M19.5 17.2c-.5 1.1-.7 1.5-1.4 2.5-.9 1.2-2.1 2.7-3.7 2.7-1.3 0-1.7-.8-3.4-.8s-2.2.8-3.4.8c-1.5 0-2.7-1.4-3.6-2.6C2.2 17.7 1.2 14.3 2.7 11.5c.8-1.5 2.2-2.5 3.7-2.5 1.4 0 2.4.9 3.5.9 1 0 2.1-1 3.7-.9.6 0 2.4.2 3.5 1.9-.1.1-2.1 1.2-2.1 3.7 0 2.9 2.6 3.9 2.5 3.6z"/>'),
  playStore: () => svg('<path d="M3.5 2.8v18.4c0 .7.8 1.1 1.4.7l15-9.2c.6-.4.6-1.2 0-1.5l-15-9.1c-.6-.4-1.4 0-1.4.7z"/><path d="M13.2 12 3.7 21.5"/><path d="M13.2 12 3.7 2.5"/><path d="m16.5 9.8 3.4 2.1"/><path d="m16.5 14.2 3.4-2.1"/>'),
  download: () => svg('<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>'),
  phoneDevice: () => svg('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
  creditCard: () => svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>'),
  bank: () => svg('<path d="M3 10h18"/><path d="M5 10v8"/><path d="M9 10v8"/><path d="M15 10v8"/><path d="M19 10v8"/><path d="M2 18h20"/><path d="M12 3 2.5 9h19L12 3z"/>'),
  mpesa: () => svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10"/><path d="M7 13h6"/><circle cx="16.5" cy="15.5" r="1.5"/>'),
  refund: () => svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v5l3 2"/>'),
  sparkles: () => svg('<path d="M12 3v3"/><path d="M12 18v3"/><path d="m5.6 5.6 2.1 2.1"/><path d="m16.3 16.3 2.1 2.1"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="m5.6 18.4 2.1-2.1"/><path d="m16.3 7.7 2.1-2.1"/><circle cx="12" cy="12" r="2.5"/>'),
  hospital: () => svg('<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M10 21v-6h4v6"/><path d="M10 10h4"/><path d="M12 8v4"/>'),
  shieldAlert: () => svg('<path d="M12 3 4 6v6c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5V6l-8-3z"/><path d="M12 8v4"/><path d="M12 16h.01"/>'),
  user: () => svg('<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/>'),
  fileText: () => svg('<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="M9 13h6"/><path d="M9 17h6"/>'),
  mail: () => svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  calendar: () => svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 11h18"/>'),
  scale: () => svg('<path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7 3 13a3 3 0 0 0 6 0L7 7"/><path d="m17 7 2 6a3 3 0 0 1-6 0l2-6"/>'),
  users: () => svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  building: () => svg('<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12h12"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 16h4"/><path d="M2 22h20"/>'),
  graduation: () => svg('<path d="M22 10 12 4 2 10l10 6 10-6z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>'),
  bell: () => svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.7 1.7 0 0 0 3.4 0"/>'),
  star: () => svg('<path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.3 6.2 21l1.1-6.5L2.6 9.8l6.5-.9L12 3z"/>'),
  chart: () => svg('<path d="M3 3v18h18"/><path d="M7 14v4"/><path d="M12 10v8"/><path d="M17 6v12"/>'),
  camera: () => svg('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'),
  money: () => svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M9.5 9.5c.5-1 1.5-1.5 2.5-1.5 1.5 0 2.5.8 2.5 2s-1 2-2.5 2h-1C9.5 12 8.5 12.8 8.5 14s1 2 2.5 2c1 0 2-.5 2.5-1.5"/>'),
  trendUp: () => svg('<path d="M3 17 9 11l4 4L21 7"/><path d="M14 7h7v7"/>'),
  trendDown: () => svg('<path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/>'),
  clipboard: () => svg('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h6"/>'),
  megaphone: () => svg('<path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
  help: () => svg('<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><path d="M12 17h.01"/>'),
  ticket: () => svg('<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>'),
  settings: () => svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  robot: () => svg('<rect x="5" y="8" width="14" height="12" rx="2"/><path d="M12 8V5"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 17h6"/><path d="M2 14h3"/><path d="M19 14h3"/>'),
  image: () => svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-4 4-2-2-5 5"/>'),
  plus: () => svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
};

export function icon(name, className = '') {
  const fn = icons[name];
  if (!fn) return '';
  const html = fn();
  if (!className) return html;
  return html.replace('class="icon', `class="icon ${className}`);
}

export function iconButtonLabel(name, label) {
  return `${icon(name)} <span>${label}</span>`;
}
