/**
 * WebArcade Audio Module
 * Shared audio system for all games - Web Audio API based chiptune sounds
 *
 * Usage:
 *   <script src="audio.js"></script>
 *   AudioSystem.init();
 *   AudioSystem.sfx.paddleHit();
 *   AudioSystem.music.start('breakout');
 */

const AudioSystem = {
    ctx: null,
    musicGain: null,
    sfxGain: null,
    musicEnabled: true,
    sfxEnabled: true,
    musicPlaying: false,
    currentOscillators: [],
    unlocked: false,

    /**
     * Initialize the audio context. Safe to call multiple times.
     */
    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.15;
        this.musicGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.3;
        this.sfxGain.connect(this.ctx.destination);
    },

    /**
     * Unlock audio context (required on first user interaction in most browsers)
     */
    unlock() {
        if (this.unlocked) return;
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                this.unlocked = true;
            });
        } else {
            this.unlocked = true;
        }
    },

    /**
     * Ensure context is ready for playback
     */
    ensureContext() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    /**
     * Set music volume (0.0 - 1.0)
     */
    setMusicVolume(vol) {
        if (this.musicGain) {
            this.musicGain.gain.value = Math.max(0, Math.min(1, vol));
        }
    },

    /**
     * Set SFX volume (0.0 - 1.0)
     */
    setSfxVolume(vol) {
        if (this.sfxGain) {
            this.sfxGain.gain.value = Math.max(0, Math.min(1, vol));
        }
    },

    /**
     * Toggle music on/off, returns new state
     */
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.music.stop();
        }
        return this.musicEnabled;
    },

    /**
     * Toggle SFX on/off, returns new state
     */
    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    },

    // ========================================
    // SOUND EFFECTS
    // ========================================
    sfx: {
        /**
         * Generic blip sound - good for menu selection
         */
        select() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        },

        /**
         * Paddle/bat hit sound
         */
        paddleHit() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },

        /**
         * Wall bounce sound (lower thud)
         */
        wallHit() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        },

        /**
         * Brick/block hit sound (higher pitch, row parameter for pitch variation)
         * @param {number} row - Optional row index (0-9) for pitch variation
         */
        brickHit(row = 0) {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const baseFreq = 400 + (9 - row) * 50;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        },

        /**
         * Death/failure sound (sad descending tone)
         */
        death() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        },

        /**
         * Game over sound (ominous descending notes)
         */
        gameOver() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const notes = [392, 349, 330, 294, 262];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
                gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.15 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
                osc.connect(gain);
                gain.connect(AudioSystem.sfxGain);
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.3);
            });
        },

        /**
         * Level complete / victory sound (triumphant arpeggio)
         */
        levelComplete() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
                gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.1 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);
                osc.connect(gain);
                gain.connect(AudioSystem.sfxGain);
                osc.start(ctx.currentTime + i * 0.1);
                osc.stop(ctx.currentTime + i * 0.1 + 0.3);
            });
        },

        /**
         * Power-up collected sound (happy ascending)
         */
        powerUp() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const notes = [523, 659, 784];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.05);
                gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.05 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.05 + 0.15);
                osc.connect(gain);
                gain.connect(AudioSystem.sfxGain);
                osc.start(ctx.currentTime + i * 0.05);
                osc.stop(ctx.currentTime + i * 0.05 + 0.15);
            });
        },

        /**
         * Explosion sound (noisy burst)
         */
        explosion() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc2.type = 'square';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
            osc2.frequency.setValueAtTime(80, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc2.start();
            osc.stop(ctx.currentTime + 0.3);
            osc2.stop(ctx.currentTime + 0.3);
        },

        /**
         * Shooting sound (laser zap)
         */
        shoot() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },

        /**
         * Enemy/alien hit sound
         */
        hit() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        },

        /**
         * Eat/collect food sound (snake games)
         */
        eat() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        },

        /**
         * Move/step sound (very subtle)
         */
        move() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(80, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.03);
        },

        /**
         * Piece rotate sound (tetris)
         */
        rotate() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        },

        /**
         * Hard drop sound (tetris)
         */
        drop() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },

        /**
         * Piece lock sound (tetris thunk)
         */
        lock() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.9, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },

        /**
         * Line clear sound (tetris) - scales with number of lines
         * @param {number} lines - Number of lines cleared (1-4)
         */
        lineClear(lines = 1) {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;

            if (lines === 4) {
                // TETRIS! Special fanfare
                const notes = [523, 659, 784, 1047, 1319];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const osc2 = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'square';
                    osc2.type = 'sawtooth';
                    osc.frequency.value = freq;
                    osc2.frequency.value = freq * 1.01;
                    const noteStart = ctx.currentTime + i * 0.1;
                    gain.gain.setValueAtTime(0, noteStart);
                    gain.gain.linearRampToValueAtTime(0.35, noteStart + 0.02);
                    gain.gain.setValueAtTime(0.28, noteStart + 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.4);
                    osc.connect(gain);
                    osc2.connect(gain);
                    gain.connect(AudioSystem.sfxGain);
                    osc.start(noteStart);
                    osc2.start(noteStart);
                    osc.stop(noteStart + 0.4);
                    osc2.stop(noteStart + 0.4);
                });
            } else {
                const baseNotes = [392, 494, 587, 698];
                const noteCount = lines + 2;
                const volume = 0.15 + (lines - 1) * 0.05;
                const speed = 0.08 - (lines - 1) * 0.01;

                for (let i = 0; i < noteCount; i++) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.value = baseNotes[i % baseNotes.length] * (i >= 4 ? 2 : 1);
                    const noteStart = ctx.currentTime + i * speed;
                    gain.gain.setValueAtTime(0, noteStart);
                    gain.gain.linearRampToValueAtTime(volume, noteStart + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.15 + lines * 0.03);
                    osc.connect(gain);
                    gain.connect(AudioSystem.sfxGain);
                    osc.start(noteStart);
                    osc.stop(noteStart + 0.2 + lines * 0.03);
                }
            }
        },

        /**
         * Level up sound
         */
        levelUp() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                const noteStart = ctx.currentTime + i * 0.08;
                gain.gain.setValueAtTime(0, noteStart);
                gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.25);
                osc.connect(gain);
                gain.connect(AudioSystem.sfxGain);
                osc.start(noteStart);
                osc.stop(noteStart + 0.25);
            });
        },

        /**
         * UFO sound (space invaders style)
         */
        ufo() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
            osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        },

        /**
         * UFO destroyed sound
         */
        ufoDestroyed() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const notes = [800, 1000, 1200, 1000, 800];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                const start = ctx.currentTime + i * 0.05;
                gain.gain.setValueAtTime(0.15, start);
                gain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);
                osc.connect(gain);
                gain.connect(AudioSystem.sfxGain);
                osc.start(start);
                osc.stop(start + 0.1);
            });
        },

        /**
         * Shield hit sound
         */
        shieldHit() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(AudioSystem.sfxGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        },

        /**
         * Go stone placement sound - wooden clack
         */
        stonePlace() {
            if (!AudioSystem.sfxEnabled) return;
            AudioSystem.ensureContext();
            const ctx = AudioSystem.ctx;
            const now = ctx.currentTime;

            // Wood block resonance - the hollow "tock" of wood
            const wood = ctx.createOscillator();
            const woodGain = ctx.createGain();
            wood.type = 'sine';
            wood.frequency.setValueAtTime(650, now);
            wood.frequency.exponentialRampToValueAtTime(550, now + 0.08);
            woodGain.gain.setValueAtTime(0.4, now);
            woodGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            wood.connect(woodGain);
            woodGain.connect(AudioSystem.sfxGain);
            wood.start(now);
            wood.stop(now + 0.08);

            // Click transient - the initial contact
            const click = ctx.createOscillator();
            const clickGain = ctx.createGain();
            click.type = 'square';
            click.frequency.setValueAtTime(1800, now);
            click.frequency.exponentialRampToValueAtTime(900, now + 0.015);
            clickGain.gain.setValueAtTime(0.15, now);
            clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
            click.connect(clickGain);
            clickGain.connect(AudioSystem.sfxGain);
            click.start(now);
            click.stop(now + 0.02);
        }
    },

    // ========================================
    // MUSIC SYSTEM
    // ========================================
    music: {
        currentTrack: null,
        loopTimeout: null,

        /**
         * Start playing a music track
         * @param {string} track - Track name: 'breakout', 'tetris', 'bounce'
         */
        start(track = 'breakout') {
            if (!AudioSystem.musicEnabled || AudioSystem.musicPlaying) return;
            AudioSystem.ensureContext();

            if (AudioSystem.ctx.state === 'suspended') {
                setTimeout(() => this.start(track), 100);
                return;
            }

            AudioSystem.musicPlaying = true;
            this.currentTrack = track;
            this.playLoop();
        },

        /**
         * Stop music playback
         */
        stop() {
            AudioSystem.musicPlaying = false;
            this.currentTrack = null;
            if (this.loopTimeout) {
                clearTimeout(this.loopTimeout);
                this.loopTimeout = null;
            }
            AudioSystem.currentOscillators.forEach(osc => {
                try { osc.stop(); } catch(e) {}
            });
            AudioSystem.currentOscillators = [];
        },

        /**
         * Internal: play the current music loop
         */
        playLoop() {
            if (!AudioSystem.musicPlaying) return;

            const ctx = AudioSystem.ctx;
            const now = ctx.currentTime;
            const bpm = this.currentTrack === 'tetris' ? 128 :
                        this.currentTrack === '4x' ? 72 : 140;
            const beatDuration = 60 / bpm;

            // Get track data
            const trackData = this.getTrackData(this.currentTrack);
            const loopDuration = beatDuration * trackData.beats;

            // Play bass line
            trackData.bass.forEach((freq, i) => {
                if (freq === 0) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = trackData.bassType || 'triangle';
                osc.frequency.value = freq;
                const noteStart = now + i * beatDuration * trackData.bassDiv;
                gain.gain.setValueAtTime(0.2, noteStart);
                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + beatDuration * trackData.bassDiv * 0.9);
                osc.connect(gain);
                gain.connect(AudioSystem.musicGain);
                osc.start(noteStart);
                osc.stop(noteStart + beatDuration * trackData.bassDiv);
                AudioSystem.currentOscillators.push(osc);
            });

            // Play melody
            trackData.melody.forEach((freq, i) => {
                if (freq === 0) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                const noteStart = now + i * beatDuration * trackData.melodyDiv;
                gain.gain.setValueAtTime(0.07, noteStart);
                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + beatDuration * trackData.melodyDiv * 0.9);
                osc.connect(gain);
                gain.connect(AudioSystem.musicGain);
                osc.start(noteStart);
                osc.stop(noteStart + beatDuration * trackData.melodyDiv);
                AudioSystem.currentOscillators.push(osc);
            });

            // Play arpeggio/harmony if present
            if (trackData.arp) {
                trackData.arp.forEach((freq, i) => {
                    if (freq === 0) return;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    const noteStart = now + i * beatDuration * trackData.arpDiv;
                    gain.gain.setValueAtTime(0.04, noteStart);
                    gain.gain.exponentialRampToValueAtTime(0.01, noteStart + beatDuration * trackData.arpDiv * 0.8);
                    osc.connect(gain);
                    gain.connect(AudioSystem.musicGain);
                    osc.start(noteStart);
                    osc.stop(noteStart + beatDuration * trackData.arpDiv);
                    AudioSystem.currentOscillators.push(osc);
                });
            }

            // Schedule next loop
            this.loopTimeout = setTimeout(() => this.playLoop(), loopDuration * 1000);
        },

        /**
         * Get track data for a music track
         */
        getTrackData(track) {
            const tracks = {
                // Breakout style - energetic arcade (64 beats)
                // Structure: C-F-Am-G progression with syncopated energy
                'breakout': {
                    beats: 64,
                    bassDiv: 0.5,
                    melodyDiv: 0.25,
                    arpDiv: 0.25,
                    bassType: 'triangle',
                    bass: [
                        // Section 1: Establish - driving eighth notes
                        131, 131, 131, 131, 131, 131, 196, 131,  // C
                        175, 175, 175, 175, 175, 175, 262, 175,  // F
                        110, 110, 110, 110, 110, 110, 165, 110,  // Am
                        196, 196, 196, 196, 196, 196, 147, 196,  // G
                        // Section 2: Build - add syncopation
                        131, 0, 131, 196, 131, 0, 196, 131,  // C
                        175, 0, 175, 262, 175, 0, 262, 175,  // F
                        110, 0, 110, 165, 110, 0, 165, 110,  // Am
                        196, 0, 196, 294, 196, 0, 294, 196,  // G
                        // Section 3: Peak - octave energy
                        131, 262, 131, 262, 196, 131, 262, 131,  // C
                        175, 349, 175, 349, 262, 175, 349, 175,  // F
                        110, 220, 110, 220, 165, 110, 220, 110,  // Am
                        196, 392, 196, 392, 294, 196, 392, 196,  // G
                        // Section 4: Resolve
                        131, 131, 131, 131, 131, 131, 131, 131,  // C
                        175, 175, 175, 175, 175, 175, 131, 131,  // F to C
                        110, 110, 110, 110, 165, 165, 196, 196,  // Am to G
                        196, 0, 147, 0, 131, 0, 0, 0            // G-D-C
                    ],
                    melody: [
                        // Section 1: Bright ascending theme
                        523, 0, 587, 0, 659, 0, 784, 0, 659, 0, 587, 0, 523, 0, 587, 0,  // C
                        698, 0, 659, 0, 523, 0, 440, 0, 523, 0, 659, 0, 698, 0, 523, 0,  // F
                        659, 0, 523, 0, 440, 0, 392, 0, 440, 0, 523, 0, 659, 0, 523, 0,  // Am
                        587, 0, 494, 0, 392, 0, 494, 0, 587, 0, 659, 0, 587, 0, 523, 0,  // G
                        // Section 2: Add bounce
                        523, 659, 523, 0, 587, 784, 587, 0, 659, 523, 659, 0, 784, 659, 523, 0,  // C
                        698, 523, 698, 0, 659, 440, 659, 0, 523, 698, 523, 0, 440, 523, 698, 0,  // F
                        659, 440, 659, 0, 523, 330, 523, 0, 440, 659, 440, 0, 523, 440, 330, 0,  // Am
                        587, 392, 587, 0, 494, 587, 494, 0, 587, 659, 587, 0, 523, 587, 523, 0,  // G
                        // Section 3: High energy peak
                        784, 0, 880, 0, 784, 0, 659, 0, 784, 0, 880, 0, 988, 0, 880, 0,  // C
                        880, 0, 784, 0, 698, 0, 523, 0, 698, 0, 784, 0, 880, 0, 698, 0,  // F
                        784, 0, 659, 0, 523, 0, 440, 0, 523, 0, 659, 0, 784, 0, 659, 0,  // Am
                        880, 0, 784, 0, 659, 0, 587, 0, 659, 0, 784, 0, 880, 0, 784, 0,  // G
                        // Section 4: Wind down
                        523, 0, 587, 0, 659, 0, 784, 0, 659, 0, 587, 0, 523, 0, 587, 0,  // C return
                        698, 0, 659, 0, 523, 0, 440, 0, 523, 0, 440, 0, 392, 0, 440, 0,  // F descend
                        440, 0, 523, 0, 440, 0, 392, 0, 440, 0, 494, 0, 523, 0, 494, 0,  // Am
                        392, 0, 494, 0, 523, 0, 494, 0, 392, 0, 330, 0, 262, 0, 0, 0     // G resolve
                    ],
                    arp: [
                        // Section 1: Basic triads
                        262, 330, 392, 330, 262, 330, 392, 330, 262, 330, 392, 330, 262, 330, 392, 330,
                        175, 262, 349, 262, 175, 262, 349, 262, 175, 262, 349, 262, 175, 262, 349, 262,
                        220, 262, 330, 262, 220, 262, 330, 262, 220, 262, 330, 262, 220, 262, 330, 262,
                        196, 294, 392, 294, 196, 294, 392, 294, 196, 294, 392, 294, 196, 294, 392, 294,
                        // Section 2: Wider arps
                        262, 392, 523, 392, 262, 392, 523, 392, 262, 392, 523, 392, 262, 392, 523, 392,
                        175, 349, 440, 349, 175, 349, 440, 349, 175, 349, 440, 349, 175, 349, 440, 349,
                        220, 330, 440, 330, 220, 330, 440, 330, 220, 330, 440, 330, 220, 330, 440, 330,
                        196, 392, 494, 392, 196, 392, 494, 392, 196, 392, 494, 392, 196, 392, 494, 392,
                        // Section 3: High energy
                        392, 523, 659, 523, 392, 523, 659, 523, 392, 523, 659, 523, 392, 523, 659, 523,
                        349, 440, 523, 440, 349, 440, 523, 440, 349, 440, 523, 440, 349, 440, 523, 440,
                        330, 440, 523, 440, 330, 440, 523, 440, 330, 440, 523, 440, 330, 440, 523, 440,
                        392, 494, 587, 494, 392, 494, 587, 494, 392, 494, 587, 494, 392, 494, 587, 494,
                        // Section 4: Return
                        262, 330, 392, 330, 262, 330, 392, 330, 262, 330, 392, 330, 262, 330, 392, 330,
                        175, 262, 349, 262, 175, 262, 349, 262, 175, 262, 330, 262, 262, 330, 392, 330,
                        220, 262, 330, 262, 220, 262, 330, 262, 294, 392, 494, 392, 294, 392, 494, 392,
                        196, 294, 392, 294, 262, 330, 392, 330, 262, 0, 0, 0, 0, 0, 0, 0
                    ]
                },

                // Tetris style - driving minor key urgency (64 beats)
                // Structure: Dm-Bb-C-Am progression, Russian-inspired intensity
                'tetris': {
                    beats: 64,
                    bassDiv: 0.5,
                    melodyDiv: 0.25,
                    arpDiv: 0.5,
                    bassType: 'sawtooth',
                    bass: [
                        // Section 1: Establish - marcato rhythm
                        147, 0, 147, 147, 0, 147, 147, 0,  // Dm
                        117, 0, 117, 117, 0, 117, 117, 0,  // Bb
                        131, 0, 131, 131, 0, 131, 131, 0,  // C
                        110, 0, 110, 110, 0, 110, 110, 0,  // Am
                        // Section 2: Build tension
                        147, 220, 147, 147, 220, 147, 147, 220,  // Dm with A
                        117, 175, 117, 117, 175, 117, 117, 175,  // Bb with F
                        131, 196, 131, 131, 196, 131, 131, 196,  // C with G
                        110, 165, 110, 110, 165, 110, 110, 165,  // Am with E
                        // Section 3: Climax - driving force
                        147, 294, 147, 294, 147, 294, 147, 294,  // Dm octaves
                        117, 233, 117, 233, 117, 233, 117, 233,  // Bb octaves
                        131, 262, 131, 262, 131, 262, 131, 262,  // C octaves
                        110, 220, 110, 220, 110, 220, 110, 220,  // Am octaves
                        // Section 4: Resolve with drama
                        147, 0, 147, 147, 0, 147, 147, 147,  // Dm
                        117, 0, 117, 117, 0, 117, 131, 131,  // Bb to C
                        131, 0, 131, 131, 0, 131, 110, 110,  // C to Am
                        110, 0, 147, 0, 131, 0, 0, 0         // Am-Dm-C cadence
                    ],
                    melody: [
                        // Section 1: Folk-inspired theme
                        294, 0, 349, 0, 440, 0, 349, 0, 294, 0, 262, 0, 294, 0, 349, 0,  // Dm
                        349, 0, 294, 0, 233, 0, 294, 0, 349, 0, 440, 0, 349, 0, 294, 0,  // Bb
                        262, 0, 330, 0, 392, 0, 330, 0, 262, 0, 196, 0, 262, 0, 330, 0,  // C
                        330, 0, 262, 0, 220, 0, 262, 0, 330, 0, 392, 0, 330, 0, 262, 0,  // Am
                        // Section 2: Ornamented theme
                        294, 349, 294, 0, 349, 440, 349, 0, 440, 349, 294, 0, 262, 294, 349, 0,  // Dm
                        349, 294, 349, 0, 294, 233, 294, 0, 349, 440, 349, 0, 294, 349, 294, 0,  // Bb
                        262, 330, 262, 0, 330, 392, 330, 0, 392, 330, 262, 0, 330, 392, 330, 0,  // C
                        330, 262, 330, 0, 262, 220, 262, 0, 330, 262, 220, 0, 262, 330, 262, 0,  // Am
                        // Section 3: Climax - high intensity
                        587, 0, 659, 0, 698, 0, 659, 0, 587, 0, 523, 0, 587, 0, 698, 0,  // Dm high
                        698, 0, 587, 0, 466, 0, 587, 0, 698, 0, 784, 0, 698, 0, 587, 0,  // Bb high
                        523, 0, 659, 0, 784, 0, 659, 0, 523, 0, 392, 0, 523, 0, 659, 0,  // C high
                        659, 0, 523, 0, 440, 0, 523, 0, 659, 0, 784, 0, 659, 0, 523, 0,  // Am high
                        // Section 4: Return and resolve
                        294, 0, 349, 0, 440, 0, 349, 0, 294, 0, 262, 0, 294, 0, 349, 0,  // Dm return
                        349, 0, 294, 0, 262, 0, 294, 0, 330, 0, 294, 0, 262, 0, 294, 0,  // Bb
                        262, 0, 330, 0, 262, 0, 220, 0, 262, 0, 294, 0, 262, 0, 220, 0,  // C descend
                        220, 0, 262, 0, 294, 0, 262, 0, 220, 0, 196, 0, 147, 0, 0, 0     // Am resolve
                    ],
                    arp: [
                        // Section 1: Sparse support
                        294, 0, 349, 0, 440, 0, 349, 0, 294, 0, 349, 0, 440, 0, 349, 0,  // Dm
                        233, 0, 294, 0, 349, 0, 294, 0, 233, 0, 294, 0, 349, 0, 294, 0,  // Bb
                        262, 0, 330, 0, 392, 0, 330, 0, 262, 0, 330, 0, 392, 0, 330, 0,  // C
                        220, 0, 262, 0, 330, 0, 262, 0, 220, 0, 262, 0, 330, 0, 262, 0,  // Am
                        // Section 2: Fuller
                        294, 349, 440, 349, 294, 349, 440, 349, 294, 349, 440, 349, 294, 349, 440, 349,
                        233, 294, 349, 294, 233, 294, 349, 294, 233, 294, 349, 294, 233, 294, 349, 294,
                        262, 330, 392, 330, 262, 330, 392, 330, 262, 330, 392, 330, 262, 330, 392, 330,
                        220, 262, 330, 262, 220, 262, 330, 262, 220, 262, 330, 262, 220, 262, 330, 262,
                        // Section 3: Driving
                        440, 0, 587, 0, 698, 0, 587, 0, 440, 0, 587, 0, 698, 0, 587, 0,  // Dm high
                        349, 0, 466, 0, 587, 0, 466, 0, 349, 0, 466, 0, 587, 0, 466, 0,  // Bb high
                        392, 0, 523, 0, 659, 0, 523, 0, 392, 0, 523, 0, 659, 0, 523, 0,  // C high
                        330, 0, 440, 0, 523, 0, 440, 0, 330, 0, 440, 0, 523, 0, 440, 0,  // Am high
                        // Section 4: Return
                        294, 0, 349, 0, 440, 0, 349, 0, 294, 0, 349, 0, 440, 0, 349, 0,  // Dm
                        233, 0, 294, 0, 349, 0, 294, 0, 262, 0, 330, 0, 392, 0, 330, 0,  // Bb-C
                        262, 0, 330, 0, 392, 0, 330, 0, 220, 0, 262, 0, 330, 0, 262, 0,  // C-Am
                        220, 262, 330, 262, 294, 349, 440, 349, 262, 0, 0, 0, 0, 0, 0, 0  // resolve
                    ]
                },

                // Bounce style - upbeat and bouncy (64 beats = ~27 seconds at 140 BPM)
                // Structure: Unified I-vi-IV-V progression (C-Am-F-G) with gradual development
                // Section 1: Establish | Section 2: Build | Section 3: Peak | Section 4: Resolve
                'bounce': {
                    beats: 64,
                    bassDiv: 0.5,
                    melodyDiv: 0.25,
                    arpDiv: 0.5,
                    bassType: 'triangle',
                    bass: [
                        // Section 1: Establish groove - C-Am-F-G (16 beats)
                        131, 0, 131, 131, 0, 131, 131, 0,  // C
                        110, 0, 110, 110, 0, 110, 110, 0,  // Am
                        175, 0, 175, 175, 0, 175, 175, 0,  // F
                        196, 0, 196, 196, 0, 196, 196, 0,  // G
                        // Section 2: Build - add 5ths for movement
                        131, 196, 131, 131, 196, 131, 131, 196,  // C with G
                        110, 165, 110, 110, 165, 110, 110, 165,  // Am with E
                        175, 262, 175, 175, 262, 175, 175, 262,  // F with C
                        196, 294, 196, 196, 294, 196, 196, 294,  // G with D
                        // Section 3: Peak - octave bounces
                        131, 262, 131, 262, 131, 262, 131, 262,  // C bouncy
                        110, 220, 110, 220, 110, 220, 110, 220,  // Am bouncy
                        175, 349, 175, 349, 175, 349, 175, 349,  // F bouncy
                        196, 392, 196, 392, 196, 392, 196, 392,  // G bouncy
                        // Section 4: Wind down - return to simple with cadence
                        131, 0, 131, 131, 0, 131, 131, 131,  // C
                        110, 0, 110, 110, 0, 110, 110, 110,  // Am
                        175, 0, 175, 175, 0, 175, 131, 131,  // F leading to C
                        196, 0, 147, 0, 131, 0, 0, 0         // G-D-C cadence
                    ],
                    melody: [
                        // Section 1: State main motif - bouncy E-G theme
                        330, 0, 392, 0, 330, 0, 294, 0, 330, 0, 392, 0, 523, 0, 392, 0,  // C
                        440, 0, 523, 0, 440, 0, 392, 0, 440, 0, 523, 0, 659, 0, 523, 0,  // Am
                        349, 0, 440, 0, 523, 0, 440, 0, 349, 0, 440, 0, 523, 0, 349, 0,  // F
                        392, 0, 494, 0, 587, 0, 494, 0, 392, 0, 523, 0, 587, 0, 523, 0,  // G
                        // Section 2: Develop motif - add fills
                        330, 392, 330, 0, 392, 523, 392, 0, 330, 392, 523, 0, 392, 330, 294, 0,  // C
                        440, 523, 440, 0, 523, 659, 523, 0, 440, 523, 659, 0, 523, 440, 392, 0,  // Am
                        349, 440, 523, 0, 440, 349, 440, 0, 523, 440, 349, 0, 440, 523, 349, 0,  // F
                        392, 494, 587, 0, 494, 392, 494, 0, 587, 494, 392, 0, 523, 587, 523, 0,  // G
                        // Section 3: Peak - higher register
                        523, 0, 587, 0, 659, 0, 784, 0, 659, 0, 587, 0, 523, 0, 587, 0,  // C rising
                        659, 0, 784, 0, 880, 0, 784, 0, 659, 0, 784, 0, 659, 0, 523, 0,  // Am peak
                        698, 0, 659, 0, 523, 0, 440, 0, 523, 0, 659, 0, 698, 0, 523, 0,  // F wave
                        784, 0, 659, 0, 587, 0, 523, 0, 587, 0, 659, 0, 784, 0, 523, 0,  // G cascade
                        // Section 4: Return to motif and resolve
                        330, 0, 392, 0, 330, 0, 294, 0, 330, 0, 392, 0, 523, 0, 392, 0,  // C return
                        440, 0, 392, 0, 330, 0, 294, 0, 330, 0, 392, 0, 440, 0, 392, 0,  // Am descend
                        349, 0, 440, 0, 349, 0, 330, 0, 349, 0, 330, 0, 294, 0, 330, 0,  // F wind down
                        392, 0, 330, 0, 294, 0, 262, 0, 294, 0, 330, 0, 294, 0, 0, 0     // G resolve
                    ],
                    arp: [
                        // Section 1: Simple triads
                        262, 0, 330, 0, 392, 0, 330, 0, 262, 0, 330, 0, 392, 0, 330, 0,  // C
                        220, 0, 262, 0, 330, 0, 262, 0, 220, 0, 262, 0, 330, 0, 262, 0,  // Am
                        175, 0, 262, 0, 349, 0, 262, 0, 175, 0, 262, 0, 349, 0, 262, 0,  // F
                        196, 0, 294, 0, 392, 0, 294, 0, 196, 0, 294, 0, 392, 0, 294, 0,  // G
                        // Section 2: Busier arpeggios
                        262, 330, 392, 330, 262, 330, 392, 330, 262, 330, 392, 330, 262, 330, 392, 330,  // C
                        220, 262, 330, 262, 220, 262, 330, 262, 220, 262, 330, 262, 220, 262, 330, 262,  // Am
                        175, 262, 349, 262, 175, 262, 349, 262, 175, 262, 349, 262, 175, 262, 349, 262,  // F
                        196, 294, 392, 294, 196, 294, 392, 294, 196, 294, 392, 294, 196, 294, 392, 294,  // G
                        // Section 3: Higher register
                        392, 0, 523, 0, 659, 0, 523, 0, 392, 0, 523, 0, 659, 0, 523, 0,  // C high
                        330, 0, 440, 0, 523, 0, 440, 0, 330, 0, 440, 0, 523, 0, 440, 0,  // Am high
                        349, 0, 440, 0, 523, 0, 440, 0, 349, 0, 440, 0, 523, 0, 440, 0,  // F high
                        392, 0, 494, 0, 587, 0, 494, 0, 392, 0, 494, 0, 587, 0, 494, 0,  // G high
                        // Section 4: Return to simple
                        262, 0, 330, 0, 392, 0, 330, 0, 262, 0, 330, 0, 392, 0, 330, 0,  // C
                        220, 0, 262, 0, 330, 0, 262, 0, 220, 0, 262, 0, 330, 0, 262, 0,  // Am
                        175, 0, 262, 0, 349, 0, 262, 0, 175, 0, 262, 0, 330, 0, 262, 0,  // F
                        196, 294, 392, 294, 262, 330, 392, 330, 262, 0, 0, 0, 0, 0, 0, 0  // G to C
                    ]
                },

                // Space invaders style - tense atmospheric (64 beats)
                // Structure: Am-E-F-G progression, building tension
                'invaders': {
                    beats: 64,
                    bassDiv: 0.5,
                    melodyDiv: 0.25,
                    arpDiv: 0.5,
                    bassType: 'sawtooth',
                    bass: [
                        // Section 1: Ominous pulse
                        110, 0, 110, 0, 110, 0, 110, 110,  // Am
                        82, 0, 82, 0, 82, 0, 82, 82,       // E
                        87, 0, 87, 0, 87, 0, 87, 87,       // F
                        98, 0, 98, 0, 98, 0, 98, 98,       // G
                        // Section 2: Building dread
                        110, 165, 110, 0, 165, 110, 0, 165,  // Am with E
                        82, 123, 82, 0, 123, 82, 0, 123,     // E with B
                        87, 131, 87, 0, 131, 87, 0, 131,     // F with C
                        98, 147, 98, 0, 147, 98, 0, 147,     // G with D
                        // Section 3: Full assault
                        110, 220, 110, 220, 165, 220, 110, 220,  // Am intense
                        82, 165, 82, 165, 123, 165, 82, 165,     // E intense
                        87, 175, 87, 175, 131, 175, 87, 175,     // F intense
                        98, 196, 98, 196, 147, 196, 98, 196,     // G intense
                        // Section 4: Return to dread
                        110, 0, 110, 110, 0, 110, 110, 0,  // Am
                        82, 0, 82, 82, 0, 82, 87, 87,      // E to F
                        87, 0, 87, 87, 0, 87, 98, 98,      // F to G
                        98, 0, 82, 0, 110, 0, 0, 0         // G-E-Am
                    ],
                    melody: [
                        // Section 1: Mysterious theme
                        440, 0, 494, 0, 523, 0, 494, 0, 440, 0, 0, 0, 392, 0, 440, 0,  // Am
                        330, 0, 392, 0, 494, 0, 392, 0, 330, 0, 0, 0, 294, 0, 330, 0,  // E
                        349, 0, 440, 0, 523, 0, 440, 0, 349, 0, 0, 0, 330, 0, 349, 0,  // F
                        392, 0, 494, 0, 587, 0, 494, 0, 392, 0, 0, 0, 349, 0, 392, 0,  // G
                        // Section 2: Tension rises
                        440, 494, 440, 0, 523, 494, 440, 0, 392, 440, 494, 0, 440, 392, 349, 0,  // Am
                        330, 392, 330, 0, 494, 392, 330, 0, 294, 330, 392, 0, 330, 294, 247, 0,  // E
                        349, 440, 349, 0, 523, 440, 349, 0, 330, 349, 440, 0, 349, 330, 294, 0,  // F
                        392, 494, 392, 0, 587, 494, 392, 0, 349, 392, 494, 0, 392, 349, 330, 0,  // G
                        // Section 3: Alarm - high intensity
                        659, 0, 698, 0, 784, 0, 698, 0, 659, 0, 587, 0, 523, 0, 587, 0,  // Am high
                        494, 0, 587, 0, 659, 0, 587, 0, 494, 0, 440, 0, 392, 0, 440, 0,  // E high
                        523, 0, 587, 0, 698, 0, 587, 0, 523, 0, 440, 0, 392, 0, 440, 0,  // F high
                        587, 0, 659, 0, 784, 0, 659, 0, 587, 0, 494, 0, 440, 0, 494, 0,  // G high
                        // Section 4: Resolution
                        440, 0, 494, 0, 523, 0, 494, 0, 440, 0, 392, 0, 440, 0, 494, 0,  // Am return
                        330, 0, 392, 0, 330, 0, 294, 0, 330, 0, 349, 0, 392, 0, 349, 0,  // E
                        349, 0, 330, 0, 294, 0, 262, 0, 294, 0, 330, 0, 349, 0, 330, 0,  // F descend
                        392, 0, 349, 0, 330, 0, 294, 0, 330, 0, 294, 0, 220, 0, 0, 0     // G resolve
                    ],
                    arp: [
                        // Section 1: Sparse tension
                        220, 0, 262, 0, 330, 0, 262, 0, 220, 0, 262, 0, 330, 0, 262, 0,  // Am
                        165, 0, 208, 0, 247, 0, 208, 0, 165, 0, 208, 0, 247, 0, 208, 0,  // E
                        175, 0, 220, 0, 262, 0, 220, 0, 175, 0, 220, 0, 262, 0, 220, 0,  // F
                        196, 0, 247, 0, 294, 0, 247, 0, 196, 0, 247, 0, 294, 0, 247, 0,  // G
                        // Section 2: Building
                        220, 262, 330, 262, 220, 262, 330, 262, 220, 262, 330, 262, 220, 262, 330, 262,
                        165, 208, 247, 208, 165, 208, 247, 208, 165, 208, 247, 208, 165, 208, 247, 208,
                        175, 220, 262, 220, 175, 220, 262, 220, 175, 220, 262, 220, 175, 220, 262, 220,
                        196, 247, 294, 247, 196, 247, 294, 247, 196, 247, 294, 247, 196, 247, 294, 247,
                        // Section 3: Intense
                        330, 0, 440, 0, 523, 0, 440, 0, 330, 0, 440, 0, 523, 0, 440, 0,  // Am high
                        247, 0, 330, 0, 392, 0, 330, 0, 247, 0, 330, 0, 392, 0, 330, 0,  // E high
                        262, 0, 349, 0, 440, 0, 349, 0, 262, 0, 349, 0, 440, 0, 349, 0,  // F high
                        294, 0, 392, 0, 494, 0, 392, 0, 294, 0, 392, 0, 494, 0, 392, 0,  // G high
                        // Section 4: Return
                        220, 0, 262, 0, 330, 0, 262, 0, 220, 0, 262, 0, 330, 0, 262, 0,  // Am
                        165, 0, 208, 0, 247, 0, 208, 0, 175, 0, 220, 0, 262, 0, 220, 0,  // E-F
                        175, 0, 220, 0, 262, 0, 220, 0, 196, 0, 247, 0, 294, 0, 247, 0,  // F-G
                        196, 247, 294, 247, 165, 208, 247, 208, 220, 0, 0, 0, 0, 0, 0, 0  // resolve
                    ]
                },

                // Snake style - groovy hypnotic (64 beats)
                // Structure: Dm-C-Bb-C progression, funky and mesmerizing
                'snake': {
                    beats: 64,
                    bassDiv: 0.5,
                    melodyDiv: 0.25,
                    arpDiv: 0.25,
                    bassType: 'triangle',
                    bass: [
                        // Section 1: Establish groove
                        147, 0, 147, 147, 0, 147, 147, 0,  // Dm
                        131, 0, 131, 131, 0, 131, 131, 0,  // C
                        117, 0, 117, 117, 0, 117, 117, 0,  // Bb
                        131, 0, 131, 131, 0, 131, 131, 0,  // C
                        // Section 2: Add funk
                        147, 0, 220, 147, 0, 220, 147, 0,  // Dm with A
                        131, 0, 196, 131, 0, 196, 131, 0,  // C with G
                        117, 0, 175, 117, 0, 175, 117, 0,  // Bb with F
                        131, 0, 196, 131, 0, 196, 131, 0,  // C with G
                        // Section 3: Deep groove
                        147, 220, 147, 220, 147, 220, 147, 220,  // Dm bouncy
                        131, 196, 131, 196, 131, 196, 131, 196,  // C bouncy
                        117, 175, 117, 175, 117, 175, 117, 175,  // Bb bouncy
                        131, 196, 131, 196, 131, 196, 131, 196,  // C bouncy
                        // Section 4: Wind down
                        147, 0, 147, 147, 0, 147, 147, 147,  // Dm
                        131, 0, 131, 131, 0, 131, 131, 131,  // C
                        117, 0, 117, 117, 0, 131, 147, 147,  // Bb to Dm
                        147, 0, 131, 0, 147, 0, 0, 0         // Dm-C-Dm
                    ],
                    melody: [
                        // Section 1: Slithery theme
                        294, 0, 0, 349, 0, 294, 0, 0, 262, 0, 0, 294, 0, 262, 0, 0,  // Dm
                        262, 0, 0, 330, 0, 262, 0, 0, 196, 0, 0, 262, 0, 196, 0, 0,  // C
                        233, 0, 0, 294, 0, 233, 0, 0, 175, 0, 0, 233, 0, 175, 0, 0,  // Bb
                        262, 0, 0, 294, 0, 330, 0, 0, 349, 0, 0, 330, 0, 294, 0, 0,  // C
                        // Section 2: More active
                        294, 349, 294, 0, 262, 294, 349, 0, 294, 262, 220, 0, 262, 294, 262, 0,  // Dm
                        262, 330, 262, 0, 196, 262, 330, 0, 262, 196, 165, 0, 196, 262, 196, 0,  // C
                        233, 294, 233, 0, 175, 233, 294, 0, 233, 175, 147, 0, 175, 233, 175, 0,  // Bb
                        262, 294, 330, 0, 349, 330, 294, 0, 262, 294, 330, 0, 349, 294, 262, 0,  // C
                        // Section 3: Peak groove
                        440, 0, 494, 0, 523, 0, 494, 0, 440, 0, 392, 0, 349, 0, 392, 0,  // Dm high
                        392, 0, 440, 0, 523, 0, 440, 0, 392, 0, 330, 0, 294, 0, 330, 0,  // C high
                        349, 0, 392, 0, 466, 0, 392, 0, 349, 0, 294, 0, 262, 0, 294, 0,  // Bb high
                        392, 0, 440, 0, 523, 0, 587, 0, 523, 0, 440, 0, 392, 0, 440, 0,  // C high
                        // Section 4: Return
                        294, 0, 0, 349, 0, 294, 0, 0, 262, 0, 0, 294, 0, 262, 0, 0,  // Dm return
                        262, 0, 0, 330, 0, 262, 0, 0, 196, 0, 0, 262, 0, 196, 0, 0,  // C
                        233, 0, 294, 0, 262, 0, 233, 0, 262, 0, 294, 0, 330, 0, 294, 0,  // Bb rise
                        294, 0, 262, 0, 233, 0, 220, 0, 233, 0, 262, 0, 220, 0, 0, 0   // resolve
                    ],
                    arp: [
                        // Section 1: Hypnotic pulse
                        440, 349, 440, 349, 440, 349, 440, 349, 440, 349, 440, 349, 440, 349, 440, 349,
                        392, 330, 392, 330, 392, 330, 392, 330, 392, 330, 392, 330, 392, 330, 392, 330,
                        349, 294, 349, 294, 349, 294, 349, 294, 349, 294, 349, 294, 349, 294, 349, 294,
                        392, 330, 392, 330, 392, 330, 392, 330, 440, 349, 440, 349, 440, 349, 440, 349,
                        // Section 2: Wider intervals
                        440, 294, 440, 294, 440, 294, 440, 294, 440, 294, 440, 294, 440, 294, 440, 294,
                        392, 262, 392, 262, 392, 262, 392, 262, 392, 262, 392, 262, 392, 262, 392, 262,
                        349, 233, 349, 233, 349, 233, 349, 233, 349, 233, 349, 233, 349, 233, 349, 233,
                        392, 262, 392, 262, 440, 294, 440, 294, 494, 349, 494, 349, 440, 294, 440, 294,
                        // Section 3: High energy
                        587, 440, 587, 440, 587, 440, 587, 440, 523, 392, 523, 392, 523, 392, 523, 392,
                        523, 392, 523, 392, 523, 392, 523, 392, 466, 349, 466, 349, 466, 349, 466, 349,
                        466, 349, 466, 349, 466, 349, 466, 349, 440, 330, 440, 330, 440, 330, 440, 330,
                        523, 392, 523, 392, 587, 440, 587, 440, 659, 494, 659, 494, 587, 440, 587, 440,
                        // Section 4: Wind down
                        440, 349, 440, 349, 440, 349, 440, 349, 440, 349, 440, 349, 440, 349, 440, 349,
                        392, 330, 392, 330, 392, 330, 392, 330, 392, 330, 392, 330, 392, 330, 392, 330,
                        349, 294, 349, 294, 349, 294, 349, 294, 392, 330, 440, 349, 440, 349, 440, 349,
                        440, 349, 392, 330, 349, 294, 392, 330, 294, 0, 0, 0, 0, 0, 0, 0
                    ]
                },

                // Galactic 4X style - ambient, dreamy space exploration (64 beats at 72 BPM = ~53 seconds)
                // Structure: Am7 - Fmaj7 - C - Em progression, ethereal and contemplative
                // "Enya at the beach, but in space" - Master of Orion vibes
                '4x': {
                    beats: 64,
                    bassDiv: 1,        // Whole notes - very sparse
                    melodyDiv: 0.5,    // Half notes - slow, sustained
                    arpDiv: 0.5,       // Half notes - gentle shimmer
                    bassType: 'sine',  // Soft, warm bass
                    bass: [
                        // Section 1: Establish space - long tones with silence
                        110, 0, 0, 0, 0, 0, 0, 0,   // Am - single deep note
                        87, 0, 0, 0, 0, 0, 0, 0,    // F
                        131, 0, 0, 0, 0, 0, 0, 0,   // C
                        82, 0, 0, 0, 0, 0, 0, 0,    // Em
                        // Section 2: Gentle movement
                        110, 0, 0, 0, 165, 0, 0, 0,   // Am with E
                        87, 0, 0, 0, 131, 0, 0, 0,    // F with C
                        131, 0, 0, 0, 196, 0, 0, 0,   // C with G
                        82, 0, 0, 0, 123, 0, 0, 0,    // Em with B
                        // Section 3: Deeper presence
                        110, 0, 165, 0, 110, 0, 0, 0,   // Am floating
                        87, 0, 131, 0, 87, 0, 0, 0,    // F floating
                        131, 0, 196, 0, 131, 0, 0, 0,  // C floating
                        82, 0, 123, 0, 82, 0, 0, 0,    // Em floating
                        // Section 4: Return to stillness
                        110, 0, 0, 0, 0, 0, 0, 0,   // Am
                        87, 0, 0, 0, 0, 0, 0, 0,    // F
                        131, 0, 0, 0, 0, 0, 0, 0,   // C
                        110, 0, 0, 0, 0, 0, 0, 0    // Am resolve
                    ],
                    melody: [
                        // Section 1: Distant stars - sparse, questioning
                        330, 0, 0, 0, 392, 0, 0, 0, 440, 0, 0, 0, 0, 0, 0, 0,  // Am: E-G-A rising
                        349, 0, 0, 0, 440, 0, 0, 0, 523, 0, 0, 0, 0, 0, 0, 0,  // F: F-A-C
                        330, 0, 0, 0, 392, 0, 0, 0, 523, 0, 0, 0, 0, 0, 0, 0,  // C: E-G-C
                        330, 0, 0, 0, 494, 0, 0, 0, 392, 0, 0, 0, 0, 0, 0, 0,  // Em: E-B-G
                        // Section 2: Expanding horizons
                        440, 0, 523, 0, 440, 0, 392, 0, 330, 0, 0, 0, 392, 0, 0, 0,  // Am: A-C-A-G-E
                        523, 0, 440, 0, 349, 0, 0, 0, 440, 0, 523, 0, 440, 0, 0, 0,  // F: C-A-F
                        392, 0, 523, 0, 587, 0, 523, 0, 392, 0, 0, 0, 330, 0, 0, 0,  // C: G-C-D-C-G-E
                        494, 0, 392, 0, 330, 0, 0, 0, 392, 0, 494, 0, 392, 0, 0, 0,  // Em: B-G-E
                        // Section 3: Cosmic wonder - higher, more open
                        659, 0, 0, 0, 587, 0, 0, 0, 523, 0, 0, 0, 440, 0, 0, 0,  // Am: E5-D5-C5-A4 descend
                        698, 0, 0, 0, 659, 0, 0, 0, 523, 0, 0, 0, 440, 0, 0, 0,  // F: F5-E5-C5-A4
                        784, 0, 0, 0, 659, 0, 0, 0, 523, 0, 0, 0, 392, 0, 0, 0,  // C: G5-E5-C5-G4
                        659, 0, 0, 0, 494, 0, 0, 0, 392, 0, 0, 0, 330, 0, 0, 0,  // Em: E5-B4-G4-E4
                        // Section 4: Return home - gentle resolution
                        440, 0, 392, 0, 330, 0, 0, 0, 294, 0, 330, 0, 0, 0, 0, 0,  // Am: A-G-E-D-E
                        349, 0, 440, 0, 330, 0, 0, 0, 262, 0, 330, 0, 0, 0, 0, 0,  // F: F-A-E-C-E
                        330, 0, 392, 0, 523, 0, 0, 0, 392, 0, 330, 0, 0, 0, 0, 0,  // C: E-G-C-G-E
                        330, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0          // Am: E fade
                    ],
                    arp: [
                        // Section 1: Distant shimmer - like stars twinkling
                        220, 0, 330, 0, 220, 0, 0, 0, 262, 0, 330, 0, 220, 0, 0, 0,  // Am7
                        175, 0, 262, 0, 175, 0, 0, 0, 220, 0, 262, 0, 175, 0, 0, 0,  // Fmaj7
                        196, 0, 262, 0, 196, 0, 0, 0, 247, 0, 262, 0, 196, 0, 0, 0,  // Cmaj7
                        165, 0, 247, 0, 165, 0, 0, 0, 196, 0, 247, 0, 165, 0, 0, 0,  // Em7
                        // Section 2: Gentle waves
                        220, 330, 220, 0, 262, 330, 262, 0, 220, 330, 220, 0, 262, 0, 0, 0,  // Am7
                        175, 262, 175, 0, 220, 262, 220, 0, 175, 262, 175, 0, 220, 0, 0, 0,  // Fmaj7
                        196, 262, 196, 0, 247, 330, 247, 0, 196, 262, 196, 0, 247, 0, 0, 0,  // Cmaj7
                        165, 247, 165, 0, 196, 294, 196, 0, 165, 247, 165, 0, 196, 0, 0, 0,  // Em7
                        // Section 3: Cosmic shimmer - higher octave
                        440, 0, 523, 0, 440, 0, 0, 0, 523, 0, 659, 0, 523, 0, 0, 0,  // Am high
                        349, 0, 440, 0, 349, 0, 0, 0, 440, 0, 523, 0, 440, 0, 0, 0,  // F high
                        392, 0, 523, 0, 392, 0, 0, 0, 523, 0, 659, 0, 523, 0, 0, 0,  // C high
                        330, 0, 494, 0, 330, 0, 0, 0, 392, 0, 494, 0, 392, 0, 0, 0,  // Em high
                        // Section 4: Fade to stars
                        220, 0, 330, 0, 220, 0, 0, 0, 262, 0, 0, 0, 0, 0, 0, 0,  // Am sparse
                        175, 0, 262, 0, 175, 0, 0, 0, 220, 0, 0, 0, 0, 0, 0, 0,  // F sparse
                        196, 0, 262, 0, 196, 0, 0, 0, 247, 0, 0, 0, 0, 0, 0, 0,  // C sparse
                        220, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0         // Am fade
                    ]
                },

                // Go/Chinese Garden style - pentatonic melody (64 beats at 60 BPM)
                // Structure: Pentatonic scale (A C D E G), starts active then breathes
                'go': {
                    beats: 64,
                    bassDiv: 2,
                    melodyDiv: 0.5,
                    arpDiv: 0.5,
                    bassType: 'sine',
                    bass: [
                        // Section 1: Gentle movement from the start
                        110, 0, 0, 0, 82, 0, 0, 0,    // A, E
                        131, 0, 0, 0, 98, 0, 0, 0,    // C, G
                        110, 0, 82, 0, 110, 0, 0, 0,  // A, E, A
                        131, 0, 98, 0, 131, 0, 0, 0,  // C, G, C
                        // Section 2: Active
                        110, 0, 82, 0, 110, 0, 0, 0,   // A, E, A
                        131, 0, 98, 0, 131, 0, 0, 0,   // C, G, C
                        73, 0, 82, 0, 98, 0, 0, 0,     // D, E, G
                        110, 0, 0, 0, 82, 0, 0, 0,     // A, E
                        // Section 3: Peak energy
                        110, 0, 82, 0, 98, 0, 110, 0,  // A, E, G, A
                        131, 0, 98, 0, 82, 0, 110, 0,  // C, G, E, A
                        73, 0, 82, 0, 98, 0, 110, 0,   // D, E, G, A
                        131, 0, 110, 0, 98, 0, 82, 0,  // C, A, G, E
                        // Section 4: Gentle resolution
                        110, 0, 0, 0, 82, 0, 0, 0,   // A, E
                        131, 0, 0, 0, 0, 0, 0, 0,    // C
                        110, 0, 82, 0, 0, 0, 0, 0,   // A, E
                        110, 0, 0, 0, 0, 0, 0, 0     // A resolve
                    ],
                    melody: [
                        // Section 1: Melodic from the start
                        660, 0, 784, 0, 660, 0, 0, 0, 523, 0, 0, 0, 0, 0, 0, 0,  // E-G-E-C
                        587, 0, 0, 0, 523, 0, 0, 0, 440, 0, 0, 0, 0, 0, 0, 0,    // D-C-A
                        660, 0, 0, 0, 784, 0, 660, 0, 523, 0, 0, 0, 0, 0, 0, 0,  // E, G-E-C
                        523, 0, 587, 0, 523, 0, 0, 0, 440, 0, 0, 0, 0, 0, 0, 0,  // C-D-C-A
                        // Section 2: More movement
                        440, 0, 523, 0, 587, 0, 660, 0, 523, 0, 0, 0, 440, 0, 0, 0,  // A-C-D-E-C-A
                        660, 0, 784, 0, 660, 0, 523, 0, 440, 0, 0, 0, 0, 0, 0, 0,    // E-G-E-C-A
                        587, 0, 660, 0, 784, 0, 660, 0, 587, 0, 523, 0, 0, 0, 0, 0,  // D-E-G-E-D-C
                        440, 0, 523, 0, 440, 0, 0, 0, 392, 0, 440, 0, 0, 0, 0, 0,    // A-C-A, G-A
                        // Section 3: Flowing melody
                        440, 0, 523, 0, 587, 0, 660, 0, 784, 0, 660, 0, 587, 0, 523, 0,  // ascending/descending
                        660, 0, 0, 0, 523, 0, 0, 0, 440, 0, 0, 0, 392, 0, 0, 0,  // E-C-A-G descend
                        440, 0, 523, 0, 587, 0, 660, 0, 784, 0, 880, 0, 784, 0, 660, 0,  // rising phrase
                        660, 0, 587, 0, 523, 0, 440, 0, 392, 0, 440, 0, 0, 0, 0, 0,    // falling to rest
                        // Section 4: Gentle ending
                        660, 0, 0, 0, 523, 0, 0, 0, 440, 0, 0, 0, 0, 0, 0, 0,  // E-C-A
                        587, 0, 523, 0, 440, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // D-C-A
                        523, 0, 0, 0, 440, 0, 0, 0, 392, 0, 440, 0, 0, 0, 0, 0,  // C-A-G-A
                        440, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0     // A final
                    ],
                    arp: [
                        // Section 1: Chimes from the start
                        880, 0, 1047, 0, 880, 0, 0, 0, 784, 0, 0, 0, 0, 0, 0, 0,  // A5-C6-A5, G5
                        1047, 0, 0, 0, 880, 0, 0, 0, 784, 0, 0, 0, 0, 0, 0, 0,    // C6, A5, G5
                        880, 0, 0, 0, 1047, 0, 0, 0, 1175, 0, 0, 0, 0, 0, 0, 0,   // A5, C6, D6
                        1047, 0, 880, 0, 784, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,    // C6-A5-G5
                        // Section 2: More active chimes
                        880, 0, 1047, 0, 880, 0, 784, 0, 660, 0, 0, 0, 0, 0, 0, 0,
                        1047, 0, 880, 0, 784, 0, 660, 0, 784, 0, 0, 0, 0, 0, 0, 0,
                        880, 0, 1047, 0, 1175, 0, 1047, 0, 880, 0, 0, 0, 0, 0, 0, 0,
                        1047, 0, 880, 0, 784, 0, 880, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        // Section 3: Active shimmer
                        880, 1047, 880, 0, 784, 880, 784, 0, 660, 784, 660, 0, 784, 0, 0, 0,
                        880, 0, 1047, 0, 880, 0, 784, 0, 660, 0, 784, 0, 880, 0, 0, 0,
                        784, 0, 880, 0, 1047, 0, 880, 0, 784, 0, 660, 0, 784, 0, 0, 0,
                        880, 0, 784, 0, 660, 0, 784, 0, 880, 0, 0, 0, 0, 0, 0, 0,
                        // Section 4: Gentle fade
                        1047, 0, 0, 0, 880, 0, 0, 0, 784, 0, 0, 0, 0, 0, 0, 0,
                        880, 0, 0, 0, 784, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        880, 0, 784, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        880, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
                    ]
                }
            };

            return tracks[track] || tracks['breakout'];
        }
    }
};

// Auto-initialize when included but don't create context yet (needs user interaction)
console.log('AudioSystem loaded');
