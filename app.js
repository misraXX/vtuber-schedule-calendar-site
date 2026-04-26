const GAS_URL_STORAGE_KEY = 'stream-calendar-gas-url';
const WATCHED_STORAGE_KEY = 'stream-calendar-watched-video-ids';
const AUTH_STORAGE_KEY = 'stream-calendar-authenticated';
const AUTH_PASSWORD = 'demo2026';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbySEee02uqMKRC0sfKjmFkTZCTPSd6J2snnCTJceBnvCTvENgtG5kHkmeqlBLOWePc/exec';
const CONTENT_MODES = {
  STREAM: 'stream',
  VIDEO: 'video',
  SHORT: 'short'
};

const state = {
  events: [],
  members: [],
  view: 'tile',
  mode: CONTENT_MODES.STREAM,
  rangeOffset: 0,
  watchedIds: readWatchedIds(),
  filters: {
    search: '',
    streamers: new Set(),
    platform: '',
    status: ''
  }
};

const elements = {
  liveList: document.querySelector('#liveList'),
  liveScrollLeft: document.querySelector('#liveScrollLeft'),
  liveScrollRight: document.querySelector('#liveScrollRight'),
  liveCount: document.querySelector('#liveCount'),
  liveStrip: document.querySelector('.live-strip'),
  calendarDays: document.querySelector('#calendarDays'),
  filterPanel: document.querySelector('#filterPanel'),
  filterToggleButton: document.querySelector('#filterToggleButton'),
  activeFilterCount: document.querySelector('#activeFilterCount'),
  searchInput: document.querySelector('#searchInput'),
  streamerCheckboxes: document.querySelector('#streamerCheckboxes'),
  streamerFilterSummary: document.querySelector('#streamerFilterSummary'),
  selectAllStreamersButton: document.querySelector('#selectAllStreamersButton'),
  clearStreamersButton: document.querySelector('#clearStreamersButton'),
  platformFilter: document.querySelector('#platformFilter'),
  statusFilter: document.querySelector('#statusFilter'),
  tileViewButton: document.querySelector('#tileViewButton'),
  listViewButton: document.querySelector('#listViewButton'),
  refreshButton: document.querySelector('#refreshButton'),
  prevRangeButton: document.querySelector('#prevRangeButton'),
  todayRangeButton: document.querySelector('#todayRangeButton'),
  nextRangeButton: document.querySelector('#nextRangeButton'),
  updatedAt: document.querySelector('#updatedAt'),
  rangeTitle: document.querySelector('#rangeTitle'),
  modeButtons: Array.from(document.querySelectorAll('[data-content-mode]')),
  template: document.querySelector('#eventCardTemplate')
};

const sampleEvents = [
  {
    title: 'VALORANT 大会前スクリム、声出していく',
    name: 'サンプル配信者',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    site: 'YouTube',
    icon: 'https://placehold.co/120x120/1769e0/ffffff?text=A',
    thumbnail: 'https://placehold.co/640x360/172033/ffffff?text=YouTube+LIVE',
    start: toIsoOffset(10),
    end: null,
    color: '#1769e0',
    videoId: 'sample-youtube-1',
    channelId: 'UC_SAMPLE',
    status: 'live',
    contentType: 'stream',
    lastCheckedAt: new Date().toISOString()
  },
  {
    title: '雑談と告知、週末イベントの話をします',
    name: 'サンプル配信者',
    url: 'https://www.twitch.tv/',
    site: 'Twitch',
    icon: 'https://placehold.co/120x120/9146ff/ffffff?text=B',
    thumbnail: '',
    start: toIsoOffset(80),
    end: null,
    color: '#9146ff',
    videoId: 'sample-twitch-1',
    channelId: '123456',
    status: 'scheduled',
    contentType: 'stream',
    lastCheckedAt: new Date().toISOString()
  },
  {
    title: '切り抜きで振り返る今週の名場面',
    name: 'サンプル配信者',
    url: 'https://www.youtube.com/',
    site: 'YouTube',
    icon: 'https://placehold.co/120x120/148a62/ffffff?text=C',
    thumbnail: 'https://placehold.co/640x360/148a62/ffffff?text=VIDEO',
    start: toIsoOffset(-120),
    end: null,
    color: '#148a62',
    videoId: 'sample-video-1',
    channelId: 'UC_SAMPLE',
    status: 'published',
    contentType: 'video',
    duration: '12:34',
    publishedAt: toIsoOffset(-120),
    watchedManageable: true
  },
  {
    title: '#Shorts 30秒でわかる神プレイ',
    name: 'サンプル配信者',
    url: 'https://www.youtube.com/shorts/sample',
    site: 'YouTube',
    icon: 'https://placehold.co/120x120/e53935/ffffff?text=S',
    thumbnail: 'https://placehold.co/640x360/e53935/ffffff?text=SHORTS',
    start: toIsoOffset(-40),
    end: null,
    color: '#e53935',
    videoId: 'sample-short-1',
    channelId: 'UC_SAMPLE',
    status: 'published',
    contentType: 'short',
    duration: '0:30',
    publishedAt: toIsoOffset(-40),
    watchedManageable: true
  }
];

