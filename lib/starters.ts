// Story starters: ready-made 24-page books (cover + dedication + 22 story pages).
// Each line of text may use {name}, {they}, {them}, {their}, {themself} (capitalize for sentence starts).
// To add a starter, add an entry to STARTERS — no other code changes needed.
import {
  Book, CharacterEl, Expression, Hero, ImageEl, Page, Rig, TextEl,
  newCharacter, newId, newPage, newText, pageDims, POSES, DEFAULT_HERO, fillTokens,
} from "./book";

type Bg = "meadow" | "bedroom" | "forest" | "beach" | "space" | "ocean" | "town" | "winter" | "classroom" | "garden" | "castle" | "rainy-park";
type Sticker = "sun" | "tree" | "balloons" | "cottage" | "cloud-rainbow" | "treasure" | "sailboat" | "books";
type PoseId = keyof typeof POSES;

// [background, hero pose, text, options]
type Beat = [Bg, PoseId, string, { face?: Expression; friend?: Rig; friendPose?: PoseId; sticker?: Sticker }?];

export interface Starter {
  id: string;
  title: string; // may use {Name}
  blurb: string;
  emoji: string;
  cover: Bg;
  dedication: string;
  beats: Beat[];
}

const S = (s: Partial<NonNullable<Beat[3]>>) => s;

