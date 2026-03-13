import { IMAGE_URLS } from "./assets.js";

export const MAX_STRIKES = 3;

export const STORAGE_KEYS = {
  highScore: "archive-survival-high-score",
  runState: "archive-survival-run-state",
};

export const FEAR_ORDER = ["web"];

export const DIFFICULTY_SETTINGS = {
  easy: {
    label: "Easy",
    webStabilityBonus: 2,
  },
  normal: {
    label: "Normal",
    webStabilityBonus: 0,
  },
  hard: {
    label: "Hard",
    webStabilityBonus: -1,
  },
};

export const ITEM_DEFINITIONS = [
  {
    id: "statement-supplement",
    name: "Statement Supplement",
    rarity: "common",
    weight: 34,
    effect: "clueBoost",
    scope: "next-case",
    description: "Your next case starts with one extra clue.",
  },
  {
    id: "basira-torch",
    name: "Basira's Torch",
    rarity: "uncommon",
    weight: 20,
    effect: "webStabilityBoost",
    scope: "fear",
    fear: "web",
    description: "Your next Web case starts with +2 Stability.",
  },
  {
    id: "black-umbrella",
    name: "Black Umbrella",
    rarity: "rare",
    weight: 8,
    effect: "preventNextStrike",
    scope: "run",
    description: "The next strike is cancelled.",
  },
  {
    id: "martin-tea",
    name: "Martin's Tea",
    rarity: "rare",
    weight: 6,
    effect: "extraStrikeBuffer",
    scope: "run",
    description: "Recover 1 strike as soon as you take it.",
  },
];

const WEB_CASE_INSTRUCTIONS =
  "Click fragments to build the read. Click the newest fragment again to pull it back. Press Enter to submit. A short read costs 1 Stability. A full wrong read costs 2. At 0, the case is lost. Keyboard controls still work, but mouse is the main path.";