let appStarted = false;
setupAuthGate();

function init() {
  if (appStarted) return;
  appStarted = true;
  updateHeaderHeight();
  bindEvents();
  loadEvents();
}

function setupAuthGate() {
  const form = document.querySelector('#authForm');
  const input = document.querySelector('#authPassword');
  const error = document.querySelector('#authError');

  if (sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true') {
    unlockApp();
    return;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (input.value === AUTH_PASSWORD) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      unlockApp();
      return;
    }

    error.textContent = 'パスワードが違います';
    input.select();
  });

  requestAnimationFrame(() => input.focus());
}

function unlockApp() {
  document.body.classList.remove('auth-locked');
  init();
}

function bindEvents() {
  elements.searchInput.addEventListener('input', event => {
    state.filters.search = event.target.value.trim().toLowerCase();
    render();
  });
  elements.filterToggleButton.addEventListener('click', () => {
    const isCollapsed = elements.filterPanel.classList.toggle('collapsed');
    elements.filterToggleButton.setAttribute('aria-expanded', String(!isCollapsed));
    requestAnimationFrame(updateHeaderHeight);
  });
  elements.streamerCheckboxes.addEventListener('change', event => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    const name = event.target.value;
    if (event.target.checked) {
      state.filters.streamers.add(name);
    } else {
      state.filters.streamers.delete(name);
    }
    render();
  });
  elements.selectAllStreamersButton.addEventListener('click', () => {
    state.filters.streamers = new Set(state.members.map(member => member.name));
    renderStreamerCheckboxes();
    render();
  });
  elements.clearStreamersButton.addEventListener('click', () => {
    state.filters.streamers.clear();
    renderStreamerCheckboxes();
    render();
  });
  elements.platformFilter.addEventListener('change', event => {
    state.filters.platform = event.target.value;
    render();
  });
  elements.statusFilter.addEventListener('change', event => {
    state.filters.status = event.target.value;
    render();
  });
  elements.modeButtons.forEach(button => {
    button.addEventListener('click', () => setContentMode(button.dataset.contentMode));
  });
  elements.tileViewButton.addEventListener('click', () => setView('tile'));
  elements.listViewButton.addEventListener('click', () => setView('list'));
  elements.refreshButton.addEventListener('click', loadEvents);
  elements.prevRangeButton.addEventListener('click', () => shiftRange(-4));
  elements.todayRangeButton.addEventListener('click', () => {
    state.rangeOffset = 0;
    render();
  });
  elements.nextRangeButton.addEventListener('click', () => shiftRange(4));
  elements.liveScrollLeft.addEventListener('click', () => scrollLiveRail(-1));
  elements.liveScrollRight.addEventListener('click', () => scrollLiveRail(1));
  elements.liveList.addEventListener('scroll', updateLiveScrollButtons, { passive: true });
  elements.calendarDays.addEventListener('click', handleCalendarClick);
  window.addEventListener('resize', updateHeaderHeight);
  window.addEventListener('resize', updateLiveScrollButtons);
}

function updateHeaderHeight() {
  const header = document.querySelector('.app-header');
  const liveHeight = state.mode === CONTENT_MODES.STREAM && elements.liveStrip
    ? elements.liveStrip.offsetHeight
    : 0;
  if (header) {
    document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
  }
  document.documentElement.style.setProperty('--live-strip-height', `${liveHeight}px`);
}

