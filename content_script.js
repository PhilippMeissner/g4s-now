const injectIcon = (titleElement, isSupported) => {
  const {logo, tooltip, isSpinner} = getDisplayData(isSupported);
  titleElement.style.display = 'inline-block';

  let containerDiv = titleElement.nextElementSibling;
  if (!containerDiv || !containerDiv.classList || !containerDiv.classList.contains('g4s-now-container')) {
    containerDiv = document.createElement('div');
    containerDiv.classList.add('g4s-now-container');
    const img = document.createElement('img');
    img.className = 'logo';
    populateImage(img, logo, tooltip, isSpinner);
    containerDiv.appendChild(img);
    titleElement.after(containerDiv);
  } else {
    const img = containerDiv.querySelector('img');
    if (img) {
      populateImage(img, logo, tooltip, isSpinner);
    }
  }
}

const getDisplayData = (isSupported) => {
  const ASSETS = {
    spinner: chrome.runtime.getURL('./assets/spinner.svg'),
    check: chrome.runtime.getURL('./assets/check.svg'),
    cross: chrome.runtime.getURL('./assets/cross.svg'),
  };

  let logo, tooltip, isSpinner = false;
  if (isSupported === null) {
    logo = ASSETS.spinner;
    tooltip = 'Checking GeForce Now compatibility…';
    isSpinner = true;
  } else if (isSupported) {
    logo = ASSETS.check;
    tooltip = 'GeForce Now compatible';
  } else {
    logo = ASSETS.cross;
    tooltip = 'GeForce Now incompatible';
  }

  return {logo, tooltip, isSpinner};
}

const populateImage = (element, src, title, isSpinner) => {
  element.src = src;
  element.title = title;
  element.alt = title;

  if (isSpinner) {
    element.classList.add('loading');
  } else {
    element.classList.remove('loading');
  }
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
    // If the network fails, but we have any cached games, return them as a fallback
    if (cached && Array.isArray(cached.games)) {
      return cached.games;
    }
    throw err;
  }
}

const titleElement = document.getElementById('appHubAppName');

if (!!titleElement) {
  // Show spinner immediately while fetching/caching
  injectIcon(titleElement, null);

  fetchGames().then((gameList) => {
    const isSupported = isGameSupported(gameList, titleElement.innerText);
    injectIcon(titleElement, isSupported);
  })
}
