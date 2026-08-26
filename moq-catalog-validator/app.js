/**
 * MOQ catalog validator.
 *
 * Validates catalogs against:
 *   - MSF   draft-ietf-moq-msf-00 / -01
 *   - CMSF  draft-ietf-moq-cmsf-00 / -01
 * with packaging extensions:
 *   - LOC    (draft-ietf-moq-loc-02)
 *   - CMAF   (CMSF section 3)
 *   - LOCMAF (draft-einarsson-moq-locmaf-00)
 *   - M2TS   (draft-gregoire-moq-msfts-00)
 */
(function() {
  'use strict';

  //////////////////////////////////////////////////////////////////////////////
  // Spec references
  //////////////////////////////////////////////////////////////////////////////

  const DRAFTS = {
    'msf-00': {
      label: 'MSF draft-00',
      url: 'https://datatracker.ietf.org/doc/html/draft-ietf-moq-msf-00',
    },
    'msf-01': {
      label: 'MSF draft-01',
      url: 'https://datatracker.ietf.org/doc/html/draft-ietf-moq-msf-01',
    },
    'cmsf-00': {
      label: 'CMSF draft-00',
      url: 'https://datatracker.ietf.org/doc/html/draft-ietf-moq-cmsf-00',
    },
    'cmsf-01': {
      label: 'CMSF draft-01',
      url: 'https://datatracker.ietf.org/doc/html/draft-ietf-moq-cmsf-01',
    },
    'locmaf': {
      label: 'LOCMAF draft-00',
      url: 'https://datatracker.ietf.org/doc/html/draft-einarsson-moq-locmaf-00',
    },
    'msfts': {
      label: 'MSF-TS draft-00',
      url: 'https://datatracker.ietf.org/doc/html/draft-gregoire-moq-msfts-00',
    },
    'loc': {
      label: 'LOC draft-02',
      url: 'https://www.ietf.org/archive/id/draft-ietf-moq-loc-02.html',
    },
  };

  /** Builds a spec reference. `key` is a DRAFTS key, `section` a dotted number. */
  function ref(key, section) {
    const draft = DRAFTS[key];
    if (!draft) return null;
    return {
      label: section ? draft.label + ' §' + section : draft.label,
      url: section ? draft.url + '#section-' + section : draft.url,
    };
  }

  /** Picks the msf-00 or msf-01 reference depending on the detected version. */
  function msfRef(profile, section00, section01) {
    return profile.version === 0 ? ref('msf-00', section00) : ref('msf-01', section01);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Field registry
  //
  // type:  expected JSON type ('string', 'number', 'boolean', 'array', 'object')
  // v:     versions the field exists in ([0], [1] or [0, 1])
  // spec:  which document defines it
  // sec00 / sec01: section numbers within MSF-00 / MSF-01 (or the extension doc)
  //////////////////////////////////////////////////////////////////////////////

  const ROOT_FIELDS = {
    version: {type: 'string|number', v: [0, 1], required: true, sec00: '5.1.1', sec01: '5.1.1'},
    generatedAt: {type: 'number', v: [0, 1], sec00: '5.1.6', sec01: '5.1.2'},
    isComplete: {type: 'boolean', v: [0, 1], sec00: '5.1.7', sec01: '5.1.3'},
    tracks: {type: 'array', v: [0, 1], required: true, sec00: '5.1.8', sec01: '5.1.4'},
    deltaUpdate: {type: 'boolean|array', v: [0, 1], sec00: '5.1.2', sec01: '5.1.6'},
    addTracks: {type: 'array', v: [0], sec00: '5.1.3'},
    removeTracks: {type: 'array', v: [0], sec00: '5.1.4'},
    cloneTracks: {type: 'array', v: [0], sec00: '5.1.5'},
    publishTracks: {type: 'array', v: [1], sec01: '5.1.5'},
    initDataList: {type: 'array', v: [1], sec01: '5.1.7'},
    contentProtections: {type: 'array', v: [1], spec: 'cmsf', cmsfOnly: true, sec: '4.1.1'},
  };

  const TRACK_FIELDS = {
    // Core, both versions.
    namespace: {type: 'string', v: [0, 1], sec00: '5.1.10', sec01: '5.2.2'},
    name: {type: 'string', v: [0, 1], required: true, sec00: '5.1.11', sec01: '5.2.3'},
    packaging: {type: 'string', v: [0, 1], required: true, sec00: '5.1.12', sec01: '5.2.4'},
    eventType: {type: 'string', v: [0, 1], sec00: '5.1.13', sec01: '5.2.5'},
    role: {type: 'string', v: [0, 1], sec00: '5.1.14', sec01: '5.2.6'},
    isLive: {type: 'boolean', v: [0, 1], required: true, sec00: '5.1.15', sec01: '5.2.7'},
    targetLatency: {type: 'number', v: [0, 1], sec00: '5.1.16', sec01: '5.2.8'},
    label: {type: 'string', v: [0, 1], sec00: '5.1.17', sec01: '5.2.10'},
    renderGroup: {type: 'number', v: [0, 1], sec00: '5.1.18', sec01: '5.2.11'},
    altGroup: {type: 'number', v: [0, 1], sec00: '5.1.19', sec01: '5.2.12'},
    depends: {type: 'array', v: [0, 1], sec00: '5.1.21', sec01: '5.2.14'},
    temporalId: {type: 'number', v: [0, 1], sec00: '5.1.22', sec01: '5.2.16'},
    spatialId: {type: 'number', v: [0, 1], sec00: '5.1.23', sec01: '5.2.17'},
    codec: {type: 'string', v: [0, 1], sec00: '5.1.24', sec01: '5.2.18'},
    mimeType: {type: 'string', v: [0, 1], sec00: '5.1.25', sec01: '5.2.19'},
    framerate: {type: 'number', v: [0, 1], sec00: '5.1.26', sec01: '5.2.20'},
    timescale: {type: 'number', v: [0, 1], sec00: '5.1.27', sec01: '5.2.21'},
    bitrate: {type: 'number', v: [0, 1], sec00: '5.1.28', sec01: '5.2.22'},
    width: {type: 'number', v: [0, 1], sec00: '5.1.29', sec01: '5.2.26'},
    height: {type: 'number', v: [0, 1], sec00: '5.1.30', sec01: '5.2.27'},
    samplerate: {type: 'number', v: [0, 1], sec00: '5.1.31', sec01: '5.2.28'},
    channelConfig: {type: 'string', v: [0, 1], sec00: '5.1.32', sec01: '5.2.29'},
    displayWidth: {type: 'number', v: [0, 1], sec00: '5.1.33', sec01: '5.2.30'},
    displayHeight: {type: 'number', v: [0, 1], sec00: '5.1.34', sec01: '5.2.31'},
    lang: {type: 'string', v: [0, 1], sec00: '5.1.35', sec01: '5.2.32'},
    parentName: {type: 'string', v: [0, 1], sec00: '5.1.36', sec01: '5.2.33'},
    trackDuration: {type: 'number', v: [0, 1], sec00: '5.1.37', sec01: '5.2.35'},
    // draft-00 only.
    initData: {type: 'string', v: [0], sec00: '5.1.20'},
    // draft-01 only.
    buffers: {type: 'object', v: [1], sec01: '5.2.9'},
    initRef: {type: 'string', v: [1], sec01: '5.2.13'},
    template: {type: 'array', v: [1], sec01: '5.2.15'},
    avgBitrate: {type: 'number', v: [1], sec01: '5.2.23'},
    maxGopDuration: {type: 'number', v: [1], sec01: '5.2.24'},
    maxGroupDuration: {type: 'number', v: [1], sec01: '5.2.25'},
    parentNamespace: {type: 'string', v: [1], sec01: '5.2.34'},
    connectionUri: {type: 'string', v: [1], sec01: '5.2.36'},
    token: {type: 'string', v: [1], sec01: '5.2.37'},
    encryptionScheme: {type: 'string', v: [1], sec01: '5.2.38'},
    cipherSuite: {type: 'string', v: [1], sec01: '5.2.39'},
    keyId: {type: 'string', v: [1], sec01: '5.2.40'},
    trackBaseKey: {type: 'string', v: [1], sec01: '5.2.41'},
    authInfo: {type: 'object', v: [1], sec01: '5.2.42'},
    accessibility: {type: 'array', v: [1], sec01: '5.2.44'},
    // CMSF (both versions).
    maxGrpSapStartingType: {type: 'number', v: [0, 1], spec: 'cmsf', cmsfOnly: true, sec: '3.5.2.1'},
    maxObjSapStartingType: {type: 'number', v: [0, 1], spec: 'cmsf', cmsfOnly: true, sec: '3.5.2.2'},
    // CMSF draft-01 only.
    contentProtectionRefIDs: {type: 'array', v: [1], spec: 'cmsf', cmsfOnly: true, sec: '4.1.2'},
    // LOCMAF.
    locmafVersion: {type: 'string', v: [0, 1], spec: 'locmaf', sec: '4'},
    // MSF-TS.
    m2tsPacketSize: {type: 'number', v: [0, 1], spec: 'msfts', sec: '6.2'},
    m2tsPacketsPerObject: {type: 'number', v: [0, 1], spec: 'msfts', sec: '6.3'},
    m2tsProgramNumber: {type: 'number', v: [0, 1], spec: 'msfts', sec: '6.4'},
    m2tsPmtPid: {type: 'number', v: [0, 1], spec: 'msfts', sec: '6.5'},
    m2tsPcrPid: {type: 'number', v: [0, 1], spec: 'msfts', sec: '6.6'},
    m2tsPsiInterval: {type: 'number', v: [0, 1], spec: 'msfts', sec: '6.7'},
    m2tsRandomAccess: {type: 'boolean', v: [0, 1], spec: 'msfts', sec: '6.8'},
    m2tsTimestampMode: {type: 'string', v: [0, 1], spec: 'msfts', sec: '6.9'},
    m2tsScte35Pid: {type: 'number', v: [0, 1], spec: 'msfts', sec: '6.10'},
  };

  const PACKAGING_VALUES = {
    loc: {v: [0, 1], spec: 'loc', media: true},
    cmaf: {v: [0, 1], spec: 'cmsf', cmsfOnly: true, media: true, isobmff: true},
    locmaf: {v: [0, 1], spec: 'locmaf', cmsfOnly: true, media: true, isobmff: true},
    m2ts: {v: [0, 1], spec: 'msfts', media: true},
    mediatimeline: {v: [0, 1]},
    eventtimeline: {v: [0, 1]},
    moqlog: {v: [1], publishOnly: true},
    moqmetrics: {v: [1], publishOnly: true},
  };

  const ROLE_VALUES = [
    'audiodescription', 'video', 'audio', 'mediatimeline', 'eventtimeline',
    'caption', 'subtitle', 'signlanguage', 'log', 'metrics',
  ];

  const CIPHER_SUITES = ['aes-128-gcm-sha256', 'aes-256-gcm-sha512', 'aes-128-ctr-hmac-sha256-80'];
  const AUTH_SCHEMES = ['privacy-pass', 'cat'];
  const CENC_SCHEMES = ['cenc', 'cbcs'];
  const ACCESSIBILITY_SCHEMES = ['urn:scte:dash:cc:cea-608:2015', 'urn:scte:dash:cc:cea-708:2015'];
  const DRM_SYSTEMS = {
    'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed': 'Widevine',
    '9a04f079-9840-4286-ab92-e65be0885f95': 'PlayReady',
    '94ce86fb-07ff-4f43-adb8-93d2fa968ca2': 'FairPlay',
    '1077efec-c0b2-4d02-ace3-3c1e52e2fb4b': 'ClearKey',
  };

  const AUDIO_CODEC_RE = /^(opus|mp4a|mp3|flac|vorbis|ac-3|ec-3|ac-4|alaw|ulaw|pcm-|dtsc|dtse|dtsx)/i;
  const VIDEO_CODEC_RE = /^(av01|avc1|avc3|hev1|hvc1|vp8|vp09|vvc1|vvi1)/i;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const BASE64_RE = /^[A-Za-z0-9+/=\s]+$/;
  const BCP47_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
  const VARIABLE_RE = /%[A-Za-z0-9_-]+%/g;

  //////////////////////////////////////////////////////////////////////////////
  // Small helpers
  //////////////////////////////////////////////////////////////////////////////

  function jsonType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  function isPlainObject(value) {
    return jsonType(value) === 'object';
  }

  function typeMatches(value, expected) {
    return expected.split('|').indexOf(jsonType(value)) !== -1;
  }

  /** Levenshtein distance, used to suggest a field name for likely typos. */
  function editDistance(a, b) {
    const rows = [];
    for (let i = 0; i <= a.length; i++) rows.push([i]);
    for (let j = 1; j <= b.length; j++) rows[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      }
    }
    return rows[a.length][b.length];
  }

  /** Returns the known field name closest to `name`, if it is close enough. */
  function closestField(name, candidates) {
    let best = null;
    let bestDistance = Infinity;
    candidates.forEach(function(candidate) {
      if (candidate === name) return;
      const distance = editDistance(name.toLowerCase(), candidate.toLowerCase());
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    });
    const threshold = name.length <= 5 ? 1 : name.length <= 10 ? 2 : 3;
    return bestDistance <= threshold ? best : null;
  }

  /** Resolves the spec reference for a registry entry. */
  function fieldRef(entry, profile) {
    if (!entry) return null;
    if (entry.spec === 'cmsf') return ref(profile.family === 'cmsf' ? 'cmsf-' + pad(profile.version) : 'cmsf-01', entry.sec);
    if (entry.spec) return ref(entry.spec, entry.sec);
    return msfRef(profile, entry.sec00, entry.sec01);
  }

  function pad(version) {
    return version === 0 ? '00' : '01';
  }

  //////////////////////////////////////////////////////////////////////////////
  // Report
  //////////////////////////////////////////////////////////////////////////////

  function Report() {
    this.items = [];
  }

  Report.prototype.add = function(severity, path, message, reference, hint) {
    this.items.push({severity: severity, path: path, message: message, ref: reference, hint: hint});
  };

  Report.prototype.error = function(path, message, reference, hint) {
    this.add('error', path, message, reference, hint);
  };

  Report.prototype.warn = function(path, message, reference, hint) {
    this.add('warning', path, message, reference, hint);
  };

  Report.prototype.info = function(path, message, reference, hint) {
    this.add('info', path, message, reference, hint);
  };

  Report.prototype.count = function(severity) {
    return this.items.filter(function(item) { return item.severity === severity; }).length;
  };

  //////////////////////////////////////////////////////////////////////////////
  // Profile detection
  //
  // `version` alone is not reliable: the drafts define it as a Number in -00 and
  // a String in -01, but the -01 examples still use "1" rather than "draft-01".
  // Structural evidence is therefore scored alongside it.
  //////////////////////////////////////////////////////////////////////////////

  const V1_TRACK_FIELDS = [
    'buffers', 'initRef', 'template', 'avgBitrate', 'maxGopDuration', 'maxGroupDuration',
    'parentNamespace', 'connectionUri', 'token', 'encryptionScheme', 'cipherSuite',
    'keyId', 'trackBaseKey', 'authInfo', 'accessibility', 'contentProtectionRefIDs',
  ];

  function allTrackObjects(catalog) {
    const tracks = [];
    const push = function(list) {
      if (Array.isArray(list)) {
        list.forEach(function(track) { if (isPlainObject(track)) tracks.push(track); });
      }
    };
    push(catalog.tracks);
    push(catalog.publishTracks);
    push(catalog.addTracks);
    push(catalog.removeTracks);
    push(catalog.cloneTracks);
    if (Array.isArray(catalog.deltaUpdate)) {
      catalog.deltaUpdate.forEach(function(operation) {
        if (isPlainObject(operation)) push(operation.tracks);
      });
    }
    return tracks;
  }

  function detectProfile(catalog) {
    const evidence = [];
    const conflicts = [];
    let v0Score = 0;
    let v1Score = 0;
    const tracks = allTrackObjects(catalog);

    const versionType = jsonType(catalog.version);
    if (versionType === 'number') {
      v0Score += 2;
      evidence.push('"version" is a Number, as defined by draft-00.');
    } else if (versionType === 'string') {
      v1Score += 2;
      evidence.push('"version" is a String, as defined by draft-01.');
      if (/^draft-(\d+)$/.test(catalog.version)) {
        evidence.push('"version" uses the draft-XX convention: ' + catalog.version + '.');
      }
    }

    if (jsonType(catalog.deltaUpdate) === 'array') {
      v1Score += 3;
      evidence.push('"deltaUpdate" is an Array of operations (draft-01 delta format).');
    } else if (jsonType(catalog.deltaUpdate) === 'boolean') {
      v0Score += 3;
      evidence.push('"deltaUpdate" is a Boolean (draft-00 delta format).');
    }
    ['addTracks', 'removeTracks', 'cloneTracks'].forEach(function(field) {
      if (catalog[field] !== undefined) {
        v0Score += 3;
        evidence.push('Root field "' + field + '" only exists in draft-00.');
      }
    });
    if (catalog.initDataList !== undefined) {
      v1Score += 3;
      evidence.push('Root field "initDataList" only exists in draft-01.');
    }
    if (catalog.publishTracks !== undefined) {
      v1Score += 3;
      evidence.push('Root field "publishTracks" only exists in draft-01.');
    }

    let sawInitData = false;
    let sawM2ts = false;
    tracks.forEach(function(track) {
      if (track.initData !== undefined) sawInitData = true;
      if (track.packaging === 'm2ts') sawM2ts = true;
      V1_TRACK_FIELDS.forEach(function(field) {
        if (track[field] !== undefined) {
          v1Score += 2;
          evidence.push('Track field "' + field + '" only exists in draft-01.');
        }
      });
    });
    // MSF-TS reuses the draft-00 style "initData" field, so it is not evidence there.
    if (sawInitData && !sawM2ts) {
      v0Score += 2;
      evidence.push('Track field "initData" was replaced by "initDataList"/"initRef" in draft-01.');
    }

    const version = v1Score >= v0Score ? 1 : 0;
    if (v0Score > 0 && v1Score > 0) {
      conflicts.push('The catalog mixes draft-00 and draft-01 constructs; validating as draft-' +
          pad(version) + '. Use the profile selector to force the other version.');
    }

    // Family detection.
    let family = 'msf';
    const packagings = {};
    tracks.forEach(function(track) {
      if (typeof track.packaging === 'string') packagings[track.packaging] = true;
    });
    if (packagings.cmaf || packagings.locmaf) {
      family = 'cmsf';
      evidence.push('CMAF-family packaging present, so the catalog is a CMSF catalog.');
    }
    if (catalog.contentProtections !== undefined) {
      family = 'cmsf';
      evidence.push('Root field "contentProtections" is defined by CMSF draft-01.');
    }
    tracks.forEach(function(track) {
      if (track.maxGrpSapStartingType !== undefined || track.maxObjSapStartingType !== undefined ||
          track.contentProtectionRefIDs !== undefined) {
        family = 'cmsf';
      }
    });

    const extensions = [];
    if (packagings.loc) extensions.push('LOC');
    if (packagings.cmaf) extensions.push('CMAF');
    if (packagings.locmaf) extensions.push('LOCMAF');
    if (packagings.m2ts) extensions.push('M2TS');
    if (packagings.mediatimeline) extensions.push('Media timeline');
    if (packagings.eventtimeline) extensions.push('Event timeline');
    if (packagings.moqlog) extensions.push('MoQ log');
    if (packagings.moqmetrics) extensions.push('MoQ metrics');

    return {
      family: family,
      version: version,
      id: family + '-' + pad(version),
      label: (family === 'cmsf' ? 'CMSF' : 'MSF') + ' draft-' + pad(version),
      extensions: extensions,
      packagings: Object.keys(packagings),
      evidence: evidence,
      conflicts: conflicts,
      forced: false,
    };
  }

  function forcedProfile(id, detected) {
    const parts = id.split('-');
    return {
      family: parts[0],
      version: parts[1] === '00' ? 0 : 1,
      id: id,
      label: (parts[0] === 'cmsf' ? 'CMSF' : 'MSF') + ' draft-' + parts[1],
      extensions: detected.extensions,
      packagings: detected.packagings,
      evidence: ['Profile forced manually. Auto-detection suggested ' + detected.label + '.'],
      conflicts: [],
      forced: true,
    };
  }

  //////////////////////////////////////////////////////////////////////////////
  // Field-level checks
  //////////////////////////////////////////////////////////////////////////////

  /** Checks the declared JSON type of a known field. */
  function checkType(report, path, name, value, entry, profile) {
    if (!typeMatches(value, entry.type)) {
      report.error(path, 'Field "' + name + '" must be a JSON ' + entry.type.split('|').join(' or ') +
          ', but it is ' + jsonType(value) + '.', fieldRef(entry, profile));
      return false;
    }
    return true;
  }

  /** Flags fields that belong to another draft version or to another family. */
  function checkAvailability(report, path, name, entry, profile) {
    if (entry.v.indexOf(profile.version) === -1) {
      const other = profile.version === 0 ? 'draft-01' : 'draft-00';
      report.error(path, 'Field "' + name + '" is not defined in ' + profile.label +
          '; it belongs to ' + other + '.', fieldRef(entry, profile),
          'Either remove it or validate against ' + other + '.');
      return false;
    }
    if (entry.cmsfOnly && profile.family !== 'cmsf') {
      report.warn(path, 'Field "' + name + '" is defined by CMSF, but the catalog was detected as MSF.',
          fieldRef(entry, profile), 'Add CMAF-packaged tracks or force the CMSF profile.');
    }
    return true;
  }

  /** Reports unknown fields, suggesting a known name when it looks like a typo. */
  function checkUnknown(report, path, name, registry, profile) {
    const known = Object.keys(registry);
    const suggestion = closestField(name, known);
    const collision = known.filter(function(field) {
      return field.toLowerCase() === name.toLowerCase();
    })[0];
    if (collision) {
      report.error(path, 'Custom field "' + name + '" collides with the specified field "' + collision +
          '" (field names are case-sensitive).',
          msfRef(profile, '5.1', '5'), 'Rename it to "' + collision + '".');
      return;
    }
    if (suggestion) {
      report.warn(path, 'Unknown field "' + name + '". Did you mean "' + suggestion + '"?',
          msfRef(profile, '5.1', '5'),
          'Custom fields are allowed but MUST NOT collide with specified field names.');
      return;
    }
    report.info(path, 'Custom field "' + name + '" is not defined by the spec; parsers MUST ignore it.',
        msfRef(profile, '5.1', '5'));
  }

  /** Validates %variable% syntax in string values (draft-01 section 5.4). */
  function checkVariables(report, path, value, profile) {
    if (profile.version !== 1 || typeof value !== 'string' || value.indexOf('%') === -1) return;
    const stripped = value.replace(VARIABLE_RE, '');
    if (stripped.indexOf('%') !== -1) {
      report.error(path, 'The percent character MUST only appear as part of a %variable% reference.',
          ref('msf-01', '5.4.1'),
          'Variable names may only contain alphanumerics, hyphens and underscores.');
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Track validation
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Splits the codec field into its individual codec strings. A track normally
   * declares a single codec, but an m2ts track carries a multiplex, so the
   * field may hold an RFC 6381 comma-separated list describing every
   * elementary stream in the program.
   */
  function codecList(track) {
    if (typeof track.codec !== 'string') return [];
    return track.codec.split(',').map(function(codec) { return codec.trim(); });
  }

  function isAudioTrack(track) {
    return track.role === 'audio' || track.role === 'audiodescription' ||
        codecList(track).some(function(codec) { return AUDIO_CODEC_RE.test(codec); });
  }

  function isVideoTrack(track) {
    return track.role === 'video' || track.role === 'signlanguage' ||
        codecList(track).some(function(codec) { return VIDEO_CODEC_RE.test(codec); });
  }

  /** Best-effort guess of what the track carries, used to report missing fields. */
  function guessRole(track) {
    if (typeof track.role === 'string') return track.role;
    const codecs = codecList(track);
    if (codecs.length) {
      const video = codecs.some(function(codec) { return VIDEO_CODEC_RE.test(codec); });
      const audio = codecs.some(function(codec) { return AUDIO_CODEC_RE.test(codec); });
      if (video && audio) return 'multiplexed audio + video (guessed from codec)';
      if (audio) return 'audio (guessed from codec)';
      if (video) return 'video (guessed from codec)';
    }
    if (track.width !== undefined || track.height !== undefined || track.framerate !== undefined) {
      return 'video (guessed from width/height/framerate)';
    }
    if (track.samplerate !== undefined || track.channelConfig !== undefined) {
      return 'audio (guessed from samplerate/channelConfig)';
    }
    if (track.packaging === 'mediatimeline' || track.packaging === 'eventtimeline') return track.packaging;
    return null;
  }

  function validatePackaging(report, track, path, profile, kind) {
    const packaging = track.packaging;
    if (typeof packaging !== 'string') return;
    const entry = PACKAGING_VALUES[packaging];
    if (!entry) {
      report.error(path + '.packaging', 'Unknown packaging value "' + packaging + '". Allowed values are: ' +
          Object.keys(PACKAGING_VALUES).join(', ') + '.', msfRef(profile, '5.1.12', '5.2.4'));
      return;
    }
    if (entry.v.indexOf(profile.version) === -1) {
      report.error(path + '.packaging', 'Packaging "' + packaging + '" is not defined in ' + profile.label + '.',
          ref(entry.spec || 'msf-01', entry.spec ? entry.sec : '5.2.4'));
    }
    if (entry.cmsfOnly && profile.family !== 'cmsf') {
      report.warn(path + '.packaging', 'Packaging "' + packaging + '" is defined by CMSF, not by plain MSF.',
          ref('cmsf-' + pad(profile.version), '3.5.1'));
    }
    if (entry.publishOnly && kind !== 'publish') {
      report.error(path + '.packaging', 'Packaging "' + packaging +
          '" MUST be declared inside the publishTracks array, not in tracks.',
          ref('msf-01', packaging === 'moqlog' ? '9.4' : '10.4'));
    }
  }

  function validateTrack(report, track, path, profile, ctx, kind) {
    if (!isPlainObject(track)) {
      report.error(path, 'A track entry must be a JSON Object, but it is ' + jsonType(track) + '.',
          msfRef(profile, '5.1.9', '5.2.1'));
      return;
    }

    // 1. Known/unknown fields, types, availability.
    Object.keys(track).forEach(function(name) {
      const entry = TRACK_FIELDS[name];
      const fieldPath = path + '.' + name;
      if (!entry) {
        checkUnknown(report, fieldPath, name, TRACK_FIELDS, profile);
        return;
      }
      if (!checkAvailability(report, fieldPath, name, entry, profile)) return;
      checkType(report, fieldPath, name, track[name], entry, profile);
      checkVariables(report, fieldPath, track[name], profile);
    });

    // 2. Delta-operation shapes have their own, restricted requirements.
    if (kind === 'remove') {
      if (track.name === undefined) {
        report.error(path, 'A remove operation track object MUST include "name".',
            msfRef(profile, '5.1.4', '5.1.6'));
      }
      Object.keys(track).forEach(function(name) {
        if (name !== 'name' && name !== 'namespace') {
          report.error(path + '.' + name, 'A remove operation track object MUST NOT hold any field other ' +
              'than "name" and "namespace".', msfRef(profile, '5.1.4', '5.1.6'));
        }
      });
      return;
    }
    if (kind === 'clone') {
      if (track.parentName === undefined) {
        report.error(path, 'A clone operation track object MUST include "parentName".',
            msfRef(profile, '5.1.5', '5.1.6'));
      }
      if (track.name === undefined) {
        report.error(path, 'A cloned track MUST declare a new "name".',
            msfRef(profile, '5.2', '5.1.6'));
      }
      return;
    }
    if (kind !== 'clone' && track.parentName !== undefined) {
      report.error(path + '.parentName', '"parentName" MUST only be used inside a clone operation.',
          msfRef(profile, '5.1.36', '5.2.33'));
    }
    if (kind !== 'clone' && track.parentNamespace !== undefined) {
      report.error(path + '.parentNamespace', '"parentNamespace" MUST only be used inside a clone operation.',
          ref('msf-01', '5.2.34'));
    }

    // 3. Mandatory fields.
    if (track.name === undefined) {
      report.error(path, 'Missing required field "name".', msfRef(profile, '5.1.11', '5.2.3'));
    }
    if (track.packaging === undefined) {
      report.error(path, 'Missing required field "packaging".', msfRef(profile, '5.1.12', '5.2.4'),
          'Allowed values: ' + Object.keys(PACKAGING_VALUES).join(', ') + '.');
    }
    if (track.isLive === undefined) {
      if (kind === 'publish') {
        report.info(path, 'Field "isLive" is listed as required for track objects, but the publish-track ' +
            'examples in the draft omit it.', ref('msf-01', '5.2.7'));
      } else {
        report.error(path, 'Missing required field "isLive".', msfRef(profile, '5.1.15', '5.2.7'));
      }
    }
    validatePackaging(report, track, path, profile, kind);

    const packaging = track.packaging;
    const audio = isAudioTrack(track);
    const video = isVideoTrack(track);
    const timeline = packaging === 'mediatimeline' || packaging === 'eventtimeline';
    const publishPackaging = packaging === 'moqlog' || packaging === 'moqmetrics';

    // 4. Role.
    if (track.role === undefined) {
      if (!timeline && !publishPackaging) {
        const guessed = guessRole(track);
        report.info(path, 'Optional field "role" is absent.' +
            (guessed ? ' Based on the other fields this looks like a "' + guessed + '" track.' : ''),
            msfRef(profile, '5.1.14', '5.2.6'));
      }
    } else if (typeof track.role === 'string' && ROLE_VALUES.indexOf(track.role) === -1) {
      report.info(path + '.role', 'Role "' + track.role + '" is not one of the reserved roles (' +
          ROLE_VALUES.join(', ') + '). Custom roles are allowed if they do not collide.',
          msfRef(profile, '5.1.14', '5.2.6'));
    }

    // 5. Codec and media descriptors.
    //
    // The MSF codec, bitrate, samplerate, channelConfig and width/height rules
    // are conditioned on the track carrying media, not on "loc" packaging: the
    // mention of LOC in the codec definition only names the registry the string
    // comes from. MSF-TS inherits every MSF requirement that is not explicitly
    // overridden, so m2ts tracks are held to the same rules -- a player needs
    // them to initialise a decoder and to run ABR across alternate renditions.
    const mediaPackaging = packaging === 'loc' || packaging === 'cmaf' ||
        packaging === 'locmaf' || packaging === 'm2ts';
    const m2tsHint = 'The MSF-TS examples omit it, but a subscriber needs the codec to select a rendition ' +
        'and initialise a decoder before it has parsed the PMT. Use an RFC 6381 / WebCodecs codec string, ' +
        'or a comma-separated list when the program multiplexes several elementary streams, ' +
        'e.g. "avc1.640028,mp4a.40.2".';
    if (track.codec === undefined && (audio || video || (mediaPackaging && !timeline))) {
      if (mediaPackaging) {
        report.error(path, 'Missing conditionally required field "codec". It MUST be specified for tracks ' +
            'which have an inherent codec, such as audio and video tracks.',
            msfRef(profile, '5.1.24', '5.2.18'),
            packaging === 'm2ts'
              ? m2tsHint
              : 'For LOC content use the WebCodecs codec registry strings, e.g. "opus" or "av01.0.08M.10".');
      } else {
        report.warn(path, 'Field "codec" is absent on what looks like a media track.',
            msfRef(profile, '5.1.24', '5.2.18'));
      }
    }
    const codecs = codecList(track);
    const multiplexed = codecs.length > 1;
    if (multiplexed) {
      codecs.forEach(function(codec, codecIndex) {
        if (!codec) {
          report.error(path + '.codec', 'Empty entry at position ' + codecIndex + ' in the codec list.',
              msfRef(profile, '5.1.24', '5.2.18'));
        }
      });
      if (packaging !== 'm2ts') {
        report.warn(path + '.codec', 'A comma-separated codec list describes a multiplex. A track with ' +
            '"' + packaging + '" packaging carries a single elementary stream, so it declares a single codec.',
            msfRef(profile, '5.1.24', '5.2.18'));
      }
    }
    if (audio) {
      // A multiplexed track has one samplerate/channelConfig field but several
      // elementary streams, so the requirement cannot be met unambiguously.
      const multiplexHint = 'This track multiplexes several elementary streams; describe the audio ' +
          'programme a subscriber is expected to render, or split the renditions into separate tracks.';
      if (track.samplerate === undefined) {
        report.add(multiplexed ? 'warning' : 'error', path,
            'Missing conditionally required field "samplerate". It MUST accompany tracks ' +
            'for which audio codecs are specified.', msfRef(profile, '5.1.31', '5.2.28'),
            multiplexed ? multiplexHint : undefined);
      }
      if (track.channelConfig === undefined) {
        report.add(multiplexed ? 'warning' : 'error', path,
            'Missing conditionally required field "channelConfig". It MUST accompany tracks ' +
            'for which audio codecs are specified.', msfRef(profile, '5.1.32', '5.2.29'),
            multiplexed ? multiplexHint : undefined);
      }
    }
    if (video) {
      if (track.width === undefined || track.height === undefined) {
        report.warn(path, 'Fields "width"/"height" SHOULD accompany tracks which have a visual representation.',
            msfRef(profile, '5.1.29', '5.2.26'),
            packaging === 'm2ts'
              ? 'Without them a subscriber cannot size its renderer or pick a rendition that fits the display.'
              : undefined);
      }
      if (track.framerate === undefined) {
        report.info(path, 'Optional field "framerate" is absent on a video track.',
            msfRef(profile, '5.1.26', '5.2.20'));
      }
    }
    if ((audio || video) && track.bitrate === undefined) {
      if (profile.version === 1) {
        report.error(path, 'Missing conditionally required field "bitrate". It MUST be specified for audio ' +
            'and video tracks.', ref('msf-01', '5.2.22'));
      } else {
        report.warn(path, 'Field "bitrate" is absent on an audio/video track.', ref('msf-00', '5.1.28'));
      }
    }
    if (typeof track.channelConfig === 'number') {
      report.error(path + '.channelConfig', '"channelConfig" must be a String, e.g. "2", not a Number.',
          msfRef(profile, '5.1.32', '5.2.29'));
    }
    if (typeof track.lang === 'string' && !BCP47_RE.test(track.lang)) {
      report.warn(path + '.lang', '"' + track.lang + '" does not look like a BCP 47 language tag.',
          msfRef(profile, '5.1.35', '5.2.32'));
    }

    // 6. Live/VOD consistency.
    if (track.isLive === true && track.trackDuration !== undefined) {
      report.error(path + '.trackDuration', '"trackDuration" MUST NOT be included when "isLive" is true.',
          msfRef(profile, '5.1.37', '5.2.35'));
    }
    if (track.isLive === false && track.targetLatency !== undefined) {
      if (profile.version === 0) {
        report.error(path + '.targetLatency', '"targetLatency" MUST NOT be included when "isLive" is FALSE.',
            ref('msf-00', '5.1.16'));
      } else {
        report.info(path + '.targetLatency', '"targetLatency" is ignored because "isLive" is false.',
            ref('msf-01', '5.2.8'));
      }
    }
    if (track.targetLatency !== undefined && track.buffers !== undefined) {
      report.error(path, '"targetLatency" MUST NOT be present when "buffers" is present within a track ' +
          'definition.', ref('msf-01', '5.2.9'));
    }
    if (isPlainObject(track.buffers)) {
      Object.keys(track.buffers).forEach(function(key) {
        if (['target', 'min', 'max'].indexOf(key) === -1) {
          report.info(path + '.buffers.' + key, 'Unknown key in the target buffer object; it MUST be ignored.',
              ref('msf-01', '5.2.9'));
        } else if (typeof track.buffers[key] !== 'number') {
          report.error(path + '.buffers.' + key, 'Buffer "' + key + '" must be a Number of milliseconds.',
              ref('msf-01', '5.2.9'));
        }
      });
      const buffers = track.buffers;
      if (typeof buffers.min === 'number' && typeof buffers.target === 'number' && buffers.min > buffers.target) {
        report.warn(path + '.buffers', 'min buffer (' + buffers.min + ') is larger than target (' +
            buffers.target + ').', ref('msf-01', '5.2.9'));
      }
      if (typeof buffers.max === 'number' && typeof buffers.target === 'number' && buffers.max < buffers.target) {
        report.warn(path + '.buffers', 'max buffer (' + buffers.max + ') is smaller than target (' +
            buffers.target + ').', ref('msf-01', '5.2.9'));
      }
    }

    // 7. Timeline tracks.
    if (packaging === 'eventtimeline') {
      if (track.eventType === undefined) {
        report.error(path, 'Missing required field "eventType". It is required when packaging is ' +
            '"eventtimeline".', msfRef(profile, '5.1.13', '5.2.5'),
            'Use reverse domain name notation, e.g. "com.example.myeventtype".');
      }
      if (track.depends === undefined) {
        report.error(path, 'An event timeline track MUST carry a "depends" array listing the track names ' +
            'to which it applies.', msfRef(profile, '8.2', '8.2'));
      }
      if (track.mimeType !== 'application/json') {
        report.error(path, 'An event timeline track MUST declare "mimeType": "application/json".',
            msfRef(profile, '8.2', '8.2'));
      }
      if (track.eventType === 'org.ietf.moq.cmsf.sap' && profile.family !== 'cmsf') {
        report.info(path + '.eventType', 'This is the CMSF SAP-type timeline event type.',
            ref('cmsf-' + pad(profile.version), '3.6.1'));
      }
    } else if (track.eventType !== undefined) {
      report.error(path + '.eventType', '"eventType" MUST NOT be used when the packaging value is not ' +
          '"eventtimeline".', msfRef(profile, '5.1.13', '5.2.5'));
    }
    if (packaging === 'mediatimeline') {
      if (track.depends === undefined) {
        report.error(path, 'A media timeline track MUST carry a "depends" array listing the track names ' +
            'to which it applies.', msfRef(profile, '7.2', '7.2'));
      }
      if (track.mimeType !== 'application/json') {
        report.error(path, 'A media timeline track MUST declare "mimeType": "application/json".',
            msfRef(profile, '7.2', '7.2'));
      }
    }
    if (Array.isArray(track.template)) {
      if (track.template.length !== 6) {
        report.error(path + '.template', 'A media timeline template MUST contain exactly six values ' +
            '[startMediaTime, deltaMediaTime, startLocation, deltaLocation, startWallclock, deltaWallclock]; ' +
            'found ' + track.template.length + '.', ref('msf-01', '7.4.1'));
      } else {
        [[0, 'number', 'startMediaTime'], [1, 'number', 'deltaMediaTime'], [2, 'array', 'startLocation'],
         [3, 'array', 'deltaLocation'], [4, 'number', 'startWallclock'], [5, 'number', 'deltaWallclock']]
            .forEach(function(spec) {
              if (jsonType(track.template[spec[0]]) !== spec[1]) {
                report.error(path + '.template[' + spec[0] + ']', 'Template value ' + spec[2] + ' must be a ' +
                    spec[1] + '.', ref('msf-01', '7.4.1'));
              }
            });
      }
    }

    // 8. Publish tracks (logs and metrics).
    if (kind === 'publish') {
      if (packaging === 'moqlog' && track.role !== 'log') {
        report.error(path, 'A log track MUST declare "role": "log".', ref('msf-01', '9.4'));
      }
      if (packaging === 'moqmetrics' && track.role !== 'metrics') {
        report.error(path, 'A metrics track MUST declare "role": "metrics".', ref('msf-01', '10.4'));
      }
    }

    // 9. Encryption (MSF draft-01) and CMAF/LOCMAF/M2TS packaging extras.
    if (track.encryptionScheme !== undefined && track.cipherSuite === undefined) {
      report.error(path, '"cipherSuite" MUST be present when "encryptionScheme" is specified.',
          ref('msf-01', '5.2.39'));
    }
    if (typeof track.cipherSuite === 'string' && CIPHER_SUITES.indexOf(track.cipherSuite) === -1 &&
        track.encryptionScheme === 'moq-secure-objects') {
      report.error(path + '.cipherSuite', 'Unknown cipher suite for "moq-secure-objects". Defined values: ' +
          CIPHER_SUITES.join(', ') + '.', ref('msf-01', '5.2.39'));
    }
    if (isPlainObject(track.authInfo)) {
      Object.keys(track.authInfo).forEach(function(scheme) {
        if (AUTH_SCHEMES.indexOf(scheme) === -1 && scheme.indexOf('.') === -1) {
          report.warn(path + '.authInfo.' + scheme, 'Unregistered authorization scheme. Registered schemes: ' +
              AUTH_SCHEMES.join(', ') + '. Custom schemes MUST use a unique naming convention such as ' +
              'reverse domain name notation.', ref('msf-01', '5.2.42'));
        }
      });
    }
    if (Array.isArray(track.accessibility)) {
      track.accessibility.forEach(function(descriptor, index) {
        const descriptorPath = path + '.accessibility[' + index + ']';
        if (!isPlainObject(descriptor)) {
          report.error(descriptorPath, 'Each accessibility descriptor must be a JSON Object.',
              ref('msf-01', '5.2.44'));
          return;
        }
        if (typeof descriptor.scheme !== 'string') {
          report.error(descriptorPath, 'Missing required field "scheme".', ref('msf-01', '5.2.44'));
        } else if (ACCESSIBILITY_SCHEMES.indexOf(descriptor.scheme) === -1) {
          report.info(descriptorPath + '.scheme', 'Unregistered accessibility scheme.',
              ref('msf-01', '5.2.44'));
        }
        if (typeof descriptor.value !== 'string') {
          report.error(descriptorPath, 'Missing required field "value".', ref('msf-01', '5.2.44'));
        }
      });
    }

    if (packaging === 'cmaf' || packaging === 'locmaf') {
      const hasInit = profile.version === 1 ? track.initRef !== undefined : track.initData !== undefined;
      if (!hasInit) {
        report.error(path, 'The CMAF Header for this track MUST be carried in the catalog' +
            (profile.version === 1
              ? ' via an "initDataList" entry referenced by "initRef".'
              : ' in the "initData" field.'),
            ref('cmsf-' + pad(profile.version), '3.1'));
      }
    }
    if (packaging === 'locmaf') {
      if (track.locmafVersion === undefined) {
        report.error(path, 'Missing required field "locmafVersion". A LOCMAF track MUST advertise it.',
            ref('locmaf', '4'), 'The current wire format version is "0.2".');
      } else if (track.locmafVersion !== '0.2') {
        report.warn(path + '.locmafVersion', 'Unknown LOCMAF wire-format version "' + track.locmafVersion +
            '". This document specifies "0.2".', ref('locmaf', '4'));
      }
    } else if (track.locmafVersion !== undefined) {
      report.error(path + '.locmafVersion', '"locmafVersion" is present only when packaging is "locmaf".',
          ref('locmaf', '4'));
    }

    const m2tsFields = Object.keys(track).filter(function(name) { return name.indexOf('m2ts') === 0; });
    if (packaging === 'm2ts') {
      if (track.m2tsPacketSize === undefined) {
        report.error(path, 'Missing required field "m2tsPacketSize" (188 or 192).', ref('msfts', '6.2'));
      } else if (track.m2tsPacketSize !== 188 && track.m2tsPacketSize !== 192) {
        report.error(path + '.m2tsPacketSize', 'The source-packet size MUST be either 188 or 192, found ' +
            track.m2tsPacketSize + '.', ref('msfts', '6.2'));
      }
      if (track.m2tsTimestampMode !== undefined) {
        if (track.m2tsPacketSize === 188) {
          report.error(path + '.m2tsTimestampMode', '"m2tsTimestampMode" MUST NOT be present when ' +
              '"m2tsPacketSize" is 188.', ref('msfts', '6.9'));
        }
        if (['arrival-time', 'opaque'].indexOf(track.m2tsTimestampMode) === -1) {
          report.error(path + '.m2tsTimestampMode', 'Value must be "arrival-time" or "opaque".',
              ref('msfts', '6.9'));
        }
      }
      if (profile.version === 1 && track.initData !== undefined) {
        report.info(path + '.initData', 'MSF-TS keeps the inline "initData" field for PAT/PMT packets even ' +
            'though MSF draft-01 replaced it with "initDataList"/"initRef".', ref('msfts', '6.11'));
      }
      if (track.mimeType !== undefined && track.mimeType !== 'video/mp2t') {
        report.info(path + '.mimeType', 'MSF-TS examples use "video/mp2t" for m2ts tracks.',
            ref('msfts', '7.1'));
      }
    } else if (m2tsFields.length) {
      report.error(path, 'Fields ' + m2tsFields.join(', ') + ' are only defined for tracks with ' +
          '"packaging": "m2ts".', ref('msfts', '6.1'));
    }

    if (packaging !== 'cmaf' && packaging !== 'locmaf' &&
        (track.maxGrpSapStartingType !== undefined || track.maxObjSapStartingType !== undefined)) {
      report.warn(path, 'SAP starting type fields describe CMAF-packaged tracks.',
          ref('cmsf-' + pad(profile.version), '3.5.2'));
    }

    // 10. Base64 payloads.
    if (typeof track.initData === 'string' && !BASE64_RE.test(track.initData)) {
      report.error(path + '.initData', 'Initialization data must be Base64 encoded.',
          msfRef(profile, '5.1.20', '5.2.13'));
    }
    if (typeof track.trackBaseKey === 'string' && !BASE64_RE.test(track.trackBaseKey)) {
      report.error(path + '.trackBaseKey', '"trackBaseKey" must be a Base64-encoded string.',
          ref('msf-01', '5.2.41'));
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Root-level structures
  //////////////////////////////////////////////////////////////////////////////

  function validateInitDataList(report, catalog, profile) {
    if (!Array.isArray(catalog.initDataList)) return {};
    const ids = {};
    catalog.initDataList.forEach(function(entry, index) {
      const path = 'initDataList[' + index + ']';
      if (!isPlainObject(entry)) {
        report.error(path, 'Each initialization reference must be a JSON Object.', ref('msf-01', '5.1.7'));
        return;
      }
      if (typeof entry.id !== 'string') {
        report.error(path, 'Missing required field "id" (String).', ref('msf-01', '5.1.7'));
      } else {
        if (ids[entry.id]) {
          report.error(path + '.id', 'Duplicate init data id "' + entry.id + '"; ids MUST be unique within ' +
              'the catalog.', ref('msf-01', '5.1.7'));
        }
        ids[entry.id] = true;
      }
      if (typeof entry.type !== 'string') {
        report.error(path, 'Missing required field "type" (String).', ref('msf-01', '5.1.7'));
      } else if (entry.type !== 'inline') {
        report.error(path + '.type', 'This version of the specification defines a single allowed type: ' +
            '"inline".', ref('msf-01', '5.1.7'));
      }
      if (typeof entry.data !== 'string') {
        report.error(path, 'Missing required field "data" (String).', ref('msf-01', '5.1.7'));
      } else if (!BASE64_RE.test(entry.data)) {
        report.error(path + '.data', 'Inline init data must be Base64 encoded.', ref('msf-01', '5.1.7'));
      }
    });
    const keys = Object.keys(catalog);
    if (keys.indexOf('initDataList') !== -1 && keys.indexOf('tracks') !== -1 &&
        keys.indexOf('initDataList') < keys.indexOf('tracks')) {
      report.warn('initDataList', 'The Initialization Data List MUST be located after the tracks array in ' +
          'the root of the JSON catalog.', ref('msf-01', '5.1.7'));
    }
    return ids;
  }

  function validateUrlObject(report, value, path, required, reference) {
    if (value === undefined) {
      if (required) report.error(path, 'Missing required object.', reference);
      return;
    }
    if (!isPlainObject(value)) {
      report.error(path, 'Must be a JSON Object with a "url" field.', reference);
      return;
    }
    if (typeof value.url !== 'string') {
      report.error(path, 'Missing required field "url" (String).', reference);
    }
    if (value.type !== undefined && typeof value.type !== 'string') {
      report.error(path + '.type', 'Must be a String.', reference);
    }
  }

  function validateContentProtections(report, catalog, profile) {
    const ids = {};
    if (catalog.contentProtections === undefined) return ids;
    if (profile.family !== 'cmsf' || profile.version !== 1) {
      report.error('contentProtections', '"contentProtections" is defined by CMSF draft-01 only.',
          ref('cmsf-01', '4.1.1'));
    }
    if (!Array.isArray(catalog.contentProtections)) return ids;

    catalog.contentProtections.forEach(function(protection, index) {
      const path = 'contentProtections[' + index + ']';
      if (!isPlainObject(protection)) {
        report.error(path, 'Each content protection entry must be a JSON Object.', ref('cmsf-01', '4.1.1'));
        return;
      }
      if (typeof protection.refID !== 'string') {
        report.error(path, 'Missing required field "refID" (String).', ref('cmsf-01', '4.1.1.1'));
      } else {
        if (ids[protection.refID]) {
          report.error(path + '.refID', 'Duplicate refID "' + protection.refID + '".',
              ref('cmsf-01', '4.1.1.1'));
        }
        ids[protection.refID] = true;
      }

      const kids = protection.defaultKID !== undefined ? protection.defaultKID : protection.defaultKIDs;
      if (protection.defaultKID === undefined && protection.defaultKIDs !== undefined) {
        report.warn(path + '.defaultKIDs', 'The draft names this field "defaultKID" in its examples.',
            ref('cmsf-01', '4.1.1.2'));
      }
      if (kids === undefined) {
        report.error(path, 'Missing required field "defaultKID" (Array of UUID Strings).',
            ref('cmsf-01', '4.1.1.2'));
      } else if (!Array.isArray(kids)) {
        report.error(path + '.defaultKID', 'Must be an Array of UUID Strings.', ref('cmsf-01', '4.1.1.2'));
      } else {
        kids.forEach(function(kid, kidIndex) {
          if (typeof kid !== 'string' || !UUID_RE.test(kid)) {
            report.error(path + '.defaultKID[' + kidIndex + ']', 'Key IDs must be UUID strings in the format ' +
                'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.', ref('cmsf-01', '4.1.1.2'));
          }
        });
      }

      if (protection.scheme === undefined) {
        report.error(path, 'Missing required field "scheme" ("cenc" or "cbcs").', ref('cmsf-01', '4.1.1.3'));
      } else if (CENC_SCHEMES.indexOf(protection.scheme) === -1) {
        report.error(path + '.scheme', 'Allowed Common Encryption schemes are "cenc" and "cbcs".',
            ref('cmsf-01', '4.1.1.3'));
      } else if (protection.scheme === 'cenc') {
        report.info(path + '.scheme', '"cbcs" is the RECOMMENDED scheme for CMSF.', ref('cmsf-01', '4.1.1.3'));
      }

      const drm = protection.drmSystem;
      if (drm === undefined) {
        report.error(path, 'Missing required field "drmSystem" (Object).', ref('cmsf-01', '4.1.1.4'));
        return;
      }
      if (!isPlainObject(drm)) {
        report.error(path + '.drmSystem', 'Must be a JSON Object.', ref('cmsf-01', '4.1.1.4'));
        return;
      }
      const drmPath = path + '.drmSystem';
      if (typeof drm.systemID !== 'string') {
        report.error(drmPath, 'Missing required field "systemID" (UUID String).', ref('cmsf-01', '4.1.1.4.1'));
      } else if (!UUID_RE.test(drm.systemID)) {
        report.error(drmPath + '.systemID', 'The DRM System ID must be a UUID string.',
            ref('cmsf-01', '4.1.1.4.1'));
      } else {
        const system = DRM_SYSTEMS[drm.systemID.toLowerCase()];
        if (system) {
          report.info(drmPath + '.systemID', 'Recognised DRM system: ' + system + '.',
              ref('cmsf-01', '4.1.1.4.1'));
          if (system === 'FairPlay' && drm.certURL === undefined) {
            report.warn(drmPath, '"certURL" is REQUIRED for DRM systems that need a server certificate, ' +
                'such as FairPlay Streaming.', ref('cmsf-01', '4.1.1.4.3'));
          }
          if ((system === 'Widevine' || system === 'PlayReady') && drm.pssh === undefined) {
            report.warn(drmPath, '"pssh" SHOULD be present for DRM systems that require PSSH data.',
                ref('cmsf-01', '4.1.1.4.5'));
          }
          if (system === 'ClearKey' && drm.laURL === undefined) {
            report.warn(drmPath, 'For ClearKey, "laURL" SHOULD contain the URL of a license server ' +
                'implementing the EME ClearKey protocol.', ref('cmsf-01', '4.3'));
          }
        } else {
          report.info(drmPath + '.systemID', 'Unrecognised DRM system id.', ref('cmsf-01', '4.1.1.4.1'));
        }
      }
      validateUrlObject(report, drm.laURL, drmPath + '.laURL', false, ref('cmsf-01', '4.1.1.4.2'));
      validateUrlObject(report, drm.certURL, drmPath + '.certURL', false, ref('cmsf-01', '4.1.1.4.3'));
      validateUrlObject(report, drm.authzURL, drmPath + '.authzURL', false, ref('cmsf-01', '4.1.1.4.4'));
      if (drm.pssh !== undefined) {
        if (typeof drm.pssh !== 'string' || !BASE64_RE.test(drm.pssh)) {
          report.error(drmPath + '.pssh', 'The PSSH box must be a Base64-encoded String.',
              ref('cmsf-01', '4.1.1.4.5'));
        }
      }
      if (drm.robustness !== undefined && typeof drm.robustness !== 'string') {
        report.error(drmPath + '.robustness', 'Must be a String.', ref('cmsf-01', '4.1.1.4.6'));
      }
    });
    return ids;
  }

  function validateDeltaUpdate(report, catalog, profile) {
    const isDelta = profile.version === 0
      ? (catalog.deltaUpdate === true || catalog.addTracks !== undefined ||
         catalog.removeTracks !== undefined || catalog.cloneTracks !== undefined)
      : Array.isArray(catalog.deltaUpdate);
    if (!isDelta) {
      if (profile.version === 0 && catalog.deltaUpdate === false) {
        report.warn('deltaUpdate', '"deltaUpdate" SHOULD NOT be added to a catalog if it is false.',
            ref('msf-00', '5.1.2'));
      }
      return false;
    }

    if (catalog.tracks !== undefined) {
      report.error('tracks', 'A delta update MUST NOT contain an instance of a "tracks" field.',
          msfRef(profile, '5.2', '5.3'));
    }
    if (catalog.version !== undefined) {
      report.error('version', 'A delta update MUST NOT contain an instance of the "version" field.',
          msfRef(profile, '5.2', '5.3'));
    }

    if (profile.version === 0) {
      if (catalog.deltaUpdate !== true) {
        report.error('deltaUpdate', 'A delta update MUST include the "deltaUpdate" field set to true.',
            ref('msf-00', '5.2'));
      }
      const operations = [
        ['addTracks', 'add'], ['removeTracks', 'remove'], ['cloneTracks', 'clone'],
      ].filter(function(operation) { return catalog[operation[0]] !== undefined; });
      if (!operations.length) {
        report.error('', 'A delta update catalog MUST contain at least one instance of "addTracks", ' +
            '"removeTracks" or "cloneTracks".', ref('msf-00', '5.2'));
      }
      operations.forEach(function(operation) {
        const list = catalog[operation[0]];
        if (!Array.isArray(list)) return;
        list.forEach(function(track, index) {
          validateTrack(report, track, operation[0] + '[' + index + ']', profile, null, operation[1]);
        });
      });
      return true;
    }

    if (!catalog.deltaUpdate.length) {
      report.error('deltaUpdate', 'A delta update MUST include at least one operation.',
          ref('msf-01', '5.3'));
    }
    catalog.deltaUpdate.forEach(function(operation, index) {
      const path = 'deltaUpdate[' + index + ']';
      if (!isPlainObject(operation)) {
        report.error(path, 'Each delta operation must be a JSON Object.', ref('msf-01', '5.1.6'));
        return;
      }
      const kind = operation.op;
      if (kind === undefined) {
        report.error(path, 'Each operation object MUST contain an "op" field ("add", "remove" or "clone").',
            ref('msf-01', '5.1.6'));
      } else if (['add', 'remove', 'clone'].indexOf(kind) === -1) {
        report.error(path + '.op', 'Unknown operation "' + kind + '". Defined operations are "add", ' +
            '"remove" and "clone".', ref('msf-01', '5.1.6'));
      }
      if (!Array.isArray(operation.tracks)) {
        report.error(path, 'Each operation object MUST contain a "tracks" field holding an Array of track ' +
            'objects.', ref('msf-01', '5.1.6'));
        return;
      }
      operation.tracks.forEach(function(track, trackIndex) {
        validateTrack(report, track, path + '.tracks[' + trackIndex + ']', profile, null,
            kind === 'add' ? 'track' : kind);
      });
    });
    return true;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Cross-track checks
  //////////////////////////////////////////////////////////////////////////////

  function crossChecks(report, catalog, profile, initIds, protectionIds) {
    if (!Array.isArray(catalog.tracks)) return;
    const seen = {};
    const names = {};
    const renderGroups = {};
    const altGroups = {};

    catalog.tracks.forEach(function(track) {
      if (isPlainObject(track) && typeof track.name === 'string') {
        names[track.name] = true;
      }
    });

    catalog.tracks.forEach(function(track, index) {
      if (!isPlainObject(track)) return;
      const path = 'tracks[' + index + ']';
      const namespace = typeof track.namespace === 'string' ? track.namespace : '<catalog namespace>';
      const key = namespace + '|' + track.name;
      if (typeof track.name === 'string') {
        if (seen[key]) {
          report.error(path + '.name', 'Duplicate track "' + track.name + '" in namespace ' + namespace +
              '. Track names MUST be unique per namespace.', msfRef(profile, '5.1.11', '5.2.3'));
        }
        seen[key] = true;
      }

      if (typeof track.initRef === 'string' && !initIds[track.initRef]) {
        report.error(path + '.initRef', '"initRef" points at "' + track.initRef + '", which is not an id in ' +
            'the initDataList.', ref('msf-01', '5.2.13'));
      }
      if (Array.isArray(track.contentProtectionRefIDs)) {
        track.contentProtectionRefIDs.forEach(function(id, refIndex) {
          if (!protectionIds[id]) {
            report.error(path + '.contentProtectionRefIDs[' + refIndex + ']', 'No contentProtections entry ' +
                'has refID "' + id + '".', ref('cmsf-01', '4.1.2'));
          }
        });
      }
      if (Array.isArray(track.depends)) {
        track.depends.forEach(function(dependency, dependencyIndex) {
          if (typeof dependency !== 'string') {
            report.error(path + '.depends[' + dependencyIndex + ']', 'Dependencies hold track names (Strings).',
                msfRef(profile, '5.1.21', '5.2.14'));
          } else if (!names[dependency]) {
            report.error(path + '.depends[' + dependencyIndex + ']', 'Depends on unknown track "' + dependency +
                '".', msfRef(profile, '5.1.21', '5.2.14'),
                'The namespace of a dependency is assumed to match the declaring track.');
          }
        });
      }

      const latency = JSON.stringify([track.targetLatency, track.buffers]);
      if (typeof track.renderGroup === 'number') {
        if (renderGroups[track.renderGroup] === undefined) {
          renderGroups[track.renderGroup] = latency;
        } else if (renderGroups[track.renderGroup] !== latency) {
          report.warn(path, 'All tracks belonging to render group ' + track.renderGroup + ' MUST have ' +
              'identical target latencies and buffers.', msfRef(profile, '5.1.16', '5.2.8'));
        }
      }
      if (typeof track.altGroup === 'number') {
        if (altGroups[track.altGroup] === undefined) {
          altGroups[track.altGroup] = {latency: latency, packaging: track.packaging, role: track.role};
        } else {
          const first = altGroups[track.altGroup];
          if (first.latency !== latency) {
            report.warn(path, 'All tracks belonging to alternate group ' + track.altGroup + ' MUST have ' +
                'identical target latencies and buffers.', msfRef(profile, '5.1.16', '5.2.8'));
          }
          if (first.packaging !== track.packaging) {
            report.warn(path, 'Alternate group ' + track.altGroup + ' mixes packaging values (' +
                first.packaging + ' and ' + track.packaging + ').',
                msfRef(profile, '5.1.19', '5.2.12'));
          }
          if (first.role !== track.role) {
            report.warn(path, 'Alternate tracks represent the same media content, but group ' +
                track.altGroup + ' mixes roles (' + first.role + ' and ' + track.role + ').',
                msfRef(profile, '5.1.19', '5.2.12'));
          }
        }
      }
    });

    // Alternate renditions: several video tracks with no altGroup is suspicious.
    const m2tsVideo = catalog.tracks.filter(function(track) {
      return isPlainObject(track) && track.packaging === 'm2ts' && isVideoTrack(track);
    });
    if (m2tsVideo.length > 1 && m2tsVideo.every(function(track) { return track.altGroup === undefined; })) {
      report.warn('tracks', 'Several m2ts video tracks are declared but none carries an "altGroup" key. ' +
          'Alternate renditions of the same content belong to a common alternate group so that a subscriber ' +
          'can switch between them.', ref('msfts', '7.5'));
    }
    const cmafVideo = catalog.tracks.filter(function(track) {
      return isPlainObject(track) && (track.packaging === 'cmaf' || track.packaging === 'locmaf') &&
          isVideoTrack(track);
    });
    if (cmafVideo.length > 1 && cmafVideo.every(function(track) { return track.altGroup === undefined; })) {
      report.warn('tracks', 'Several CMAF video tracks are declared but none carries an "altGroup" key. Each ' +
          'CMAF track in a switching set MUST carry an altGroup key with a common value.',
          ref('cmsf-' + pad(profile.version), '3.2'));
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Entry point
  //////////////////////////////////////////////////////////////////////////////

  function validateCatalog(catalog, profile) {
    const report = new Report();

    if (!isPlainObject(catalog)) {
      report.error('', 'A catalog must be a JSON Object, but the payload is ' + jsonType(catalog) + '.',
          msfRef(profile, '5.1', '5'));
      return report;
    }

    // Root fields: types, availability, unknown names.
    Object.keys(catalog).forEach(function(name) {
      const entry = ROOT_FIELDS[name];
      if (!entry) {
        checkUnknown(report, name, name, ROOT_FIELDS, profile);
        return;
      }
      if (!checkAvailability(report, name, name, entry, profile)) return;
      checkType(report, name, name, catalog[name], entry, profile);
      checkVariables(report, name, catalog[name], profile);
    });

    const isDelta = validateDeltaUpdate(report, catalog, profile);

    if (!isDelta) {
      if (catalog.version === undefined) {
        report.error('', 'Missing required root field "version".', msfRef(profile, '5.1.1', '5.1.1'),
            profile.version === 0
              ? 'draft-00 defines it as a Number, e.g. 1.'
              : 'draft-01 defines it as a String; use the "draft-XX" convention, e.g. "draft-01".');
      } else if (profile.version === 1 && typeof catalog.version === 'string' &&
                 !/^(draft-\d+|\d+)$/.test(catalog.version)) {
        report.warn('version', 'For usage against IETF Internet-Draft releases, follow the convention of ' +
            'specifying the version as "draft-XX".', ref('msf-01', '5.1.1'));
      }
      if (catalog.tracks === undefined) {
        report.error('', 'Missing required root field "tracks" (Array of track objects).',
            msfRef(profile, '5.1.8', '5.1.4'));
      } else if (Array.isArray(catalog.tracks) && !catalog.tracks.length) {
        report.warn('tracks', 'The catalog declares no tracks.', msfRef(profile, '5.1.8', '5.1.4'));
      }
    }

    if (catalog.isComplete === false) {
      report.error('isComplete', '"isComplete" MUST NOT be included if it is FALSE.',
          msfRef(profile, '5.1.7', '5.1.3'));
    }
    if (typeof catalog.generatedAt === 'number') {
      if (catalog.generatedAt < 1e12) {
        report.warn('generatedAt', '"generatedAt" is expressed in milliseconds since the Unix epoch; ' +
            catalog.generatedAt + ' looks like seconds.', msfRef(profile, '5.1.6', '5.1.2'));
      } else if (catalog.generatedAt > Date.now() + 86400000) {
        report.warn('generatedAt', '"generatedAt" is more than a day in the future.',
            msfRef(profile, '5.1.6', '5.1.2'));
      }
    }

    const initIds = validateInitDataList(report, catalog, profile);
    const protectionIds = validateContentProtections(report, catalog, profile);

    if (Array.isArray(catalog.tracks)) {
      catalog.tracks.forEach(function(track, index) {
        validateTrack(report, track, 'tracks[' + index + ']', profile, null, 'track');
      });
    }
    if (Array.isArray(catalog.publishTracks)) {
      catalog.publishTracks.forEach(function(track, index) {
        validateTrack(report, track, 'publishTracks[' + index + ']', profile, null, 'publish');
      });
    }

    crossChecks(report, catalog, profile, initIds, protectionIds);

    report.items.sort(function(a, b) {
      const order = {error: 0, warning: 1, info: 2};
      if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
      return a.path.localeCompare(b.path);
    });
    return report;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Examples
  //////////////////////////////////////////////////////////////////////////////

  const EXAMPLES = [
    {
      name: 'MSF draft-01 - LOC audio/video',
      catalog: {
        version: 'draft-01',
        generatedAt: 1746104606044,
        tracks: [
          {
            name: '1080p-video',
            namespace: 'conference.example.com/conference123/alice',
            packaging: 'loc',
            isLive: true,
            targetLatency: 2000,
            role: 'video',
            renderGroup: 1,
            codec: 'av01.0.08M.10.0.110.09',
            width: 1920,
            height: 1080,
            framerate: 30,
            bitrate: 1500000,
          },
          {
            name: 'audio',
            namespace: 'conference.example.com/conference123/alice',
            packaging: 'loc',
            isLive: true,
            targetLatency: 2000,
            role: 'audio',
            renderGroup: 1,
            codec: 'opus',
            samplerate: 48000,
            channelConfig: '2',
            bitrate: 32000,
          },
        ],
      },
    },
    {
      name: 'MSF draft-00 - LOC audio/video',
      catalog: {
        version: 1,
        generatedAt: 1746104606044,
        tracks: [
          {
            name: 'video',
            namespace: 'conference.example.com/conference123/alice',
            packaging: 'loc',
            renderGroup: 1,
            isLive: true,
            targetLatency: 2000,
            role: 'video',
            codec: 'av01.0.08M.10.0.110.09',
            width: 1920,
            height: 1080,
            framerate: 30,
            bitrate: 1500000,
          },
          {
            name: 'audio',
            namespace: 'conference.example.com/conference123/alice',
            packaging: 'loc',
            renderGroup: 1,
            isLive: true,
            targetLatency: 2000,
            role: 'audio',
            codec: 'opus',
            samplerate: 48000,
            channelConfig: '2',
            bitrate: 32000,
          },
        ],
      },
    },
    {
      name: 'CMSF draft-01 - CMAF + DRM (cbcs)',
      catalog: {
        version: '1',
        generatedAt: 1746104606044,
        contentProtections: [
          {
            refID: '1',
            defaultKID: ['01234567-89ab-cdef-0123-456789abcdef'],
            scheme: 'cbcs',
            drmSystem: {
              systemID: 'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
              laURL: {url: 'https://widevine-license.example.com/proxy'},
              pssh: 'AAAAP3Bzc2gAAAAA7e+LqXnWSs6jy',
            },
          },
        ],
        tracks: [
          {
            name: 'video_protected',
            packaging: 'cmaf',
            isLive: true,
            buffers: {target: 1500},
            role: 'video',
            renderGroup: 1,
            altGroup: 1,
            initRef: '1',
            codec: 'avc3.4D401F',
            framerate: 25,
            bitrate: 581905,
            width: 1280,
            height: 720,
            maxGrpSapStartingType: 2,
            contentProtectionRefIDs: ['1'],
          },
          {
            name: 'audio',
            packaging: 'cmaf',
            isLive: true,
            buffers: {target: 1500},
            role: 'audio',
            renderGroup: 1,
            initRef: '2',
            codec: 'mp4a.40.5',
            samplerate: 48000,
            channelConfig: '2',
            bitrate: 67071,
          },
        ],
        initDataList: [
          {id: '1', type: 'inline', data: 'AAAAHGZ0eXBjbWYyAAAAAGNtZjJpc282bXA0MQAA'},
          {id: '2', type: 'inline', data: 'AAAAHGZ0eXBjbWYyAAAAAGNtZjJpc282bXA0MQAA'},
        ],
      },
    },
    {
      name: 'CMSF draft-00 - CMAF simulcast',
      catalog: {
        version: 1,
        generatedAt: 1746104606044,
        tracks: [
          {
            name: 'hd',
            renderGroup: 1,
            packaging: 'cmaf',
            isLive: true,
            initData: 'AAAAIGZ0eXBpc281AAAAAAAAAAAAAAA',
            role: 'video',
            codec: 'avc1.640028',
            width: 1920,
            height: 1080,
            bitrate: 5000000,
            framerate: 30,
            altGroup: 1,
          },
          {
            name: 'sd',
            renderGroup: 1,
            packaging: 'cmaf',
            isLive: true,
            initData: 'AAAAHGZ0eXBpc281AAAAAAAAAAAAAAAA',
            role: 'video',
            codec: 'avc1.64000d',
            width: 192,
            height: 144,
            bitrate: 500000,
            framerate: 30,
            altGroup: 1,
          },
          {
            name: 'audio',
            renderGroup: 1,
            packaging: 'cmaf',
            isLive: true,
            initData: 'AAAAHGZ0eXBpc281AAAAAAAAAAAAAAAA',
            role: 'audio',
            codec: 'mp4a.40.5',
            samplerate: 48000,
            channelConfig: '2',
            bitrate: 67071,
          },
        ],
      },
    },
    {
      name: 'LOCMAF - mixed cmaf/locmaf packaging',
      catalog: {
        version: 'draft-01',
        generatedAt: 1746104606044,
        tracks: [
          {
            name: 'video',
            namespace: 'live.example.com/channel/1',
            packaging: 'cmaf',
            isLive: true,
            role: 'video',
            renderGroup: 1,
            altGroup: 1,
            initRef: 'v1',
            codec: 'avc1.640028',
            width: 1920,
            height: 1080,
            framerate: 25,
            bitrate: 4000000,
          },
          {
            name: 'audio',
            namespace: 'live.example.com/channel/1',
            packaging: 'locmaf',
            locmafVersion: '0.2',
            isLive: true,
            role: 'audio',
            renderGroup: 1,
            initRef: 'a1',
            codec: 'mp4a.40.2',
            samplerate: 48000,
            channelConfig: '2',
            bitrate: 128000,
          },
        ],
        initDataList: [
          {id: 'v1', type: 'inline', data: 'AAAAHGZ0eXBjbWYyAAAAAGNtZjJpc282bXA0MQAA'},
          {id: 'a1', type: 'inline', data: 'AAAAHGZ0eXBjbWYyAAAAAGNtZjJpc282bXA0MQAA'},
        ],
      },
    },
    {
      name: 'MSF-TS - MPEG-2 TS (draft example, no codec)',
      catalog: {
        version: 1,
        generatedAt: 1746104606044,
        tracks: [
          {
            name: 'program-1-ts',
            namespace: 'live.example.com/channel/1',
            packaging: 'm2ts',
            isLive: true,
            targetLatency: 1000,
            role: 'video',
            mimeType: 'video/mp2t',
            bitrate: 6000000,
            m2tsPacketSize: 188,
            m2tsPacketsPerObject: 64,
            m2tsProgramNumber: 1,
            m2tsPmtPid: 256,
            m2tsPcrPid: 257,
            m2tsPsiInterval: 100,
            m2tsRandomAccess: true,
          },
        ],
      },
    },
    {
      name: 'MSF-TS - MPEG-2 TS ABR renditions',
      catalog: {
        version: 1,
        generatedAt: 1746104606044,
        tracks: [
          {
            name: 'video-high',
            namespace: 'live.example.com/channel/1',
            packaging: 'm2ts',
            isLive: true,
            targetLatency: 1000,
            role: 'video',
            mimeType: 'video/mp2t',
            codec: 'avc1.640028,mp4a.40.2',
            width: 1920,
            height: 1080,
            framerate: 25,
            samplerate: 48000,
            channelConfig: '2',
            bitrate: 6000000,
            altGroup: 1,
            m2tsPacketSize: 188,
            m2tsPacketsPerObject: 64,
            m2tsProgramNumber: 1,
            m2tsPmtPid: 256,
            m2tsPcrPid: 257,
            m2tsPsiInterval: 100,
            m2tsRandomAccess: true,
          },
          {
            name: 'video-low',
            namespace: 'live.example.com/channel/1',
            packaging: 'm2ts',
            isLive: true,
            targetLatency: 1000,
            role: 'video',
            mimeType: 'video/mp2t',
            codec: 'avc1.64001e,mp4a.40.2',
            width: 960,
            height: 540,
            framerate: 25,
            samplerate: 48000,
            channelConfig: '2',
            bitrate: 2000000,
            altGroup: 1,
            m2tsPacketSize: 188,
            m2tsPacketsPerObject: 64,
            m2tsProgramNumber: 1,
            m2tsPmtPid: 512,
            m2tsPcrPid: 513,
            m2tsPsiInterval: 100,
            m2tsRandomAccess: true,
          },
        ],
      },
    },
    {
      name: 'Media timeline + event timeline',
      catalog: {
        version: 'draft-01',
        generatedAt: 1746104606044,
        tracks: [
          {
            name: 'video',
            namespace: 'sports.example.com/game42',
            packaging: 'loc',
            isLive: true,
            role: 'video',
            renderGroup: 1,
            codec: 'av01.0.08M.10.0.110.09',
            width: 1920,
            height: 1080,
            framerate: 30,
            bitrate: 1500000,
          },
          {
            name: 'timeline',
            namespace: 'sports.example.com/game42',
            packaging: 'mediatimeline',
            isLive: true,
            role: 'mediatimeline',
            mimeType: 'application/json',
            depends: ['video'],
          },
          {
            name: 'scores',
            namespace: 'sports.example.com/game42',
            packaging: 'eventtimeline',
            isLive: true,
            role: 'eventtimeline',
            eventType: 'com.example.sportsscores',
            mimeType: 'application/json',
            depends: ['video'],
          },
        ],
      },
    },
    {
      name: 'Delta update draft-01 (add + remove)',
      catalog: {
        generatedAt: 1746104606044,
        deltaUpdate: [
          {
            op: 'add',
            tracks: [
              {
                name: 'commentary-de',
                namespace: 'live.example.com/channel/1',
                packaging: 'loc',
                isLive: true,
                role: 'audio',
                label: 'Deutscher Kommentar',
                lang: 'de',
                codec: 'opus',
                samplerate: 48000,
                channelConfig: '2',
                bitrate: 32000,
              },
            ],
          },
          {op: 'remove', tracks: [{name: 'commentary-fr'}]},
        ],
      },
    },
    {
      name: 'Delta update draft-00 (clone)',
      catalog: {
        deltaUpdate: true,
        generatedAt: 1746104606044,
        cloneTracks: [
          {name: 'video-clone', parentName: 'video', bitrate: 800000},
        ],
      },
    },
    {
      name: 'Broken catalog (shows every severity)',
      catalog: {
        version: 1,
        generatedAt: 1746104606,
        isComplete: false,
        tracks: [
          {
            name: 'video',
            packaging: 'cmaf',
            isLive: true,
            role: 'video',
            codec: 'avc1.640028',
            width: 1920,
            heigth: 1080,
            framerate: 30,
            trackDuration: 60000,
            buffers: {target: 2000},
            contentProtectionRefIDs: ['drm-1'],
          },
          {
            name: 'video',
            packaging: 'lock',
            role: 'audio',
            codec: 'opus',
            eventType: 'com.example.oops',
            depends: ['missing-track'],
            locmafVersion: '0.2',
            m2tsPacketSize: 188,
          },
        ],
      },
    },
  ];

  //////////////////////////////////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////////////////////////////////

  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const exampleSelect = document.getElementById('example');
  const profileSelect = document.getElementById('profile');

  EXAMPLES.forEach(function(example, index) {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = example.name;
    exampleSelect.appendChild(option);
  });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** Turns a JSON.parse position into a 1-based line/column pair. */
  function positionOf(text, error) {
    const match = /position (\d+)/.exec(error.message);
    if (!match) return null;
    const offset = Math.min(Number(match[1]), text.length);
    const before = text.slice(0, offset);
    const line = before.split('\n').length;
    const column = offset - before.lastIndexOf('\n');
    return {line: line, column: column, offset: offset};
  }

  function renderParseError(text, error) {
    output.innerHTML = '';
    const box = element('div', 'profile');
    box.appendChild(element('div', 'name', 'Invalid JSON'));
    const position = positionOf(text, error);
    box.appendChild(element('div', 'subtitle', error.message +
        (position ? ' (line ' + position.line + ', column ' + position.column + ')' : '')));
    if (position) {
      const line = text.split('\n')[position.line - 1] || '';
      const snippet = element('pre', 'mono', line + '\n' + new Array(position.column).join(' ') + '^');
      box.appendChild(snippet);
    }
    output.appendChild(box);
  }

  function renderProfile(profile, report) {
    const box = element('div', 'profile');
    box.appendChild(element('div', 'name', profile.label +
        (profile.forced ? ' (forced)' : ' (auto-detected)')));
    if (profile.extensions.length) {
      box.appendChild(element('div', 'subtitle', 'Packaging in use: ' + profile.extensions.join(', ') + '.'));
    }

    const badges = element('div', 'badges');
    const errors = report.count('error');
    const warnings = report.count('warning');
    const infos = report.count('info');
    const status = element('span', 'badge ' + (errors ? 'err' : warnings ? 'warn' : 'info'),
        errors ? 'Invalid' : warnings ? 'Valid with warnings' : 'Valid');
    badges.appendChild(status);
    badges.appendChild(element('span', 'badge err', errors + ' error' + (errors === 1 ? '' : 's')));
    badges.appendChild(element('span', 'badge warn', warnings + ' warning' + (warnings === 1 ? '' : 's')));
    badges.appendChild(element('span', 'badge info', infos + ' note' + (infos === 1 ? '' : 's')));
    profile.packagings.forEach(function(packaging) {
      badges.appendChild(element('span', 'badge pkg', packaging));
    });
    box.appendChild(badges);

    if (profile.evidence.length) {
      const list = element('ul', 'evidence');
      profile.evidence.forEach(function(line) { list.appendChild(element('li', null, line)); });
      box.appendChild(list);
    }
    profile.conflicts.forEach(function(line) {
      box.appendChild(element('div', 'subtitle', 'Note: ' + line));
    });
    return box;
  }

  function renderTracks(catalog) {
    const rows = [];
    const collect = function(list, kind) {
      if (!Array.isArray(list)) return;
      list.forEach(function(track, index) {
        if (isPlainObject(track)) rows.push({track: track, kind: kind, index: index});
      });
    };
    collect(catalog.tracks, 'tracks');
    collect(catalog.publishTracks, 'publishTracks');
    if (!rows.length) return null;

    const table = element('table', 'tracks');
    const head = element('tr');
    ['#', 'name', 'namespace', 'packaging', 'role', 'codec', 'live', 'details'].forEach(function(title) {
      head.appendChild(element('th', null, title));
    });
    table.appendChild(head);

    rows.forEach(function(row) {
      const track = row.track;
      const tr = element('tr');
      const details = [];
      if (track.width && track.height) details.push(track.width + 'x' + track.height);
      if (track.framerate) details.push(track.framerate + ' fps');
      if (track.samplerate) details.push(track.samplerate + ' Hz');
      if (track.channelConfig) details.push('ch ' + track.channelConfig);
      if (track.bitrate) details.push(Math.round(track.bitrate / 1000) + ' kbps');
      if (track.lang) details.push(track.lang);
      if (track.altGroup !== undefined) details.push('altGroup ' + track.altGroup);
      if (track.renderGroup !== undefined) details.push('renderGroup ' + track.renderGroup);
      [row.kind + '[' + row.index + ']', track.name, track.namespace || '(inherited)', track.packaging,
       track.role, track.codec, String(track.isLive), details.join(', ')].forEach(function(value) {
        tr.appendChild(element('td', 'mono', value === undefined ? '-' : value));
      });
      table.appendChild(tr);
    });
    return table;
  }

  function renderFindings(report) {
    const wrapper = element('div');
    wrapper.appendChild(element('h2', null, 'Findings'));

    if (!report.items.length) {
      wrapper.appendChild(element('p', 'empty', 'No findings: every required field is present and every ' +
          'value matches the specification.'));
      return wrapper;
    }

    const filters = element('div', 'filters');
    const list = element('ul', 'findings');
    ['error', 'warning', 'info'].forEach(function(severity) {
      const label = element('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.addEventListener('change', function() {
        Array.prototype.forEach.call(list.querySelectorAll('li.' + severity), function(item) {
          item.style.display = checkbox.checked ? '' : 'none';
        });
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' show ' + severity + 's (' + report.count(severity) + ')'));
      filters.appendChild(label);
    });
    wrapper.appendChild(filters);

    report.items.forEach(function(item) {
      const li = element('li', item.severity);
      li.appendChild(element('div', 'finding-path', item.path || '(root)'));
      li.appendChild(element('div', 'finding-msg', item.message));
      if (item.hint) li.appendChild(element('div', 'finding-hint', item.hint));
      if (item.ref) {
        const refBox = element('div', 'finding-ref');
        const link = document.createElement('a');
        link.href = item.ref.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = item.ref.label;
        refBox.appendChild(link);
        li.appendChild(refBox);
      }
      list.appendChild(li);
    });
    wrapper.appendChild(list);
    return wrapper;
  }

  function run() {
    const text = input.value.trim();
    output.innerHTML = '';
    if (!text) {
      output.appendChild(element('p', 'empty', 'Paste a catalog above, or pick one of the examples.'));
      return;
    }

    let catalog;
    try {
      catalog = JSON.parse(text);
    } catch (error) {
      renderParseError(text, error);
      return;
    }

    const detected = detectProfile(isPlainObject(catalog) ? catalog : {});
    const profile = profileSelect.value === 'auto' ? detected : forcedProfile(profileSelect.value, detected);
    const report = validateCatalog(catalog, profile);

    output.appendChild(renderProfile(profile, report));
    if (isPlainObject(catalog)) {
      const table = renderTracks(catalog);
      if (table) {
        output.appendChild(element('h2', null, 'Tracks'));
        output.appendChild(table);
      }
    }
    output.appendChild(renderFindings(report));
  }

  document.getElementById('validate').addEventListener('click', run);
  document.getElementById('clear').addEventListener('click', function() {
    input.value = '';
    exampleSelect.value = '';
    run();
  });
  document.getElementById('format').addEventListener('click', function() {
    try {
      input.value = JSON.stringify(JSON.parse(input.value), null, 2);
    } catch (error) {
      renderParseError(input.value, error);
      return;
    }
    run();
  });
  exampleSelect.addEventListener('change', function() {
    if (exampleSelect.value === '') return;
    input.value = JSON.stringify(EXAMPLES[Number(exampleSelect.value)].catalog, null, 2);
    profileSelect.value = 'auto';
    run();
  });
  profileSelect.addEventListener('change', run);
  input.addEventListener('input', function() { exampleSelect.value = ''; });

  input.addEventListener('dragover', function(event) {
    event.preventDefault();
    input.classList.add('dragover');
  });
  input.addEventListener('dragleave', function() { input.classList.remove('dragover'); });
  input.addEventListener('drop', function(event) {
    event.preventDefault();
    input.classList.remove('dragover');
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function() {
      input.value = String(reader.result);
      run();
    };
    reader.readAsText(file);
  });

  exampleSelect.value = '0';
  input.value = JSON.stringify(EXAMPLES[0].catalog, null, 2);
  run();
})();