export const STARTERS: Starter[] = [
  {
    id: "birthday",
    title: "{Name}'s Big Birthday",
    blurb: "A party day full of friends, treasure and one secret wish.",
    emoji: "🎂",
    cover: "meadow",
    dedication: "Happy birthday, {name}! This story was made just for you.",
    beats: [
      ["bedroom", "wave", "This morning, {name} woke up with a wiggle and a grin."],
      ["bedroom", "jump", "Today was not just any day. Today was {their} birthday!", S({ face: "laughing" })],
      ["town", "run", "{They} raced down Main Street, counting every step to the party."],
      ["town", "point", "\"Look!\" {they} cried. A bunch of balloons floated by.", S({ sticker: "balloons", face: "surprised" })],
      ["meadow", "cheer", "In the meadow, Bear was waiting with a very big smile.", S({ friend: "bear", friendPose: "wave" })],
      ["meadow", "dance", "Bunny hopped in wearing a hat that was far too tall.", S({ friend: "bunny", friendPose: "dance", face: "laughing" })],
      ["garden", "think", "\"What should we do first?\" {name} wondered."],
      ["garden", "kick", "They played kickball until the sun was high.", S({ sticker: "sun" })],
      ["forest", "run", "Then they followed a twisty path into the forest.", S({ friend: "bear", friendPose: "run" })],
      ["forest", "point", "Behind a tree sat a treasure chest with {name}'s name on it!", S({ sticker: "treasure", face: "surprised" })],
      ["forest", "hug", "Inside were drawings from everyone who loves {them}."],
      ["beach", "jump", "At the beach, {they} jumped every wave. One, two, three!", S({ sticker: "sailboat", face: "laughing" })],
      ["beach", "sit", "{They} built a sandcastle with twelve tall towers."],
      ["castle", "cheer", "From the castle hill, the whole world looked like a present."],
      ["castle", "wave", "\"Make a wish,\" whispered Bunny.", S({ friend: "bunny", friendPose: "point" })],
      ["meadow", "think", "{Name} closed {their} eyes and wished a secret wish.", S({ face: "sleepy" })],
      ["rainy-park", "dance", "Then the rain came! {They} danced in every puddle.", S({ face: "laughing" })],
      ["rainy-park", "point", "And after the rain came a rainbow, just for {them}.", S({ sticker: "cloud-rainbow" })],
      ["town", "wave", "Back home, friends waved from every window."],
      ["bedroom", "cheer", "There was cake and singing and much too much frosting.", S({ sticker: "balloons", face: "laughing" })],
      ["bedroom", "sit", "When the party ended, {name} yawned the happiest yawn.", S({ face: "sleepy" })],
      ["bedroom", "hug", "Happy birthday, {name}. You are loved, today and every day.", S({ face: "sleepy" })],
    ],
  },
  {
    id: "first-day",
    title: "{Name} Goes to School",
    blurb: "First-day butterflies turn into a brand-new friend.",
    emoji: "🎒",
    cover: "classroom",
    dedication: "For {name}, the bravest new student we know.",
    beats: [
      ["bedroom", "shy", "Tomorrow is the first day of school, and {name} has butterflies."],
      ["bedroom", "think", "\"What if I don't know anyone?\" {they} whispered.", S({ face: "sad" })],
      ["bedroom", "hug", "Bear gave {them} a squeeze. \"Everyone is new on day one.\"", S({ friend: "bear", friendPose: "hug" })],
      ["town", "wave", "In the morning, {name} walked to school with a brave heart."],
      ["town", "point", "There it was! A school with a bright red door.", S({ sticker: "books", face: "surprised" })],
      ["classroom", "shy", "The classroom smelled like crayons and new paper."],
      ["classroom", "wave", "A friendly bunny waved from the very next desk.", S({ friend: "bunny", friendPose: "wave" })],
      ["classroom", "sit", "\"Want to share my markers?\" asked Bunny.", S({ friend: "bunny", friendPose: "point" })],
      ["classroom", "point", "{They} drew a dragon. Bunny drew a dragon's grandma.", S({ face: "laughing" })],
      ["classroom", "think", "The teacher read a story about a whale who could sing."],
      ["garden", "run", "At recess, everyone ran to the big green field.", S({ friend: "bunny", friendPose: "run" })],
      ["garden", "kick", "{Name} kicked the ball higher than the fence!", S({ face: "surprised" })],
      ["garden", "cheer", "Everyone cheered. {They} felt ten feet tall.", S({ face: "laughing" })],
      ["meadow", "sit", "At lunch, they traded apple slices and silly jokes.", S({ friend: "bunny", friendPose: "sit", sticker: "sun" })],
      ["classroom", "think", "After lunch came numbers. One, two, three, so many!"],
      ["classroom", "point", "{They} counted all the way to one hundred.", S({ face: "surprised" })],
      ["rainy-park", "dance", "On the way out, a puddle was waiting to be jumped in.", S({ friend: "bunny", friendPose: "jump", face: "laughing" })],
      ["town", "wave", "\"See you tomorrow!\" called Bunny."],
      ["town", "run", "{Name} ran all the way home to tell the whole story."],
      ["bedroom", "cheer", "\"I made a friend!\" {they} told Bear.", S({ friend: "bear", friendPose: "cheer" })],
      ["bedroom", "sit", "The butterflies were gone. In their place was a happy, sleepy feeling.", S({ face: "sleepy" })],
      ["bedroom", "hug", "Tomorrow will be day two, and {name} can't wait.", S({ face: "sleepy" })],
    ],
  },
  {
    id: "new-baby",
    title: "{Name} Becomes a Big Sibling",
    blurb: "Getting ready for a new baby, and finding out love grows.",
    emoji: "🍼",
    cover: "garden",
    dedication: "For {name}, our wonderful big sibling.",
    beats: [
      ["bedroom", "think", "Something big was coming to {name}'s family. Something very small."],
      ["bedroom", "stand", "A baby! {Name} was going to be a big sibling.", S({ face: "surprised" })],
      ["garden", "think", "\"Will there still be enough hugs for me?\" {they} wondered.", S({ face: "sad" })],
      ["garden", "hug", "\"Love isn't like cake,\" said Bear. \"It grows when you share it.\"", S({ friend: "bear", friendPose: "hug" })],
      ["town", "point", "{They} helped pick out the tiniest socks in the whole store.", S({ sticker: "balloons" })],
      ["bedroom", "sit", "{They} chose a soft blanket and a song to sing."],
      ["bedroom", "stand", "{They} picked {their} favorite book to read to the baby.", S({ sticker: "books" })],
      ["meadow", "run", "Then one day, the baby came home!", S({ face: "laughing" })],
      ["bedroom", "shy", "The baby was very small and very loud.", S({ face: "surprised" })],
      ["bedroom", "dance", "When the baby sneezed, {name} laughed so hard {they} sneezed too.", S({ face: "laughing" })],
      ["bedroom", "think", "Sometimes the grown-ups were busy and tired."],
      ["garden", "sit", "{Name} felt a little left out, so {they} told Bunny.", S({ friend: "bunny", friendPose: "sit", face: "sad" })],
      ["garden", "hug", "\"Big siblings are important,\" said Bunny. \"You're a teacher now.\"", S({ friend: "bunny", friendPose: "hug" })],
      ["bedroom", "wave", "So {name} showed the baby how to wave."],
      ["bedroom", "dance", "{They} showed the baby how to dance.", S({ face: "laughing" })],
      ["meadow", "cheer", "{They} showed the baby the sky, the trees and the sun.", S({ sticker: "sun" })],
      ["rainy-park", "wave", "And when the baby cried, {name} sang the special song."],
      ["rainy-park", "hug", "The crying stopped. The baby smiled, just at {them}."],
      ["town", "cheer", "Everyone said, \"What a wonderful big sibling!\""],
      ["bedroom", "hug", "There were still plenty of hugs. More than ever, in fact."],
      ["bedroom", "sit", "At night, {name} tucked the baby's blanket in, just right.", S({ face: "sleepy" })],
      ["bedroom", "hug", "Our family grew by one, and so did all our love.", S({ face: "sleepy" })],
    ],
  },
  {
    id: "bedtime",
    title: "{Name} and the Starlight Ride",
    blurb: "A dreamy trip through space, the sea and a cloud castle.",
    emoji: "🌙",
    cover: "space",
    dedication: "For {name}. Sweet dreams, little star.",
    beats: [
      ["bedroom", "sit", "When the lights go out, {name}'s room starts to glow.", S({ face: "sleepy" })],
      ["bedroom", "point", "A star tapped on the window. \"Want to go on an adventure?\"", S({ face: "surprised" })],
      ["space", "jump", "Up, up, up {name} floated, past the moon and into the stars.", S({ face: "laughing" })],
      ["space", "wave", "A moon bunny waved hello from a giant ringed planet.", S({ friend: "bunny", friendPose: "wave" })],
      ["space", "dance", "They danced on the rings like a merry-go-round.", S({ friend: "bunny", friendPose: "dance", face: "laughing" })],
      ["space", "point", "\"Look, a comet!\" {name} pointed as it zoomed by.", S({ face: "surprised" })],
      ["ocean", "jump", "Splash! The comet dropped them into the sea of dreams."],
      ["ocean", "stand", "Bubbles giggled all around {them}.", S({ face: "laughing" })],
      ["ocean", "wave", "Coral waved, and fish made shapes like hearts."],
      ["ocean", "point", "At the bottom sat a chest full of shiny dreams.", S({ sticker: "treasure", face: "surprised" })],
      ["ocean", "think", "{Name} picked the dream that felt the warmest."],
      ["castle", "cheer", "Pop! Now {they} stood beside a castle made of clouds."],
      ["castle", "wave", "A sleepy bear opened the gate. \"Welcome, dreamer.\"", S({ friend: "bear", friendPose: "wave" })],
      ["castle", "sit", "They sipped warm milk with honey from tiny cups.", S({ friend: "bear", friendPose: "sit" })],
      ["forest", "run", "Then through a forest where the trees hummed lullabies."],
      ["forest", "stand", "The owls whispered, \"Shhh, shhh, time to rest.\"", S({ face: "sleepy" })],
      ["winter", "jump", "Down a snowy hill they slid on a moonbeam sled.", S({ face: "laughing" })],
      ["winter", "dance", "Snowflakes landed on {name}'s nose and tickled.", S({ face: "laughing" })],
      ["meadow", "sit", "A cloud floated down, soft as a pillow.", S({ sticker: "cloud-rainbow", face: "sleepy" })],
      ["meadow", "stand", "{Name} climbed on, and the cloud carried {them} home.", S({ face: "sleepy" })],
      ["bedroom", "sit", "Back in bed, the star blinked goodnight.", S({ face: "sleepy" })],
      ["bedroom", "hug", "Goodnight, {name}. Dream big, dream bright.", S({ face: "sleepy" })],
    ],
  },
  {
    id: "grandparents",
    title: "{Name} and the Love That Travels",
    blurb: "For grandparents far away: love finds its way home.",
    emoji: "💌",
    cover: "beach",
    dedication: "For {name}, from Grandma and Grandpa, with all our love.",
    beats: [
      ["bedroom", "think", "{Name}'s grandparents live far, far away."],
      ["bedroom", "shy", "Sometimes {name} misses them so much {their} heart feels tight.", S({ face: "sad" })],
      ["garden", "hug", "\"Love can travel anywhere,\" said Bear. \"Let's find out how.\"", S({ friend: "bear", friendPose: "hug" })],
      ["garden", "point", "\"The same sun shines on Grandma and Grandpa,\" said Bear.", S({ friend: "bear", friendPose: "point", sticker: "sun" })],
      ["meadow", "wave", "So {name} waved at the sun, and the sun waved back.", S({ face: "laughing" })],
      ["beach", "point", "Love can sail across the sea like a little boat.", S({ sticker: "sailboat" })],
      ["beach", "sit", "{They} drew a picture of {themself} waving hello."],
      ["town", "run", "They mailed it at the post office on Main Street."],
      ["town", "think", "\"How long will it take?\" {name} asked."],
      ["rainy-park", "sit", "While {they} waited, it rained and rained.", S({ face: "sad" })],
      ["rainy-park", "point", "Then a rainbow stretched out, as if it reached Grandma's house.", S({ sticker: "cloud-rainbow", face: "surprised" })],
      ["bedroom", "stand", "Ring, ring! It was Grandpa on the phone!", S({ face: "surprised" })],
      ["bedroom", "dance", "He had the letter. He said the drawing made him laugh all day.", S({ face: "laughing" })],
      ["bedroom", "dance", "{Name} danced a happy dance right there on the rug.", S({ face: "laughing" })],
      ["garden", "cheer", "\"We're coming to visit!\" said Grandma."],
      ["town", "wave", "{Name} counted the days. Ten, nine, eight..."],
      ["town", "jump", "...three, two, one!", S({ face: "laughing" })],
      ["meadow", "hug", "And then, the biggest hug in the whole world."],
      ["castle", "cheer", "They went everywhere together, even to the castle on the hill."],
      ["beach", "sit", "They built sandcastles and told old stories.", S({ friend: "bear", friendPose: "sit" })],
      ["bedroom", "stand", "When it was time to say goodbye, {name} wasn't sad for long.", S({ face: "sleepy" })],
      ["bedroom", "hug", "Because love travels anywhere, and it always finds its way to {name}.", S({ face: "sleepy" })],
    ],
  },
  {
    id: "holiday",
    title: "{Name}'s Winter Wonder",
    blurb: "Snow friends, glowing trees and the best gift of all.",
    emoji: "❄️",
    cover: "winter",
    dedication: "For {name}. Happy holidays, with love.",
    beats: [
      ["winter", "point", "{Name} looked outside. The whole world had turned white!", S({ face: "surprised" })],
      ["winter", "jump", "{They} pulled on boots and jumped into the snow.", S({ face: "laughing" })],
      ["winter", "dance", "Bear was already making snow angels.", S({ friend: "bear", friendPose: "jump", face: "laughing" })],
      ["winter", "kick", "They rolled a snowball bigger than {name}."],
      ["winter", "point", "\"Let's make a snow friend!\" {they} said."],
      ["winter", "cheer", "Their snow friend had a carrot nose and a very wide smile.", S({ friend: "bear", friendPose: "cheer" })],
      ["town", "wave", "In town, every window twinkled with lights."],
      ["town", "point", "There was a little shop that smelled like cinnamon.", S({ sticker: "cottage" })],
      ["town", "think", "{Name} wanted to find a gift for everyone {they} loved."],
      ["town", "hug", "{They} picked a scarf, a song, and a jar of homemade cookies."],
      ["forest", "run", "On the way home, the forest was quiet and sparkly."],
      ["forest", "point", "A tree was covered in tiny glowing lights.", S({ sticker: "tree", face: "surprised" })],
      ["forest", "wave", "Bunny peeked out. \"Do you want to help us decorate?\"", S({ friend: "bunny", friendPose: "wave" })],
      ["forest", "dance", "They hung pinecones and berries on every branch.", S({ friend: "bunny", friendPose: "dance" })],
      ["meadow", "cheer", "When they finished, the whole forest glowed.", S({ face: "laughing" })],
      ["bedroom", "sit", "At home, everyone gathered around for stories.", S({ sticker: "books" })],
      ["bedroom", "dance", "Grandpa told the one about the reindeer who sneezed.", S({ face: "laughing" })],
      ["bedroom", "hug", "{Name} gave each gift with a great big hug."],
      ["bedroom", "cheer", "There was music, and food, and too many cookies.", S({ sticker: "balloons", face: "laughing" })],
      ["winter", "wave", "Outside, the snow friend seemed to wave goodnight."],
      ["bedroom", "sit", "{Name} curled up warm, with cocoa and a blanket.", S({ face: "sleepy" })],
      ["bedroom", "hug", "The best gift of all was being together.", S({ face: "sleepy" })],
    ],
  },
];