async function loadEvents() {
  const gasUrl = getGasUrl();

  if (!gasUrl) {
    state.events = normalizeEvents(sampleEvents);
    state.members = buildMembersFromEvents(state.events);
    elements.updatedAt.textContent = '';
    renderStreamerCheckboxes();
    render();
    return;
  }

  elements.updatedAt.textContent = '読み込み中';

  try {
    const payload = await fetchJsonp(gasUrl);
    state.events = normalizeEvents(Array.isArray(payload) ? payload : payload.events);
    state.members = normalizeMembers(Array.isArray(payload) ? [] : payload.members, state.events);
    elements.updatedAt.textContent = `更新 ${formatDateTime(new Date())}`;
  } catch (error) {
    console.error(error);
    state.events = normalizeEvents(sampleEvents);
    state.members = buildMembersFromEvents(state.events);
    elements.updatedAt.textContent = error.message;
  }

  renderStreamerCheckboxes();
  render();
}

function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `streamCalendarCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const requestUrl = new URL(url);
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('GASがJSONP形式で応答していません。最新の統合版.gsを貼り直してデプロイしてください'));
    }, 10000);
    requestUrl.searchParams.set('callback', callbackName);

    window[callbackName] = data => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('GAS Webアプリを読み込めませんでした'));
    };

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    }

    script.src = requestUrl.toString();
    document.body.appendChild(script);
  });
}

function getGasUrl() {
  return localStorage.getItem(GAS_URL_STORAGE_KEY) || DEFAULT_GAS_URL;
}

function renderStreamerCheckboxes() {
  const selected = state.filters.streamers;
  elements.streamerCheckboxes.innerHTML = '';

  state.members.forEach(member => {
    const id = `streamer-${cssSafe(member.name)}`;
    const label = document.createElement('label');
    label.className = 'streamer-check';
    label.innerHTML = `
      <input type="checkbox" id="${id}" value="${escapeHtml(member.name)}" ${selected.has(member.name) ? 'checked' : ''}>
      ${member.icon ? `<img class="streamer-check-icon" src="${escapeHtml(member.icon)}" alt="" loading="lazy">` : '<span class="streamer-check-icon streamer-check-fallback"></span>'}
      <span class="streamer-check-name">${escapeHtml(member.name)}</span>
    `;
    applyMemberColor(label, member.color);
    elements.streamerCheckboxes.appendChild(label);
  });

  updateStreamerSummary();
}

function updateStreamerSummary() {
  const selectedCount = state.filters.streamers.size;
  elements.streamerFilterSummary.textContent = selectedCount === 0
    ? 'すべて'
    : `${selectedCount}人選択中`;
}

function render() {
  updateStreamerSummary();
  updateActiveFilterCount();
  updateModeChrome();
  const events = getFilteredEvents();
  const liveEvents = state.events
    .filter(event => event.contentType === CONTENT_MODES.STREAM && event.status === 'live')
    .sort((a, b) => a.startDate - b.startDate);

  if (state.mode === CONTENT_MODES.STREAM) {
    elements.liveCount.textContent = liveEvents.length;
    renderLiveTiles(liveEvents.slice(0, 12));
  }

  elements.calendarDays.classList.toggle('list-view', state.view === 'list');
  renderDays(events);

  requestAnimationFrame(() => {
    updateHeaderHeight();
    updateLiveScrollButtons();
  });

}

function updateModeChrome() {
  const isStreamMode = state.mode === CONTENT_MODES.STREAM;
  document.body.classList.toggle('media-mode', !isStreamMode);
  elements.liveStrip.hidden = !isStreamMode;
  elements.statusFilter.disabled = !isStreamMode;
  elements.modeButtons.forEach(button => {
    const active = button.dataset.contentMode === state.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function updateActiveFilterCount() {
  let count = 0;
  if (state.filters.search) count++;
  if (state.filters.platform) count++;
  if (state.filters.status && state.mode === CONTENT_MODES.STREAM) count++;
  if (state.filters.streamers.size > 0) count++;

  elements.activeFilterCount.textContent = count;
  elements.activeFilterCount.classList.toggle('has-active-filters', count > 0);
}

function getFilteredEvents() {
  const { search, streamers, platform, status } = state.filters;
  const range = getVisibleRange();
  return state.events
    .filter(event => {
      const haystack = `${event.title} ${event.name} ${event.site} ${event.videoId}`.toLowerCase();
      const matchesMode = state.mode === CONTENT_MODES.STREAM
        ? event.contentType === CONTENT_MODES.STREAM
        : event.contentType === CONTENT_MODES.VIDEO || event.contentType === CONTENT_MODES.SHORT;
      return matchesMode
        && (!search || haystack.includes(search))
        && (streamers.size === 0 || streamers.has(event.name))
        && (!platform || event.site === platform)
        && (state.mode !== CONTENT_MODES.STREAM || !status || event.status === status)
        && (state.mode !== CONTENT_MODES.STREAM || (event.startDate >= range.start && event.startDate < range.end));
    })
    .sort((a, b) => b.startDate - a.startDate);
}

function renderDays(events) {
  elements.calendarDays.innerHTML = '';
  const range = getVisibleRange();
  elements.rangeTitle.textContent = state.mode === CONTENT_MODES.STREAM
    ? `${modeLabel(state.mode)} ${formatRangeTitle(range)}`
    : '動画一覧';

  if (events.length === 0) {
    elements.calendarDays.innerHTML = `<div class="empty-state">表示できる${modeLabel(state.mode)}がありません</div>`;
    return;
  }

  const grouped = groupBy(events, event => event.dayKey);
  const dayKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  dayKeys.forEach(dayKey => {
    const dayEvents = grouped[dayKey].sort((a, b) => b.startDate - a.startDate);
    const block = document.createElement('section');
    block.className = 'day-block';
    block.dataset.dayKey = dayKey;
    block.innerHTML = `
      <div class="day-heading">
        <p class="day-date">${formatDayTitle(dayEvents[0].startDate)}</p>
        <span class="day-week">${formatWeekday(dayEvents[0].startDate)}</span>
      </div>
      <div class="events-grid"></div>
    `;
    renderCardList(block.querySelector('.events-grid'), dayEvents);
    elements.calendarDays.appendChild(block);
  });
}

function shiftRange(days) {
  state.rangeOffset += days;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getVisibleRange() {
  const center = startOfDay(addDays(new Date(), state.rangeOffset));
  return {
    start: addDays(center, -1),
    end: addDays(center, 3)
  };
}

function renderCardList(container, events, compact = false) {
  container.innerHTML = '';

  if (events.length === 0) {
    container.innerHTML = compact ? '<div class="empty-state">現在LIVE中の配信はありません</div>' : '';
    return;
  }

  events.forEach(event => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const thumbLink = card.querySelector('.thumb-link');
    const titleLink = card.querySelector('.event-title');
    const thumb = card.querySelector('.thumb');
    const avatar = card.querySelector('.avatar');
    const badge = card.querySelector('.status-badge');
    const duration = card.querySelector('.duration');
    const watchedButton = card.querySelector('.watched-button');

    card.dataset.videoId = event.videoId;
    card.dataset.contentType = event.contentType;
    card.classList.toggle('watched', event.watched);
    thumbLink.href = event.url;
    titleLink.href = event.url;
    titleLink.textContent = event.title;
    avatar.src = event.icon || fallbackAvatar(event);
    avatar.alt = event.name;

    if (event.site === 'Twitch') {
      thumbLink.classList.add('twitch-thumb');
      thumb.removeAttribute('src');
      thumb.alt = '';
      const twitchIcon = document.createElement('img');
      twitchIcon.className = 'twitch-thumb-icon';
      twitchIcon.src = event.icon || fallbackAvatar(event);
      twitchIcon.alt = event.name || 'Twitch';
      const twitchLabel = document.createElement('span');
      twitchLabel.className = 'twitch-thumb-label';
      twitchLabel.textContent = 'Twitch';
      thumbLink.append(twitchIcon, twitchLabel);
    } else {
      thumb.src = event.thumbnail || fallbackImage(event);
      thumb.alt = event.title;
    }

    card.querySelector('.streamer').textContent = event.name || '未設定';
    card.querySelector('.time').textContent = formatEventTime(event);
    card.querySelector('.platform').textContent = event.site || 'Unknown';
    duration.textContent = event.duration || '';
    duration.hidden = !event.duration;

    if (event.status === 'ended' || event.status === 'published') {
      badge.remove();
    } else {
      badge.textContent = statusLabel(event.status);
      badge.classList.add(event.status || 'unknown');
    }

    if (event.watchedManageable && event.videoId) {
      watchedButton.hidden = false;
      watchedButton.textContent = event.watched ? '視聴済み' : 'NEW';
      watchedButton.setAttribute('aria-pressed', String(event.watched));
    } else {
      watchedButton.remove();
    }

    applyMemberColor(card, event.color);
    container.appendChild(card);
  });
}

function renderLiveTiles(events) {
  elements.liveList.innerHTML = '';

  if (events.length === 0) {
    elements.liveList.innerHTML = '<div class="empty-state">現在LIVE中の配信はありません</div>';
    updateLiveScrollButtons();
    return;
  }

  events.forEach(event => {
    const tile = document.createElement('a');
    tile.className = 'live-tile';
    tile.href = event.url;
    tile.target = '_blank';
    tile.rel = 'noopener noreferrer';
    applyMemberColor(tile, event.color);

    const media = event.site === 'Twitch'
      ? `<span class="live-tile-media twitch-live-media"><img src="${event.icon || fallbackAvatar(event)}" alt=""></span>`
      : `<span class="live-tile-media"><img src="${event.thumbnail || fallbackImage(event)}" alt=""></span>`;

    tile.innerHTML = `
      ${media}
      <span class="live-tile-body">
        <span class="live-tile-meta event-meta">
          <img class="avatar" src="${event.icon || fallbackAvatar(event)}" alt="${escapeHtml(event.name || '')}" loading="lazy">
          <span>
            <span class="streamer">${escapeHtml(event.name || '未設定')}</span>
            <span class="time">${escapeHtml(formatTime(event.startDate))}</span>
          </span>
        </span>
        <strong>${escapeHtml(event.title)}</strong>
      </span>
    `;

    elements.liveList.appendChild(tile);
  });

  requestAnimationFrame(() => {
    updateLiveScrollButtons();
    updateHeaderHeight();
  });
}

function handleCalendarClick(event) {
  const button = event.target.closest('.watched-button');
  if (button) {
    event.preventDefault();
    event.stopPropagation();
    const card = button.closest('.event-card');
    if (!card || !card.dataset.videoId) return;
    toggleWatched(card.dataset.videoId);
    return;
  }

  const link = event.target.closest('.thumb-link, .event-title');
  if (!link) return;
  const card = link.closest('.event-card');
  if (!card || card.dataset.contentType === CONTENT_MODES.STREAM || !card.dataset.videoId) return;
  markWatched(card.dataset.videoId);
}

function toggleWatched(videoId) {
  if (state.watchedIds.has(videoId)) {
    state.watchedIds.delete(videoId);
  } else {
    state.watchedIds.add(videoId);
  }
  syncWatchedState();
}

function markWatched(videoId) {
  if (state.watchedIds.has(videoId)) return;
  state.watchedIds.add(videoId);
  syncWatchedState();
}

function syncWatchedState() {
  writeWatchedIds(state.watchedIds);
  state.events = state.events.map(event => ({
    ...event,
    watched: event.videoId ? state.watchedIds.has(event.videoId) : false
  }));
  render();
}

function scrollLiveRail(direction) {
  const amount = Math.max(280, Math.floor(elements.liveList.clientWidth * 0.8));
  elements.liveList.scrollBy({
    left: direction * amount,
    behavior: 'smooth'
  });
}

function updateLiveScrollButtons() {
  if (state.mode !== CONTENT_MODES.STREAM) return;
  const list = elements.liveList;
  const canScroll = list.scrollWidth > list.clientWidth + 2;
  elements.liveScrollLeft.disabled = !canScroll || list.scrollLeft <= 2;
  elements.liveScrollRight.disabled = !canScroll || list.scrollLeft + list.clientWidth >= list.scrollWidth - 2;
}

function applyMemberColor(card, color) {
  if (!color) return;
  card.style.setProperty('--member-color', color);
  card.style.setProperty('--member-soft-color', toSoftColor(color));
  card.classList.toggle('dark-member-color', isDarkColor(color));
  card.classList.add('has-member-color');
}

function normalizeEvents(events) {
  return (Array.isArray(events) ? events : [])
    .map(event => {
      const contentType = normalizeContentType(event.contentType || event.content_type || event.type);
      const publishedAt = parseDate(event.publishedAt || event.published_at);
      const start = parseDate(event.start || event.actualStartAt || event.scheduledStartAt) || publishedAt;
      const end = parseDate(event.end || event.actualEndAt);
      const status = event.status || (contentType === CONTENT_MODES.STREAM ? inferStatus(start, end) : 'published');
      const videoId = event.videoId || event.video_id || '';
      return {
        title: event.title || '無題の配信',
        name: event.name || event.streamer || '',
        url: event.url || '#',
        site: event.site || event.platform || '',
        icon: event.icon || event.iconUrl || '',
        thumbnail: event.thumbnail || event.thumbnailUrl || '',
        start: start ? start.toISOString() : '',
        end: end ? end.toISOString() : '',
        startDate: start || new Date(0),
        endDate: end,
        dayKey: start ? formatDayKey(start) : 'unknown',
        color: event.color || '',
        videoId,
        channelId: event.channelId || event.channel_id || '',
        status,
        contentType,
        contentTypeCandidate: event.contentTypeCandidate || event.content_type_candidate || '',
        duration: normalizeDuration(event.duration || event.videoDuration || ''),
        publishedAt: publishedAt ? publishedAt.toISOString() : '',
        watchedManageable: contentType !== CONTENT_MODES.STREAM && Boolean(videoId),
        watched: videoId ? state.watchedIds.has(videoId) : false,
        lastCheckedAt: event.lastCheckedAt || ''
      };
    })
    .filter(event => event.startDate.getTime() > 0);
}

function normalizeMembers(members, events) {
  const seen = new Set();
  const ordered = (Array.isArray(members) ? members : [])
    .map(member => typeof member === 'string' ? { name: member } : member)
    .filter(member => member && member.name)
    .filter(member => {
      if (seen.has(member.name)) return false;
      seen.add(member.name);
      return true;
    });

  buildMembersFromEvents(events).forEach(member => {
    if (!seen.has(member.name)) {
      ordered.push(member);
      seen.add(member.name);
    }
  });

  return ordered;
}

function buildMembersFromEvents(events) {
  const byName = new Map();
  events.forEach(event => {
    if (!event.name || byName.has(event.name)) return;
    byName.set(event.name, {
      name: event.name,
      icon: event.icon,
      color: event.color
    });
  });
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

function normalizeContentType(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === CONTENT_MODES.VIDEO) return CONTENT_MODES.VIDEO;
  if (normalized === CONTENT_MODES.SHORT || normalized === 'shorts') return CONTENT_MODES.SHORT;
  return CONTENT_MODES.STREAM;
}

function inferStatus(start, end) {
  const now = Date.now();
  if (end) return 'ended';
  if (start && start.getTime() <= now) return 'live';
  return 'scheduled';
}

function setView(view) {
  state.view = view;
  elements.tileViewButton.classList.toggle('active', view === 'tile');
  elements.listViewButton.classList.toggle('active', view === 'list');
  render();
}

function setContentMode(mode) {
  state.mode = normalizeContentType(mode);
  render();
}

function statusLabel(status) {
  return {
    live: 'LIVE',
    scheduled: '予定',
    ended: '終了',
    published: '公開済み',
    unknown: '不明'
  }[status] || '不明';
}

function modeLabel(mode) {
  return {
    stream: '配信',
    video: '動画'
  }[mode] || '配信';
}

function formatEventTime(event) {
  const start = formatTime(event.startDate);
  if (event.contentType !== CONTENT_MODES.STREAM) return `${start} 公開`;
  const end = event.endDate ? formatTime(event.endDate) : '';
  return end ? `${start} - ${end}` : start;
}

function normalizeDuration(value) {
  if (!value) return '';
  if (typeof value === 'number') return formatDurationSeconds(Math.round(value * 24 * 60 * 60));

  const text = String(value).trim();
  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text)) return text;

  const date = parseDate(text);
  if (date && date.getUTCFullYear() <= 1900) {
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  return text;
}

function formatDurationSeconds(totalSeconds) {
  if (!totalSeconds) return '';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDayTitle(date) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function formatRangeTitle(range) {
  return `${formatDayTitle(range.start)} - ${formatDayTitle(addDays(range.end, -1))}`;
}

function formatWeekday(date) {
  return new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(date);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    groups[key] ||= [];
    groups[key].push(item);
    return groups;
  }, {});
}

function fallbackImage(event) {
  const label = encodeURIComponent(event.contentType === CONTENT_MODES.SHORT ? 'SHORTS' : event.site || 'STREAM');
  return `https://placehold.co/640x360/edf2f8/172033?text=${label}`;
}

function fallbackAvatar(event) {
  const label = encodeURIComponent((event.name || '?').slice(0, 2));
  return `https://placehold.co/120x120/dbe2ec/172033?text=${label}`;
}

function toSoftColor(color) {
  const hex = normalizeHexColor(color);
  if (!hex) return 'rgba(23, 32, 51, 0.08)';

  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, 0.14)`;
}

function normalizeHexColor(color) {
  const value = String(color || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return '';
}

function isDarkColor(color) {
  const hex = normalizeHexColor(color);
  if (!hex) return false;

  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance < 0.58;
}

function readWatchedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(WATCHED_STORAGE_KEY) || '[]'));
  } catch (error) {
    return new Set();
  }
}

function writeWatchedIds(ids) {
  localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

function cssSafe(value) {
  return String(value).replace(/[^\w-]/g, char => char.charCodeAt(0).toString(16));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function toIsoOffset(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}
