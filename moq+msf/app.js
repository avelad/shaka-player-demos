let playerUI = null;

function getParams () {
  const params = {};

  // Extract and normalize query string and hash
  const query = location.search ? location.search.slice(1) : '';
  const hash = location.hash ? location.hash.slice(1) : '';

  // Hash parameters take precedence over query parameters
  const combined = []
    .concat(query ? query.split('&') : [])
    .concat(hash ? hash.split('&') : []);

  for (const entry of combined) {
    if (!entry) continue;

    // Split only on the first "=" to preserve values containing "="
    const [rawKey, ...rawValue] = entry.split('=');
    if (!rawKey) continue;

    let key, value;

    // Decode key safely
    try {
      key = decodeURIComponent(rawKey);
    } catch {
      console.warn('Invalid URL parameter key:', rawKey);
      continue;
    }

    // Decode value safely
    try {
      value = decodeURIComponent(rawValue.join('='));
    } catch {
      console.warn('Invalid URL parameter value for key:', key);
      continue;
    }

    // Later entries (hash) override earlier ones (query)
    params[key] = value;
  }

  return params;
}

function setupUI () {
  const inputsContainer = document.createElement('div');
  inputsContainer.id = 'inputs-container';
  document.body.appendChild(inputsContainer);

  const params = getParams();

  const defaultUrl = params.url || (Object.keys(params).length === 0 ? 'https://moqlivemock.demo.osaas.io/moq' : '');
  const defaultFingerprintUri = params.fingerprintUri || '';
  const defaultLicense = params.license || '';

  createInput(inputsContainer, 'url', defaultUrl, 'MoQ Server URL');
  createInput(inputsContainer, 'fingerprint', defaultFingerprintUri, 'Fingerprint URL (for self-signed certificates)');

  const drmContainer = document.createElement('div');
  drmContainer.classList.add('drm-container')
  inputsContainer.appendChild(drmContainer);

  const drmSelect = document.createElement('select');
  drmSelect.id = 'drm-select';
  drmSelect.classList.add('drm-select');
  const drms = [
    'None',
    'Widevine',
    'PlayReady',
  ];
  let defaultDrm = drms[0];
  if (drms.includes(params.defaultDrm)) {
    defaultDrm = params.defaultDrm;
  }
  for (const drm of drms) {
    const option = document.createElement('option');
    option.value = drm;
    option.label = drm;
    if (drm == defaultDrm) {
      option.setAttribute('selected', '');
    }
    drmSelect.appendChild(option);
  }
  drmContainer.appendChild(drmSelect);
  const drmLicenseInput = createInput(drmContainer, 'drm-license', defaultLicense, 'License URL (for encrypted streams)');

  function updateDrmLicenseState() {
    if (drmSelect.value === 'None') {
      drmLicenseInput.disabled = true;
      drmLicenseInput.style.backgroundColor = '#e1e4e8'; // visually disabled
    } else {
      drmLicenseInput.disabled = false;
      drmLicenseInput.style.backgroundColor = '';
    }
  }
  updateDrmLicenseState();
  drmSelect.addEventListener('change', updateDrmLicenseState);

  const buttonsContainer = document.createElement('div');
  buttonsContainer.id = 'buttons-container'
  const addInput = document.createElement('button');
  addInput.id = 'save';
  addInput.textContent = 'SAVE VALUES';
  addInput.addEventListener('click', function () {
    remakeHash();
  });
  buttonsContainer.appendChild(addInput);
  const loadButton = document.createElement('button');
  loadButton.id = 'load';
  loadButton.textContent = 'LOAD';
  loadButton.addEventListener('click', () => {
    loadPlayer();
  });
  buttonsContainer.appendChild(loadButton);
  const unloadButton = document.createElement('button');
  unloadButton.id = 'unload';
  unloadButton.textContent = 'UNLOAD';
  unloadButton.addEventListener('click', unloadPlayer);
  buttonsContainer.appendChild(unloadButton);
  document.body.appendChild(buttonsContainer);

  const timeDiv  = document.createElement('div');
  timeDiv.id = 'time';
  updateTime(timeDiv);
  document.body.appendChild(timeDiv);

  const playerContainer = document.createElement('div');
  playerContainer.id = 'player-container';
  document.body.appendChild(playerContainer);

  if (params.url && 'play' in params) {
    loadPlayer(true);
  }
}

function createInput (inputsContainer, id, value, placeholder) {
  const inputContainer = document.createElement('div');
  inputContainer.classList.add('input-container');

  const input = document.createElement('input');
  input.id = id;
  input.type = 'url';
  input.classList.add('url-input')
  if (value) {
    input.value = value;
  }
  input.placeholder = placeholder;
  inputContainer.appendChild(input);
  inputsContainer.appendChild(inputContainer);

  return input;
}

function updateTime (element) {
  element.textContent = new Date().toISOString();
  setTimeout(function () {
    updateTime(element);
  }, 10);
}

function unloadPlayer () {
  if (playerUI) {
    try {
      playerUI.destroy(true);
    } catch (e) {
      console.error('Error destroying UI', e);
    }
    playerUI = null;
  }
  const playerContainer = document.getElementById('player-container');
  while (playerContainer && playerContainer.firstChild){
    playerContainer.removeChild(playerContainer.firstChild);
  }
}

