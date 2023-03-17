const injectIcon = (titleElement, isSupported) => {
  const logo = isSupported ? chrome.runtime.getURL('./assets/check.svg') : chrome.runtime.getURL('./assets/cross.svg');
  const title = isSupported ? 'GeForce Now compatible' : 'GeForce Now incompatible';

  const CHECKMARK_HTML_CODE = `
    <div class="g4s-now-container">
      <img src="${logo}" class="logo spinner" title="${title}" alt="${title}"/>
    </div>
  `;

  titleElement.style.display = 'inline-block';
  titleElement.after(CHECKMARK_HTML_CODE);
  // $(titleElement).css('display', 'inline-block');
  // $(titleElement).after($(CHECKMARK_HTML_CODE));
}

const isGameSupported = (gameList, gameTitle) => {
  const normalizedGameTitle = gameTitle.replace(/\W/g, '').toLowerCase();

  return !!gameList.find((game) => {
    return game.title.replace(/\W/g, '').toLowerCase() === normalizedGameTitle;
  });
}

const fetchGames = async () => {
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

  while (keepGoing) {
    const { data } = await fetch('https://api-prod.nvidia.com/gfngames/v1/gameList', {
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

  return games.flat();
}

const titleElement = document.getElementById('appHubAppName');

if (!!titleElement) {
  fetchGames().then((gameList) => {
    const isSupported = isGameSupported(gameList, titleElement.innerText);
    injectIcon(titleElement, isSupported);
  })
}
