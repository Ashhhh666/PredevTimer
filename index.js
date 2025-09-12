import { data } from "./data"
let predevTimerEnabled = true;
let predevMessage = true;

// --- Command to toggle module --- \\
register("command", () => {
    predevTimerEnabled = !predevTimerEnabled;
    ChatLib.chat("&d[PDT] &fModule toggled " + (predevTimerEnabled ? "&aON" : "&cOFF"));
}).setName("pdt");

// --- Command to toggle party chat message --- \\
register("command", () => {
    predevMessage = !predevMessage;
    ChatLib.chat("&d[PDT] &fMessage toggled " + (predevMessage ? "&aON" : "&cOFF"));
}).setName("pdmsg");

let enterBoss
let at3Dev = false
let counting = false

// --- Start counting pd time --- \\
register("chat", () => {
    if (getClass() != "Healer" || !predevTimerEnabled) return;
    enterBoss = Date.now()
    counting = true
}).setCriteria("[BOSS] Maxor: WELL! WELL! WELL! LOOK WHO'S HERE!")

register("tick", () => {
    if (getClass() != "Healer" || !predevTimerEnabled || !counting) return;
    if (!at3Dev && getDistance(Player.getX(), Player.getZ(), 1, 77) <= 3) {
        at3Dev = true
        return;
    }
})

// --- Overall chat stuff, main component I guess --- \\
register("chat", () => {
    if (getClass() != "Healer" || !predevTimerEnabled || !counting) return;
    if (!at3Dev) {
        ChatLib.chat(`&5[&dPDT&5] &cPredev not completed.`)
    } else {
        const time = parseFloat(((Date.now() - enterBoss) / 1000).toFixed(2))
        let msg = `&5[&dPDT&5] &aPredev completed in &e${time}s&a.`
        // --- Party chat message toggle --- \\
        if (!predevMessage) {
            setTimeout(() => {
                ChatLib.command(`pc [PDT] predev took ${time}.`)
            }, 2000)}
        if (time < data.predevTimer.pb) {
            data.predevTimer.pb = time
            data.save()
            msg += " &d&l(PB)"}
        new Message(
            new TextComponent(msg).setHover(
                "show_text",
                `&dPersonal Best: &a${data.predevTimer.pb}s`
            )
        ).chat()
        at3Dev = false
    }
    counting = false
}).setCriteria(/You have teleported to .+/)

// --- Reset var on world change --- \\
register("worldLoad", () => {
    at3Dev = false
    counting = false
})

// --- Get Distance --- \\
function getDistance(x1, z1, x2, z2) {
    return Math.sqrt((x1 - x2) ** 2 + (z1 - z2) ** 2)
}

// --- Class check --- \\
function getClass() {
    let index = TabList?.getNames()?.findIndex(line => line?.includes(Player.getName()))
    if (index == -1) return
    let match = TabList?.getNames()[index]?.removeFormatting()?.match(/.+ \((.+) .+\)/)
    if (!match) return "EMPTY"
    return match[1];
}