function loadPlayer (fromPageLoad) {
  const url = document.getElementById('url').value;
  const fingerprintUri = document.getElementById('fingerprint').value;
  const drm = document.getElementById('drm-select').value;
  const license = document.getElementById('drm-license').value;
  unloadPlayer();
  if (!url) {
    return;
  }
  const playerContainer = document.getElementById('player-container');
  const videoContainer = document.createElement('div');
  videoContainer.setAttribute('data-url', url);
  videoContainer.classList.add('video-container');
  const video = document.createElement('video');
  video.autoplay = true;
  video.setAttribute('playsinline', '');
  video.muted = !!fromPageLoad;
  video.style.width = '100%';
  videoContainer.appendChild(video);
  playerContainer.appendChild(videoContainer);

  const localPlayer = new shaka.Player();
  localPlayer.attach(video);
  const ui = new shaka.ui.Overlay(localPlayer, videoContainer, video);
  ui.configure({
    customContextMenu: true,
    castReceiverAppId: '07AEE832',
    enableKeyboardPlaybackControlsInWindow: true,
  });
  const controls = ui.getControls();
  const player = controls.getPlayer();

  const errorElement = document.createElement('div');
  errorElement.classList.add('player-error');

  let currentErrorSeverity = null;
  let currentErrorName = null;

  const handleError_ = (error, name) => {
    console.error(name, error);
    let severity = error.severity;
    if (severity == null || error.severity == undefined) {
      // It's not a shaka.util.Error. Treat it as very severe, since those
      // should not be happening.
      severity = shaka.util.Error.Severity.CRITICAL;
    }
    const message = name + (error.message || ('Error code ' + error.code));
    if (!errorElement.parentElement ||
        severity > currentErrorSeverity ||
        (name && name != currentErrorName)) {
      errorElement.textContent = message;
      currentErrorSeverity = severity;
      currentErrorName = name;
      if (!errorElement.parentElement) {
        playerContainer.append(errorElement);
      }
    }
  };

  const languages = navigator.languages || ['en-us'];
  const config = {
    manifest: {
      msf: {
        fingerprintUri: fingerprintUri || '',
      },
    },
    drm: {
      servers: {},
    },
    streaming: {
      bufferingGoal: 30,
      bufferBehind: 30,
      minTimeBetweenRecoveries: 1,
    },
    preferredAudioLanguage: languages[0],
  };
  if (license) {
    if (drm == 'Widevine') {
      config.drm.servers['com.widevine.alpha'] = license;
    } else if (drm == 'PlayReady') {
      config.drm.servers['com.microsoft.playready'] = license;
    }
  }
  player.configure(config);
  player.load(url.trim(), null, 'application/msf').then(() => {
    if (player.isAudioOnly()) {
      video.poster = 'https://shaka-player-demo.appspot.com/assets/audioOnly.gif';
    }
    if (video.paused) {
      video.play().catch(() => {});
    }
  }).catch((error) => {
    handleError_(error, '');
  });
  player.addEventListener('error', (error) => {
    if (error && error.detail) {
      handleError_(error.detail, '');
    }
  });
  playerUI = ui;
}

function remakeHash() {
  const params = [];

  const url = document.getElementById('url').value;
  if (url) {
    params.push('url=' + encodeURIComponent(url));
  }
  const fingerprintUri = document.getElementById('fingerprint').value;
  if (fingerprintUri) {
    params.push('fingerprintUri=' + encodeURIComponent(fingerprintUri));
  }

  const drmSelect = document.getElementById('drm-select');
  if (drmSelect && drmSelect.value != 'None') {
    params.push('defaultDrm=' + encodeURIComponent(drmSelect.value));

    const license = document.getElementById('drm-license').value;
    if (license) {
      params.push('license=' + encodeURIComponent(license));
    }
  }

  if (playerUI) {
    params.push('play');
  }

  const state = null;
  const title = '';
  const hash = params.length ? '#' + params.join('&') : '';
  // Calling history.replaceState can change the URL or hash of the page
  // without actually triggering any changes
  history.replaceState(state, title, document.location.pathname + hash);
}

function initApp() {
  shaka.polyfill.installAll();
  if (shaka.Player.isBrowserSupported()) {
    if (shaka.log) {
      shaka.log.setLevel(shaka.log.Level.INFO);
    }
    setupUI();
    window.addEventListener('visibilitychange', function () {
      if (!document.hidden && playerUI) {
        const localPlayer = playerUI.getControls().getPlayer();
        if (localPlayer.isLive() && localPlayer.getMediaElement().muted) {
          localPlayer.goToLive();
        }
      }
    });
  } else {
    const unsupportedDiv = document.createElement('div');
    unsupportedDiv.id = 'unsupported';
    unsupportedDiv.textContent = 'Browser not supported!';
    document.body.appendChild(unsupportedDiv);
  }
  const shakaPlayerversion = document.createElement('div');
  shakaPlayerversion.id = 'shaka-player-version';
  shakaPlayerversion.textContent = 'Shaka Player: ' + shaka.Player.version;
  document.body.appendChild(shakaPlayerversion);
}


document.addEventListener('DOMContentLoaded', initApp);