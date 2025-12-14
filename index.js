// --- Module constants --- \\
const MODULE_NAME = "predevtimer";
const FILE_NAME = "settings.json";

// --- Default settings --- \\
const DEFAULT_SETTINGS = {
    predevTimerEnabled: true,
    predevMessage: false,
    predevTimer: {
        pb: 9999
    },
    boxPBs: {}
};

// --- Coordinate boxes --- \\
const BOXES = [
    {
        name: "Lights Device",
        corners: [
            { x: 61, y: 132, z: 138 },
            { x: 57, y: 132, z: 142 }
        ],
        enteredThisWorld: false,
        enterTime: null
    },
    {
        name: "Arrow Align",
        corners: [
            { x: 3, y: 120, z: 76 },
            { x: -1, y: 120, z: 78 }
        ],
        enteredThisWorld: false,
        enterTime: null
    }
];

// --- Load / save settings --- \\
let settings = loadSettings();

function loadSettings() {
    try {
        const raw = FileLib.read(MODULE_NAME, FILE_NAME);
        if (!raw) {
            FileLib.write(MODULE_NAME, FILE_NAME, JSON.stringify(DEFAULT_SETTINGS, null, 2));
            return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }
        let parsed = JSON.parse(raw);
        parsed = mergeDefaults(DEFAULT_SETTINGS, parsed);
        return parsed;
    } catch (e) {
        ChatLib.chat("&c[PDT] Error reading settings.json, using defaults.");
        FileLib.write(MODULE_NAME, FILE_NAME, JSON.stringify(DEFAULT_SETTINGS, null, 2));
        return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
}

function saveSettings() {
    try {
        FileLib.write(MODULE_NAME, FILE_NAME, JSON.stringify(settings, null, 2));
    } catch (e) {
        ChatLib.chat("&c[PDT] Failed to save settings.json: " + e);
    }
}

// --- Merge defaults recursively --- \\
function mergeDefaults(defaults, target) {
    for (let key in defaults) {
        if (!(key in target)) {
            target[key] = defaults[key];
        } else if (typeof defaults[key] === "object" && target[key] !== null && !Array.isArray(target[key])) {
            target[key] = mergeDefaults(defaults[key], target[key]);
        }
    }
    return target;
}

// --- Variables --- \\
let enterBoss;
let at3Dev = false;
let counting = false;
let forceMode = false;

// --- Module toggles ---
register("command", () => {
    settings.predevTimerEnabled = !settings.predevTimerEnabled;
    ChatLib.chat(`&d[PDT] &fModule toggled ${settings.predevTimerEnabled ? "&aON" : "&cOFF"}`);
    saveSettings();
}).setName("pdt");

register("command", () => {
    settings.predevMessage = !settings.predevMessage;
    ChatLib.chat(`&d[PDT] &fMessage toggled ${settings.predevMessage ? "&aON" : "&cOFF"}`);
    saveSettings();
}).setName("pdmsg");

register("command", () => {
    ChatLib.chat(`&d[PDT] &fPersonal Best: &a${settings.predevTimer.pb}s`);
}).setName("pdpb");

// --- If you're a normal player not testing just um ignore this one --- \\
register("command", () => {
    forceMode = !forceMode;
    ChatLib.chat(`&d[PDT] &fTest mode ${forceMode ? "&aENABLED" : "&cDISABLED"}`);
}).setName("pdtest");

register("command", () => {
    ChatLib.chat("&d[PDT] &cUnknown command. &dAvailable commands:");
    ChatLib.chat("&d- &f/pdt &d- Toggle the predev timer module.");
    ChatLib.chat("&d- &f/pdmsg &d- Toggle the party chat message.");
    ChatLib.chat("&d- &f/pdpb &d- Show your personal best time.");
}).setName("predevtimer").setAliases(["predev"]);

// --- Start counting pd time --- \\
register("chat", () => {
    if (!settings.predevTimerEnabled) return;
    if (!forceMode && getClass() != "Healer") return;
    enterBoss = Date.now();
    counting = true;
}).setCriteria("[BOSS] Maxor: WELL! WELL! WELL! LOOK WHO'S HERE!");

register("tick", () => {
    if (!settings.predevTimerEnabled || !counting) return;
    if (!forceMode && getClass() != "Healer") return;

    const px = Player.getX(), py = Player.getY(), pz = Player.getZ();

    BOXES.forEach(box => {
        if (!box.enteredThisWorld && isInsideBox(px, py, pz, box.corners[0], box.corners[1])) {
            box.enteredThisWorld = true;
            box.enterTime = Date.now();
            ChatLib.chat(`&d[PDT] &aEntered box: &e${box.name}`);
        }
    });

    if (!at3Dev && getDistance(px, pz, 1, 77) <= 3) {
        at3Dev = true;
    }
});

// --- Overall chat stuff --- \\
register("chat", () => {
    if (!settings.predevTimerEnabled || !counting) return;
    if (!forceMode && getClass() != "Healer") return;

    const totalTime = parseFloat(((Date.now() - enterBoss) / 1000).toFixed(2));
    let totalPB = false;
    if (totalTime < settings.predevTimer.pb) {
        settings.predevTimer.pb = totalTime;
        saveSettings();
        totalPB = true;
    }

    let boxMsgParts = [];
    BOXES.forEach(box => {
        if (box.enterTime) {
            const boxTime = parseFloat(((box.enterTime - enterBoss) / 1000).toFixed(2));
            let isPB = false;
            if (!settings.boxPBs[box.name] || boxTime < settings.boxPBs[box.name]) {
                settings.boxPBs[box.name] = boxTime;
                saveSettings();
                isPB = true;
            }
            boxMsgParts.push(`${box.name}: ${boxTime}s${isPB ? " (PB)" : ""}`);
        }
    });

    if (!settings.predevMessage || forceMode) {
        let partyMsg = `[PDT] Total: ${totalTime}s${totalPB ? " (PB)" : ""}`;
        if (boxMsgParts.length > 0) {
            partyMsg += " | " + boxMsgParts.join(" | ");
        }
        ChatLib.command(`pc ${partyMsg}`);
    }

    ChatLib.chat(`&d[PDT] &aPredev completed in &e${totalTime}s&a${totalPB ? " &d&l(PB)" : ""}`);
    BOXES.forEach(box => {
        if (box.enterTime) {
            const boxTime = parseFloat(((box.enterTime - enterBoss) / 1000).toFixed(2));
            let isPB = settings.boxPBs[box.name] === boxTime;
            ChatLib.chat(`&d[PDT] &a${box.name} time: &e${boxTime}s${isPB ? " &d&l(PB)" : ""}`);
        }
    });

    at3Dev = false;
    counting = false;
    BOXES.forEach(box => box.enterTime = null);
}).setCriteria(/You have teleported to .+/);

// --- Reset vars on world change --- \\
register("worldLoad", () => {
    at3Dev = false;
    counting = false;
    BOXES.forEach(box => {
        box.enteredThisWorld = false;
        box.enterTime = null;
    });
});

// --- Helpers --- \\
function getDistance(x1, z1, x2, z2) {
    return Math.sqrt((x1 - x2) ** 2 + (z1 - z2) ** 2);
}

function getClass() {
    let index = TabList?.getNames()?.findIndex(line => line?.includes(Player.getName()));
    if (index == -1) return;
    let match = TabList?.getNames()[index]?.removeFormatting()?.match(/.+ \((.+) .+\)/);
    if (!match) return "EMPTY";
    return match[1];
}

function isInsideBox(px, py, pz, c1, c2) {
    const minX = Math.min(c1.x, c2.x);
    const maxX = Math.max(c1.x, c2.x);
    const minY = Math.min(c1.y, c2.y);
    const maxY = Math.max(c1.y, c2.y);
    const minZ = Math.min(c1.z, c2.z);
    const maxZ = Math.max(c1.z, c2.z);
    return px >= minX && px <= maxX &&
           py >= minY && py <= maxY &&
           pz >= minZ && pz <= maxZ;
}
