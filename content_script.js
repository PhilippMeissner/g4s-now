const injectIcon = (titleElement, isSupported) => {
  const logo = isSupported ? chrome.runtime.getURL('./assets/check.svg') : chrome.runtime.getURL('./assets/cross.svg');
  const title = isSupported ? 'GeForce Now compatible' : 'GeForce Now incompatible';

  const CHECKMARK_HTML_CODE = `
    <img src="${logo}" class="logo spinner" title="${title}" alt="${title}"/>
  `;

  titleElement.style.display = 'inline-block';
  const containerDiv = document.createElement('div');
  containerDiv.classList.add('g4s-now-container');
  containerDiv.innerHTML = CHECKMARK_HTML_CODE;
  titleElement.after(containerDiv);
}

const isGameSupported = (gameList, gameTitle) => {
  const normalizedGameTitle = gameTitle.replace(/\W/g, '').toLowerCase();

  return !!gameList.find((game) => {
    return game.title.replace(/\W/g, '').toLowerCase() === normalizedGameTitle;
  });
}

const fetchGames = async () => {
  const CACHE_KEY = 'g4s_game_list_cache_v1';
  const CACHE_TTL_MS = 60 * 60 * 1000;

  const getCache = () => new Promise((resolve) => {
    try {
      chrome.storage.local.get([CACHE_KEY], (result) => {
        resolve(result[CACHE_KEY] || null);
      });
    } catch (e) {
      resolve(null);
    }
  });

  const setCache = (value) => new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [CACHE_KEY]: value }, () => resolve());
    } catch (e) {
      resolve();
    }
  });

  const now = Date.now();
  const cached = await getCache();
  if (cached && typeof cached.savedAt === 'number' && (now - cached.savedAt) < CACHE_TTL_MS && Array.isArray(cached.games)) {
    return cached.games;
  }

  const games = [];
  const initialPayload = `{
    apps(country: "US", language: "en_US") {
      pageInfo {
        endCursor
        hasNextPage
      }
      items {
        title
      }
    }
  }
  `;

  const endCursorPlaceholder = '%ENDCURSOR%';
  const PAYLOAD_TEMPLATE = `{
    apps(country: "US", language: "en_US", after:"${endCursorPlaceholder}") {
      pageInfo {
        endCursor
        hasNextPage
      }
      items {
        title
      }
    }
  }`

  let payload = initialPayload;
  let keepGoing = true;
  const API_URL = 'https://api-prod.nvidia.com/services/gfngames/v1/gameList';

  try {
    while (keepGoing) {
      const { data } = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: payload
      }).then((response) => response.json());

      games.push(data.apps.items);
      payload = PAYLOAD_TEMPLATE.replace(endCursorPlaceholder, data.apps.pageInfo.endCursor);
      keepGoing = data.apps.pageInfo.hasNextPage;
    }

    const flatGames = games.flat();
    // Save to cache
    await setCache({ games: flatGames, savedAt: Date.now() });
    return flatGames;
  } catch (err) {
    // If network fails but we have any cached games, return them as a fallback
    if (cached && Array.isArray(cached.games)) {
      return cached.games;
    }
    throw err;
  }
}

const titleElement = document.getElementById('appHubAppName');

if (!!titleElement) {
  fetchGames().then((gameList) => {
    const isSupported = isGameSupported(gameList, titleElement.innerText);
    injectIcon(titleElement, isSupported);
  })
}
