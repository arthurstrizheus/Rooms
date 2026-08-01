/**
 * Clippy's script.
 *
 * All of the assistant's wording lives here, in one place, because it is the
 * part of this feature most likely to be edited by someone who does not want to
 * read React. The tone is the joke; the function underneath it is real, so no
 * line may be funny at the expense of being understood — every one of these
 * still tells the user exactly what is about to happen.
 *
 * The opener is chosen by how hard the user was clicking, because "you clicked
 * six times" and "you clicked forty times" are genuinely different moods and
 * getting the same chirpy line for both is what made the original Clippy
 * infuriating rather than charming.
 */

/**
 * What Clippy says, by how hard the user is clicking.
 *
 * DESCENDING `at` order — `find` takes the first match, so a new tier inserted
 * out of order silently shadows the ones below it.
 *
 * Two axes of variety, because a single fixed line stops being funny the moment
 * you have read it:
 *
 *   - ACROSS tiers: the tally is live, so crossing a threshold mid-tantrum
 *     changes what he is saying underneath the user. The bands are deliberately
 *     tight at the bottom, where most episodes live.
 *   - WITHIN a tier: `lines` rotates. The bubble types one, holds it, then types
 *     the next, so a user who sits and watches gets a small monologue rather
 *     than one sentence staring at them.
 *
 * `|` is a pause marker consumed by `useTypewriter` — a beat, rendered as
 * nothing. `{clicks}` is substituted at the moment a line STARTS typing and then
 * held, so the number does not shuffle around mid-sentence.
 */
const OPENERS = [
    {
        at: 700,
        lines: [
            "{clicks}.| I have stopped counting for my own wellbeing and started counting for the incident report.",
            "There is no badge above this one.| There is only concern.",
            "I want to help.| I am, functionally, a bent piece of wire.",
        ],
    },
    {
        at: 450,
        lines: [
            "{clicks} clicks.| Historians will study this.",
            "Shall I fetch IT|— or a priest?",
            "The button has not changed.| You have. We both have.",
        ],
    },
    {
        at: 275,
        lines: [
            "We are {clicks} clicks in|and the software has not blinked once.",
            "I have blinked.| Several times. Let me get someone.",
            "This is now the most clicking I have ever witnessed,| and I was there for Office 97.",
        ],
    },
    {
        at: 175,
        lines: [
            "{clicks}.| I want you to know that I believe you|, and that I am frightened.",
            "Somewhere, a developer felt a chill and does not know why.",
            "Please|— let me get IT. For me.",
        ],
    },
    {
        at: 110,
        lines: [
            "{clicks} clicks.| At this point I am legally obliged to offer help.",
            "I've seen spreadsheets handled with more gentleness.",
            "The mouse has done nothing wrong.",
        ],
    },
    {
        at: 70,
        lines: [
            "That is {clicks} clicks|and counting. Genuinely, how are you?",
            "It looks like you're trying to click that button into submission.| The button is winning.",
            "I could raise a ticket.| It would take eleven seconds. Fewer than you have spent clicking.",
        ],
    },
    {
        at: 45,
        lines: [
            "{clicks} clicks.| I've watched the whole thing.",
            "Would you like me to get a human involved?",
            "It has not worked yet|, but I admire the commitment.",
        ],
    },
    {
        at: 30,
        lines: [
            "It looks like you're clicking the same spot repeatedly.| {clicks} times, in fact.",
            "Bold strategy.| Shall I fetch IT?",
            "I'm not judging.| I am counting, but I'm not judging.",
        ],
    },
    {
        at: 20,
        lines: [
            "That's {clicks} clicks in about a second and a half.",
            "It looks like you're fighting with this page.| Want me to get help?",
            "Have you tried|— no. No, you've clearly tried.",
        ],
    },
    {
        at: 14,
        lines: [
            "It looks like something isn't responding.| Shall I tell IT?",
            "{clicks} clicks.| The button has not changed its mind.",
        ],
    },
    {
        at: 8,
        lines: [
            "It looks like you're having a disagreement with this page.| Need a hand?",
            "Hello!| I couldn't help but notice the clicking.",
        ],
    },
    {
        at: 0,
        lines: [
            "It looks like you're having a disagreement with this page.| Need a hand?",
        ],
    },
];

/** The tier a click count falls in. Never null — the last entry is `at: 0`. */
const openerTier = (clicks) =>
    OPENERS.find((tier) => clicks >= tier.at) || OPENERS[OPENERS.length - 1];