const bgSrc = (b: Bg) => `/templates/backgrounds/${b}.jpg`;
const stickerSrc = (s: Sticker) => `/templates/elements/${s}.png`;
// Natural sticker aspect ratios (height / width) so they never stretch.
const STICKER_RATIO: Record<Sticker, number> = {
  sun: 1, tree: 1.15, balloons: 1.6, cottage: 1, "cloud-rainbow": 0.78, treasure: 0.95, sailboat: 1.1, books: 1.05,
};
const HERO_X = [0.36, 0.6, 0.42, 0.66, 0.32, 0.55];

function hero(x: number, y: number, pose: PoseId, face: Expression = "happy", flip = false): CharacterEl {
  const c = newCharacter("kid", x, y);
  c.isHero = true;
  c.pose = { ...POSES[pose].pose };
  c.expression = face;
  c.flipX = flip;
  return c;
}

function storyText(text: string, w: number, h: number, safe: number): TextEl {
  const t = newText(text, { fontFamily: "Andika", fontSize: 40, fill: "#2A363B", backdrop: true, lineHeight: 1.25 }, w);
  t.width = w * 0.78;
  t.x = (w - t.width) / 2 - 22; // account for the backdrop's padding
  t.y = h - safe - 170;
  return t;
}

function sticker(s: Sticker, w: number, safe: number, left: boolean): ImageEl {
  const width = w * 0.22;
  return {
    id: newId(), type: "image", src: stickerSrc(s),
    width, height: width * STICKER_RATIO[s],
    x: left ? safe + 10 : w - safe - width - 10, y: safe + 10, rotation: left ? -6 : 6,
  };
}