export const CASE_DEFINITIONS = {
  web: [
    {
      id: "borrowed-key",
      title: "The Web: Borrowed Key",
      category: "cause \u2192 effect",
      excerpt:
        'A neighbour asks to borrow a spare key "just in case." Weeks later, they stop asking before they let themselves in.',
      objective: "Find the true four-part chain before the case buckles.",
      instructions: WEB_CASE_INSTRUCTIONS,
      image: IMAGE_URLS.webPlate,
      stability: 6,
      inspects: 2,
      fragments: [
        { id: "borrowed-key-0", label: "ask" },
        { id: "borrowed-key-1", label: "copy" },
        { id: "borrowed-key-2", label: "enter" },
        { id: "borrowed-key-3", label: "direct" },
        { id: "borrowed-key-4", label: "return" },
        { id: "borrowed-key-5", label: "hallway" },
        { id: "borrowed-key-6", label: "spare" },
        { id: "borrowed-key-7", label: "apology" },
      ],
      solution: ["borrowed-key-0", "borrowed-key-1", "borrowed-key-2", "borrowed-key-3"],
      clue: "It starts as a favour and ends as access you no longer control.",
      clueSteps: [
        "The chain is causal, not just thematic.",
        "The copied key comes before the quiet entry.",
        "The ending is the moment access becomes direction.",
      ],
    },
    {
      id: "courtesy-lift",
      title: "The Web: Courtesy Lift",
      category: "transformation",
      excerpt:
        "A colleague keeps insisting on driving someone home after late shifts. A month later, every route through the city seems to begin in that same passenger seat.",
      objective: "Find the true four-part chain before the case buckles.",
      instructions: WEB_CASE_INSTRUCTIONS,
      image: IMAGE_URLS.webPlate,
      stability: 6,
      inspects: 2,
      fragments: [
        { id: "courtesy-lift-0", label: "offer" },
        { id: "courtesy-lift-1", label: "routine" },
        { id: "courtesy-lift-2", label: "dependence" },
        { id: "courtesy-lift-3", label: "reroute" },
        { id: "courtesy-lift-4", label: "headlights" },
        { id: "courtesy-lift-5", label: "station" },
        { id: "courtesy-lift-6", label: "invoice" },
        { id: "courtesy-lift-7", label: "umbrella" },
      ],
      solution: ["courtesy-lift-0", "courtesy-lift-1", "courtesy-lift-2", "courtesy-lift-3"],
      clue: "Convenience hardens into dependence.",
      clueSteps: [
        "Follow what the favour becomes over time.",
        "Habit matters more than location here.",
        "The last step is the route changing shape around you.",
      ],
    },
    {
      id: "shared-password",
      title: "The Web: Shared Password",
      category: "containment",
      excerpt:
        "A flatmate keeps offering to remember everyone's passwords. A month later, arguments end before they begin, as if someone already knows which door will need to open.",
      objective: "Find the true four-part chain before the case buckles.",
      instructions: WEB_CASE_INSTRUCTIONS,
      image: IMAGE_URLS.webPlate,
      stability: 6,
      inspects: 2,
      fragments: [
        { id: "shared-password-0", label: "share" },
        { id: "shared-password-1", label: "store" },
        { id: "shared-password-2", label: "hold" },
        { id: "shared-password-3", label: "gate" },
        { id: "shared-password-4", label: "router" },
        { id: "shared-password-5", label: "receipt" },
        { id: "shared-password-6", label: "teacup" },
        { id: "shared-password-7", label: "curtain" },
      ],
      solution: ["shared-password-0", "shared-password-1", "shared-password-2", "shared-password-3"],
      clue: "Once they hold the keys, they start shaping the route.",
      clueSteps: [
        "Think about something being placed inside another thing.",
        "The middle of the chain is about custody, not watching.",
        "The last fragment is the threshold that custody controls.",
      ],
    },
    {
      id: "committee-note",
      title: "The Web: Committee Note",
      category: "intensity progression",
      excerpt:
        "A volunteer agrees to take notes at a residents' meeting. The minutes that go out later make every loose suggestion read like a promise already made.",
      objective: "Find the true four-part chain before the case buckles.",
      instructions: WEB_CASE_INSTRUCTIONS,
      image: IMAGE_URLS.webPlate,
      stability: 6,
      inspects: 2,
      fragments: [
        { id: "committee-note-0", label: "note" },
        { id: "committee-note-1", label: "suggest" },
        { id: "committee-note-2", label: "assign" },
        { id: "committee-note-3", label: "compel" },
        { id: "committee-note-4", label: "agenda" },
        { id: "committee-note-5", label: "stapler" },
        { id: "committee-note-6", label: "quorum" },
        { id: "committee-note-7", label: "radiator" },
      ],
      solution: ["committee-note-0", "committee-note-1", "committee-note-2", "committee-note-3"],
      clue: "The trap is the point where a suggestion comes back as a duty.",
      clueSteps: [
        "Each step is more forceful than the last.",
        "A suggestion is softer than an assignment.",
        "The final fragment leaves no room to refuse.",
      ],
    },
    {
      id: "calendar-hold",
      title: "The Web: Calendar Hold",
      category: "temporal progression",
      excerpt:
        "A manager adds a tentative hold to someone's calendar. By the end of the month, every hour of the week feels pre-spent before the day begins.",
      objective: "Find the true four-part chain before the case buckles.",
      instructions: WEB_CASE_INSTRUCTIONS,
      image: IMAGE_URLS.webPlate,
      stability: 6,
      inspects: 2,
      fragments: [
        { id: "calendar-hold-0", label: "tentative" },
        { id: "calendar-hold-1", label: "weekly" },
        { id: "calendar-hold-2", label: "standing" },
        { id: "calendar-hold-3", label: "owned" },
        { id: "calendar-hold-4", label: "reminder" },
        { id: "calendar-hold-5", label: "corridor" },
        { id: "calendar-hold-6", label: "reschedule" },
        { id: "calendar-hold-7", label: "coffee" },
      ],
      solution: ["calendar-hold-0", "calendar-hold-1", "calendar-hold-2", "calendar-hold-3"],
      clue: "The pressure lies in how a single placeholder becomes permanent time.",
      clueSteps: [
        "This chain moves through time, not through force.",
        "A repeated block comes before a fixed one.",
        "The end is time no longer feeling available.",
      ],
    },
  ],
};
