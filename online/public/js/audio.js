/* User-supplied background track, with local procedural ambience and effects. */
(function (root) {
  'use strict';
  const DEFAULTS = { sound: true, volume: 55, musicVolume: 36, ambienceVolume: 58, effectsVolume: 75 };
  const PROFILES = {
    menu: { music: .9, label: 'LOST TRANSMISSION / MENU' },
    intro: { music: .55, label: 'NOVARIS / TRANSMISSION' },
    hub: { music: .65, label: 'SAFEHOUSE / NIGHT SHIFT' },
    dialogue: { music: .35, label: 'ARIA / PRIVATE CHANNEL' },
    briefing: { music: .45, label: 'MISSION / STANDBY' },
    puzzle: { music: .24, label: 'TERMINAL / FOCUS' },
    map: { music: .52, label: 'NOVARIS / NETWORK MAP' },
    archive: { music: .36, label: 'ARCHIVE / RECOVERED SIGNALS' },
    result: { music: .8, label: 'SIGNAL / RESTORED' },
    failed: { music: .18, label: 'CONNECTION / LOST' },
    coopSetup: { music: .6, label: 'TEAM CHANNEL / STANDBY' },
    transmission: { music: .2, label: 'UPLINK / TRANSMITTING' },
    handoff: { music: .35, label: 'TEAM / RECEIVER HANDOFF' },
    coopResult: { music: .75, label: 'TEAM / SIGNAL RECEIVED' },
    ending: { music: 1, label: 'NOVARIS / A VOICE AGAIN' }
  };
  function normalize(input = {}) {
    const result = { sound: typeof input.sound === 'boolean' ? input.sound : DEFAULTS.sound };
    for (const key of ['volume', 'musicVolume', 'ambienceVolume', 'effectsVolume']) result[key] = Number.isFinite(input[key]) ? Math.max(0, Math.min(100, Math.round(input[key]))) : DEFAULTS[key];
    return result;
  }
  // Delays, pitches, and envelopes are in seconds/Hz; every cue has its own identity.
  const CUES = {
    click: [[950, .035, 0, .045], [1360, .025, .018, .025]],
    confirm: [[440, .08, 0, .07], [587.33, .1, .065, .07], [698.46, .13, .14, .065]],
    terminal: [[220, .09, 0, .075], [440, .06, .08, .055], [660, .07, .14, .05], [880, .13, .21, .06]],
    map: [[293.66, .12, 0, .07], [440, .12, .08, .06], [587.33, .22, .17, .065]],
    radio: [[880, .045, .025, .04], [1046.5, .065, .1, .035]],
    archive: [[740, .07, .02, .045], [587.33, .085, .085, .035]],
    hint: [[587.33, .13, 0, .07], [698.46, .15, .09, .06], [880, .25, .18, .07]],
    success: [[587.33, .13, 0, .085], [880, .28, .1, .085]],
    complete: [[293.66, .22, 0, .09], [349.23, .22, .1, .075], [440, .25, .2, .075], [587.33, .4, .34, .085], [880, .6, .5, .06]],
    error: [[220, .14, 0, .065], [164.81, .19, .12, .065]],
    failure: [[220, .24, 0, .065], [174.61, .27, .2, .06], [146.83, .5, .43, .065]],
    transmission: [[1174.66, .045, .04, .035], [1567.98, .05, .16, .03], [1760, .045, .28, .03], [1174.66, .07, .42, .035]],
    ending: [[146.83, 1.8, 0, .06], [174.61, 1.7, .08, .05], [220, 1.7, .16, .05], [293.66, 1.6, .3, .065], [440, 1.8, .55, .06], [587.33, 2.1, .9, .055]]
  };
  function createEngine(options = {}) {
    const createContext = options.createContext || (() => { const Constructor = root.AudioContext || root.webkitAudioContext; return Constructor ? new Constructor() : null; });
    const later = options.setTimeout || setTimeout, stopLater = options.clearTimeout || clearTimeout;
    let config = { ...DEFAULTS }, context = null, master, effects;
    let noiseBuffer;
    let trackElement = null, trackSource = null, trackGain = null, trackFailed = false, trackStarting = false;
    const createTrack = options.createTrack || (() => root.Audio ? new root.Audio('assets/novaris-theme.mp3') : null);
    let unlocked = false, visible = true, resuming = false, scene = 'menu', sleepTimer = null, generation = 0;
    let statusListener = () => {};
    let lastStep = -Infinity, stepDistance = 0, lastPosition = null, foot = 0, lastPreview = -Infinity;
    const voices = new Set(), cueTimes = new Map();
    function ramp(param, value, seconds = .2) {
      const now = context.currentTime;
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
      else { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); }
      param.linearRampToValueAtTime(value, now + seconds);
    }
    function state() { return { enabled: config.sound, unlocked, context: context?.state || 'locked', visible, scene, label: (PROFILES[scene] || PROFILES.menu).label }; }
    function announce() { statusListener(state()); }
    function makeNoise(seconds, channels, decay = false) {
      const buffer = context.createBuffer(channels, Math.ceil(context.sampleRate * seconds), context.sampleRate);
      let seed = decay ? 9149 : 2149;
      for (let ch = 0; ch < channels; ch++) {
        const data = buffer.getChannelData(ch); let brown = 0;
        for (let i = 0; i < data.length; i++) {
          seed = (seed * 16807) % 2147483647; const white = (seed / 2147483647 * 2 - 1);
          brown = (brown + .024 * white) / 1.024;
          data[i] = decay ? white * Math.pow(1 - i / data.length, 3) * .65 : white * .42 + brown * 1.8;
        }
      }
      return buffer;
    }
    function build() {
      master = context.createGain(); effects = context.createGain();
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -10; limiter.knee.value = 12; limiter.ratio.value = 6; limiter.attack.value = .004; limiter.release.value = .2;
      // Calibrated headroom: audible at the default mixer levels, with a soft peak limiter.
      const outputGain = context.createGain(); outputGain.gain.value = 4;
      master.gain.value = 0; master.connect(outputGain); outputGain.connect(limiter); limiter.connect(context.destination);
      effects.connect(master);
      noiseBuffer = makeNoise(1, 1);
      context.onstatechange = announce;
      if (context.createMediaElementSource) {
        try {
          trackElement=createTrack();
          if(trackElement) {
            trackElement.loop=true;trackElement.preload='metadata';trackElement.volume=1;
            trackElement.hidden=true;trackElement.setAttribute?.('aria-hidden','true');
            trackElement.setAttribute?.('data-soundtrack','novaris');root.document?.body?.appendChild(trackElement);
            trackGain=context.createGain();trackGain.gain.value=0;
            trackSource=context.createMediaElementSource(trackElement);trackSource.connect(trackGain);trackGain.connect(master);
            trackElement.onerror=()=>{trackFailed=true;trackElement.pause();announce();};
          }
        } catch (_) { trackFailed=true; }
      }
      mix(true);
    }
    function mix(immediate = false) {
      if (!context) return;
      const profile = PROFILES[scene] || PROFILES.menu, fade = immediate ? .02 : 1.1;
      ramp(effects.gain, config.effectsVolume / 100, .08);
      if(trackGain) ramp(trackGain.gain,trackFailed?0:config.musicVolume/100*profile.music*.22,fade);
      ramp(master.gain, config.sound && visible ? config.volume / 100 : 0, .15);
    }
    function track(source, gain, nodes, group) {
      const voice = { source, gain, nodes, group };
      if (voices.size >= 48) { const oldest = voices.values().next().value; try { oldest.source.stop(); } catch (_) {} voices.delete(oldest); }
      voices.add(voice);
      source.onended = () => { voices.delete(voice); nodes.forEach(node => { try { node.disconnect(); } catch (_) {} }); };
    }
    function tone(frequency, duration, when, level, group = 'effect', waveform = 'triangle', pan = 0, endFrequency = frequency) {
      if (!context || !Number.isFinite(frequency) || frequency <= 0) return;
      const oscillator = context.createOscillator(), gain = context.createGain();
      const at = Math.max(context.currentTime + .002, when), attack = group === 'music' ? Math.min(.6, duration * .2) : .008;
      oscillator.type = waveform; oscillator.frequency.setValueAtTime(frequency, at);
      if (frequency !== endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
      if (group === 'music') oscillator.detune.value = pan * 5;
      gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(Math.max(.0002, level), at + attack);
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      oscillator.connect(gain); const nodes = [oscillator, gain];
      if (context.createStereoPanner) { const panner = context.createStereoPanner(); panner.pan.value = pan; gain.connect(panner); panner.connect(effects); nodes.push(panner); }
      else gain.connect(effects);
      track(oscillator, gain, nodes, group); oscillator.start(at); oscillator.stop(at + duration + .025);
    }
    function noise(duration, when, level, frequency, type = 'bandpass', pan = 0, endFrequency = frequency) {
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      const at = Math.max(context.currentTime + .002, when);
      source.buffer = noiseBuffer; filter.type = type; filter.Q.value = .65;
      filter.frequency.setValueAtTime(frequency, at); filter.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
      gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(level, at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      source.connect(filter); filter.connect(gain); const nodes = [source, filter, gain];
      if (context.createStereoPanner) { const panner = context.createStereoPanner(); panner.pan.setValueAtTime(pan, at); gain.connect(panner); panner.connect(effects); nodes.push(panner); } else gain.connect(effects);
      track(source, gain, nodes, 'effect'); source.start(at, .35); source.stop(at + duration + .025);
    }
    function startTrack() {
      if(trackElement&&!trackFailed) {
        if(!trackElement.paused||trackStarting) return;
        trackStarting=true;
        Promise.resolve(trackElement.play()).then(()=>{
          trackStarting=false;if(!config.sound||!visible||!unlocked)trackElement?.pause();
        }).catch(()=>{trackStarting=false;});
        return;
      }

    }
    function stopTrack() { trackElement?.pause(); }
    function hush() {
      stopTrack(); lastPosition = null; stepDistance = 0;
      trackElement?.pause();
      if (!context) return;
      // Cancel cue tails and scheduled pads so returning to the tab cannot stack old music.
      voices.forEach(voice => { ramp(voice.gain.gain, 0, .06); try { voice.source.stop(context.currentTime + .075); } catch (_) {} });
      voices.clear();
      ramp(master.gain, 0, .08); const token = ++generation;
      if (sleepTimer !== null) stopLater(sleepTimer);
      sleepTimer = later(() => {
        sleepTimer = null;
        if (token !== generation || config.sound && visible) return;
        try { context.suspend()?.catch?.(() => {}); } catch (_) {}
        announce();
      }, 120);
    }
    function activate() {
      if (!context || !unlocked || !config.sound || !visible) return;
      generation++; if (sleepTimer !== null) { stopLater(sleepTimer); sleepTimer = null; }
      if (context.state === 'running') { mix(); startTrack(); announce(); return; }
      if (resuming) return;
      resuming = true;
      try {
        Promise.resolve(context.resume()).then(() => { resuming = false; if (config.sound && visible) { mix(); startTrack(); } else hush(); announce(); }).catch(() => { resuming = false; announce(); });
      } catch (_) { resuming = false; announce(); }
    }
    function configure(values) {
      const wasEnabled = config.sound;
      config = normalize({ ...config, ...values });
      if (context) { mix(); if (!config.sound) hush(); else if (!wasEnabled) activate(); }
      announce(); return { ...config };
    }
    function unlock() {
      if (!config.sound || !visible) return false;
      if (!context) {
        try { context = createContext(); if (!context) { announce(); return false; } build(); }
        catch (_) { context = null; announce(); return false; }
      }
      if (context.state === 'closed') return false;
      if (!unlocked) { unlocked = true; if(trackElement&&!trackFailed)startTrack(); activate(); }
      else if (context.state !== 'running' || trackElement?.paused) activate();
      return true;
    }
    function setScene(value) {
      if (scene === value) return;
      scene = PROFILES[value] ? value : 'menu'; lastPosition = null; stepDistance = 0;
      if (context) mix(); announce();
    }
    function play(kind = 'click') {
      if (!config.sound || !visible || !context || !unlocked || context.state === 'closed') return false;
      const now = context.currentTime, cooldown = kind === 'click' ? .04 : kind === 'step' ? .2 : .09;
      if (now - (cueTimes.get(kind) ?? -Infinity) < cooldown) return false;
      cueTimes.set(kind, now);
      if (kind === 'step') {
        const pan = foot++ % 2 ? -.18 : .18;
        noise(.085, now, .15, 800, 'lowpass', pan); tone(92, .085, now, .105, 'effect', 'sine', pan, 48); return true;
      }
      const cue = CUES[kind] || CUES.click;
      cue.forEach(([frequency, duration, delay, level], i) => tone(frequency, duration, now + delay, level, 'effect', kind === 'ending' ? 'sine' : 'triangle', (i % 3 - 1) * .14));
      if (kind === 'radio' || kind === 'archive') noise(.12, now, .065, 1400, 'bandpass', -.12);
      if (kind === 'transmission') noise(.55, now, .055, 650, 'bandpass', .12, 2600);
      if (kind === 'error' || kind === 'failure') noise(.12, now, .055, 760, 'lowpass');
      return true;
    }
    function movement(pose) {
      if (scene !== 'hub' || !config.sound || !unlocked || !visible || !context) { lastPosition = null; stepDistance = 0; return; }
      if (lastPosition && pose.moving) stepDistance += Math.hypot(pose.x - lastPosition.x, pose.y - lastPosition.y);
      lastPosition = { x: pose.x, y: pose.y };
      if (!pose.moving) { stepDistance = 0; return; }
      if (stepDistance >= 31 && context.currentTime - lastStep >= .23) { play('step'); lastStep = context.currentTime; stepDistance %= 31; }
    }
    function setVisible(value) { visible = !!value; if (visible) activate(); else hush(); announce(); }
    function preview() {
      if (!context || !config.sound || !visible || !unlocked || context.state === 'closed' || context.currentTime - lastPreview < 1.6) return false;
      lastPreview = context.currentTime; play('terminal');
      const at = context.currentTime;
      noise(.11, at + .5, .15, 800, 'lowpass', -.18);
      CUES.success.forEach(([f, d, delay, level]) => tone(f, d, at + .85 + delay, level)); return true;
    }
    function setStatusListener(callback) { statusListener = typeof callback === 'function' ? callback : () => {}; announce(); }
    function destroy() {
      stopTrack(); if (sleepTimer !== null) stopLater(sleepTimer);
      generation++; unlocked = false;
      if(trackElement){trackElement.pause();trackElement.onerror=null;trackElement.removeAttribute?.('src');trackElement.load?.();trackElement.remove?.();}
      trackSource?.disconnect();trackElement=null;trackSource=null;trackGain=null;
      voices.forEach(v => { try { v.source.stop(); } catch (_) {} }); voices.clear();
      if (context) { context.onstatechange = null; try { context.close()?.catch?.(() => {}); } catch (_) {} }
      context = null; announce();
    }
    return { configure, unlock, setScene, play, movement, setVisible, preview, setStatusListener, state, destroy };
  }
  const api = { createEngine, normalize, DEFAULTS, PROFILES, CUES };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') { root.CipherAudio = createEngine(); root.CipherAudioDesign = api; }
})(typeof window !== 'undefined' ? window : globalThis);
