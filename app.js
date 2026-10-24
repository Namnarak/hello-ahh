(() => {
  'use strict';
  const translations = window.HALLOWEEN_TRANSLATIONS;
  const supported = new Set(Object.keys(translations));
  const languageSelect = document.getElementById('language-select');
  const landing = document.getElementById('site-shell');
  const stage = document.getElementById('scare');
  const video = document.getElementById('video');
  const videoError = document.getElementById('video-error');
  const soundButton = document.getElementById('sound-button');
  const soundButtonText = document.getElementById('sound-button-text');
  const metaDescription = document.querySelector('meta[name="description"]');
  const getShortCode = value => String(value || '').toLowerCase().replace('_', '-').split('-')[0];

  // Prefer languages explicitly set by the visitor; otherwise use the visitor's
  // browser/device locale. No IP lookup, geolocation, account access or API needed.
  function detectUserLanguage() {
    const candidates = [
      ...(navigator.languages || []), // Ordered browser language preferences
      navigator.language,            // Browser/UI locale (older browser fallback)
      navigator.userLanguage         // Legacy browsers
    ];
    try {
      candidates.push(Intl.DateTimeFormat().resolvedOptions().locale); // Device/Intl fallback
    } catch { /* Intl locale is optional. */ }

    for (const locale of candidates) {
      const code = getShortCode(locale); // e.g. th-TH -> th, ja-JP -> ja
      if (supported.has(code)) return code;
    }
    return 'en'; // No available translation: use English
  }

  function resolveLanguage() {
    const fromQuery = new URLSearchParams(location.search).get('lang');
    if (fromQuery && supported.has(getShortCode(fromQuery))) return getShortCode(fromQuery);
    try {
      const saved = localStorage.getItem('halloween-language');
      if (saved && supported.has(getShortCode(saved))) return getShortCode(saved);
    } catch { /* Private browsing or storage-disabled context. */ }
    return detectUserLanguage();
  }

  let currentLanguage = resolveLanguage();
  function t(key) { return translations[currentLanguage][key] || translations.en[key] || key; }

  function setLanguage(lang, persist = true) {
    currentLanguage = supported.has(lang) ? lang : 'en';
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.title = t('pageTitle');
    metaDescription.content = t('metaDescription');
    languageSelect.value = currentLanguage;
    languageSelect.setAttribute('aria-label', t('langLabel'));
    stage.setAttribute('aria-label', t('videoLabel'));
    for (const item of document.querySelectorAll('[data-i18n]')) {
      item.textContent = t(item.dataset.i18n);
    }
    syncSoundButton();
    if (persist) {
      try { localStorage.setItem('halloween-language', currentLanguage); } catch { /* Storage optional. */ }
      const url = new URL(location.href);
      url.searchParams.set('lang', currentLanguage);
      // Updating the address bar isn't always allowed for local file:// pages.
      if (location.protocol === 'http:' || location.protocol === 'https:') {
        try { history.replaceState(null, '', url.pathname + url.search + url.hash); } catch { /* URL is optional. */ }
      }
    }
  }

  function syncSoundButton() {
    soundButtonText.textContent = t(video.muted ? 'unmute' : 'mute');
    soundButton.setAttribute('aria-pressed', String(video.muted));
  }

  function returnToInvitation() {
    video.pause();
    video.currentTime = 0;
    videoError.hidden = true;
    stage.hidden = true;
    stage.setAttribute('aria-hidden', 'true');
    landing.hidden = false;
    document.getElementById('accept-button').focus();
  }

  async function startVideo() {
    landing.hidden = true;
    stage.hidden = false;
    stage.setAttribute('aria-hidden', 'false');
    videoError.hidden = true;
    video.currentTime = 0;
    document.getElementById('back-button').focus();
    try {
      await video.play(); // The user has already clicked Yes or No.
    } catch {
      showVideoError();
    }
  }

  function showVideoError() {
    video.pause();
    videoError.hidden = false;
    document.getElementById('error-back-button').focus();
  }

  languageSelect.addEventListener('change', event => setLanguage(event.target.value));
  document.getElementById('accept-button').addEventListener('click', startVideo);
  document.getElementById('decline-button').addEventListener('click', startVideo);
  document.getElementById('back-button').addEventListener('click', returnToInvitation);
  document.getElementById('error-back-button').addEventListener('click', returnToInvitation);
  document.getElementById('replay-button').addEventListener('click', startVideo);
  soundButton.addEventListener('click', () => { video.muted = !video.muted; syncSoundButton(); });
  video.addEventListener('error', showVideoError);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !stage.hidden) returnToInvitation();
  });
  // Update the open page if the browser notifies us of a language change.
  // An explicit URL or saved choice will still take precedence.
  window.addEventListener('languagechange', () => setLanguage(resolveLanguage(), false));
  setLanguage(currentLanguage, false);
})();
