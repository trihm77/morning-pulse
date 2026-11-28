(() => {
  const masthead = document.querySelector('.brandbar');
  const brand = document.querySelector('.brand');
  const brandText = document.querySelector('.brand-text');
  let lastBrandWidth = 0;

  function syncHeaderHeight() {
    if (masthead) {
      document.documentElement.style.setProperty(
        '--masthead-height', `${masthead.getBoundingClientRect().height}px`
      );
    }
  }

  function fitMasthead(force = false) {
    if (!brand || !brandText) return;
    const width = brand.clientWidth;
    if (width <= 0 || (!force && Math.abs(width - lastBrandWidth) < 0.5)) return;
    lastBrandWidth = width;
    // Measure the actual font, including proportional letter spacing, then fit
    // the full title to one line without stretching or compressing the letters.
    brand.style.fontSize = '100px';
    const measuredWidth = brandText.getBoundingClientRect().width;
    if (measuredWidth > 0) {
      brand.style.fontSize = `${100 * (width - 1) / measuredWidth}px`;
    }
    syncHeaderHeight();
  }

  fitMasthead();
  window.addEventListener('resize', () => fitMasthead(), {passive: true});
  window.addEventListener('pageshow', () => fitMasthead(true));
  if (document.fonts) {
    document.fonts.ready.then(() => fitMasthead(true));
    document.fonts.addEventListener('loadingdone', () => fitMasthead(true));
  }
  if (window.ResizeObserver && brand && masthead) {
    new ResizeObserver(() => fitMasthead()).observe(brand);
    new ResizeObserver(syncHeaderHeight).observe(masthead);
  }

  const status = document.getElementById('status');
  let hideTimer;
  function tell(message) {
    status.textContent = message;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { status.textContent = ''; }, 4500);
  }
  const shareButtons = [...document.querySelectorAll('[data-share]')];
  const renderedShare = document.querySelector('meta[name="share-url"]')?.content ||
    document.querySelector('link[rel="canonical"]').href;
  const manifestUrl = new URL('share.json', renderedShare).href;
  let currentShare = null;
  let refreshing = null;
  function refreshShare() {
    if (refreshing) return refreshing;
    shareButtons.forEach(button => { button.disabled = true; });
    refreshing = fetch(manifestUrl, {cache: 'no-store'})
      .then(response => {
        if (!response.ok) throw new Error('Share metadata unavailable');
        return response.json();
      })
      .then(data => {
        if (new URL(data.url).origin !== location.origin) throw new Error('Invalid share URL');
        currentShare = data;
        document.querySelector('meta[name="share-url"]').content = data.url;
      })
      .catch(() => { currentShare = null; })
      .finally(() => {
        shareButtons.forEach(button => { button.disabled = false; });
        refreshing = null;
      });
    return refreshing;
  }
  // Prefetch before the tap so native iOS sharing retains its user gesture.
  refreshShare();
  window.addEventListener('pageshow', refreshShare);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshShare();
  });
  for (const button of shareButtons) {
    button.addEventListener('click', async () => {
      if (!currentShare) {
        tell('Chưa lấy được bản chia sẻ mới. Vui lòng thử lại.');
        refreshShare();
        return;
      }
      const {url, title} = currentShare;
      try {
        if (navigator.share) {
          await navigator.share({title, url});
          return;
        }
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          tell('Đã sao chép đường dẫn bản tin.');
          return;
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
      window.prompt('Sao chép đường dẫn bản tin:', url);
    });
  }
})();