/**
 * A stable identity for the current tier. The bubble restarts its rotation when
 * this changes, so crossing a threshold interrupts the monologue and starts the
 * new one — which is the point.
 */
export const openerTierKey = (clicks) => String(openerTier(clicks).at);

/** One line from the current tier, with `{clicks}` resolved. */
export const openerLine = (clicks, index) => {
    const { lines } = openerTier(clicks);
    return lines[((index % lines.length) + lines.length) % lines.length].replace(
        "{clicks}",
        clicks
    );
};

export const BUBBLE = {
    name: "Clippy",
    role: "Unsolicited Assistant",
    accept: "Yes, get IT",
    dismiss: "No, I'm fine",
    /** Screen-reader label for the whole panel. */
    ariaLabel: "Clippy has noticed you clicking repeatedly and is offering help",
};

/**
 * The sentinel for "let me type my own". Prefixed and suffixed so it can never
 * collide with a real answer — every other value is the literal text that lands
 * on the ticket, and this one is the only value that never does.
 */
export const DOING_OTHER = "__other__";

/** Cap on the typed answer. The server independently caps at 200; see below. */
export const DOING_OTHER_MAX = 80;

/** What the user says they were doing. Value is what IT reads on the ticket. */
export const DOING_OPTIONS = [
    { value: "Booking a room", label: "Booking a room" },
    { value: "Editing or cancelling a meeting", label: "Editing or cancelling a meeting" },
    { value: "Approving or declining a request", label: "Approving or declining a request" },
    { value: "Just looking at the calendar", label: "Just looking at the calendar" },
    { value: "Signing in", label: "Signing in" },
    { value: "Managing rooms, groups or users", label: "Managing rooms, groups or users" },
    { value: "Honestly, no idea anymore", label: "Honestly, no idea anymore" },
    { value: DOING_OTHER, label: "Something else — let me type it" },
];

/**
 * Severity. The labels are jokes, the VALUES are not — those go on the ticket
 * and IT triages on them, so they read as plain English severities.
 */
export const MOOD_OPTIONS = [
    { value: "Low — reporting only", label: "Fine. Just telling you." },
    { value: "Medium — working around it", label: "Mildly inconvenienced" },
    { value: "High — blocked", label: "Actively blocked, please help" },
    {
        value: "Critical — blocked, meeting imminent",
        label: "My meeting starts soon and I have nowhere to put it",
    },
];

export const FORM = {
    badge: "Clippy Support",
    title: "Let's blame the software, not the developer",
    sub: "Fill this in and it goes straight to IT. No paperclips were harmed.",
    doingLabel: "What were you trying to do?",
    doingOtherLabel: "Go on then, what were you doing?",
    doingOtherPlaceholder: "Something the dropdown hadn't imagined",
    doingOtherRequired: "You picked the type-it-yourself option. The floor is yours.",
    doingOtherCount: (used, max) => `${used}/${max} characters`,
    problemLabel: "And what did it do instead?",
    problemPlaceholder:
        "e.g. I hit Book and nothing happened. Then I hit it again. Then I hit it a lot.",
    problemHint: "Be as unkind to the software as you like. It can't read.",
    problemRequired: "IT needs something to go on — a sentence is plenty.",
    moodLabel: "How are we feeling about it?",
    tallyLabel: "Rage-o-meter",
    diagnosticsLabel: "What I'm telling IT about you",
    submit: "Send it to IT",
    submitting: "Sending…",
    cancel: "Never mind",
    sent: "Sent to IT. Clippy has done something useful for the first time since 1997.",
    failed: "Couldn't reach IT. Ironic, I know — please email them directly.",
};

/** The rage-o-meter's verdict on a click count. Descending; first match wins. */
export const tallyVerdict = (clicks) => {
    if (clicks >= 1000) return "clicks — you have nothing left to prove";
    if (clicks >= 650) return "clicks — the mouse is now a consumable";
    if (clicks >= 400) return "clicks — please check on the desk";
    if (clicks >= 250) return "clicks — this is a personal record for somebody";
    if (clicks >= 160) return "clicks — sit down for a moment";
    if (clicks >= 110) return "clicks — admirable, in a worrying way";
    if (clicks >= 75) return "clicks — the wrist deserves better";
    if (clicks >= 40) return "clicks — seek shade, drink water";
    if (clicks >= 25) return "clicks — genuinely impressive stamina";
    if (clicks >= 15) return "clicks — the mouse has feelings too";
    return "clicks — a reasonable amount of frustration";
};