/** Build a complete, personalized 24-page book from a starter. */
export function buildFromStarter(starterId: string, h: Hero = DEFAULT_HERO, trim = "sq85"): Book {
  const st = STARTERS.find((s) => s.id === starterId);
  if (!st) throw new Error("Unknown starter");
  const d = pageDims(trim);
  const W = d.width, H = d.height;
  const groundY = H * 0.56;

  const cover = newPage(bgSrc(st.cover));
  cover.elements.push(
    newText(st.title, { y: d.safe + 10, fontSize: 84, fontFamily: "Chewy", fill: "#FFFFFF", outline: "#6C5B7B", width: W * 0.86 }, W),
    hero(W / 2, groundY + 20, "cheer", "laughing"),
  );

  const dedication = newPage();
  dedication.bgColor = "#FFF8EE";
  const frame: ImageEl = {
    id: newId(), type: "image", src: "/templates/elements/photo-frame.png", slot: "heroPhoto",
    width: W * 0.42, height: W * 0.42, x: W * 0.29, y: H * 0.16, rotation: -3,
  };
  dedication.elements.push(
    frame,
    newText(st.dedication, { y: H * 0.66, fontSize: 46, fontFamily: "Patrick Hand", fill: "#6C5B7B", width: W * 0.74 }, W),
  );

  const story: Page[] = st.beats.map(([bg, pose, text, opt = {}], i) => {
    const p = newPage(bgSrc(bg));
    const hx = W * HERO_X[i % HERO_X.length];
    const friendLeft = hx > W / 2;
    if (opt.sticker) p.elements.push(sticker(opt.sticker, W, d.safe, hx > W / 2));
    if (opt.friend) {
      const f = newCharacter(opt.friend, friendLeft ? W * 0.24 : W * 0.76, groundY + 6);
      f.pose = { ...POSES[opt.friendPose ?? "wave"].pose };
      f.scale = 0.9;
      f.flipX = !friendLeft;
      p.elements.push(f);
    }
    p.elements.push(hero(hx, groundY, pose, opt.face, friendLeft && !!opt.friend));
    p.elements.push(storyText(text, W, H, d.safe));
    return p;
  });

  return {
    id: newId(),
    title: fillTokens(st.title, h.name ? h : { ...h, name: "My" }).replace(/^My's /, "My "),
    author: "",
    trim,
    mode: "keepsake",
    pages: [cover, dedication, ...story],
    updatedAt: Date.now(),
    usesAI: false,
    hero: h,
    starter: st.id,
  };
}
