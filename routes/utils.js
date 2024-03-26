const fs = require('fs');
const path = require('path');

function initSessionState() {
    const SESSION_DEFAULTS = {
        auth_ok: false,
        openai_token: false,
        el_token: null,
        json_file: null,
        audio_file: null,
        voice_clone_dir: 'voice_clones',
        clone: false,
        voice_id: null,
        count: 0,
        dialogue_translated: null
    };

    for (const [key, value] of Object.entries(SESSION_DEFAULTS)) {
        if (!sessionState.hasOwnProperty(key)) {
            sessionState[key] = value;
        }
    }
}

function voiceFolder() {
    const voiceCloneDir = sessionState.voice_clone_dir;

    if (!fs.existsSync(voiceCloneDir)) {
        fs.mkdirSync(voiceCloneDir);
    } else {
        const files = fs.readdirSync(voiceCloneDir);
        files.forEach(file => {
            fs.unlinkSync(path.join(voiceCloneDir, file));
        });
    }
}

// Initialize session state
const sessionState = {};
initSessionState();

// Create voice clones directory
voiceFolder();

// Export functions for use in other modules
module.exports = {
    initSessionState,
    voiceFolder
};
