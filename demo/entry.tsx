// Standalone demo: the real editor, no login/payments. Built by scripts/build-demo.mjs.
(globalThis as { __ASSET_BASE__?: string }).__ASSET_BASE__ = "./";
import { createRoot } from "react-dom/client";
import Editor from "@/components/editor/Editor";
import { useStore } from "@/lib/store";
import { PLANS } from "@/lib/plans";
import { buildFromStarter } from "@/lib/starters";
import { DEFAULT_HERO } from "@/lib/book";

// Opens on a real story starter, personalized, the way a new book starts in the app.
const s = useStore.getState();
const book = buildFromStarter("birthday", { ...DEFAULT_HERO, name: "Maya", pronoun: "she", hair: "curly", skin: "#B97A50" });
s.loadBook(book);
s.openBook(book.id);

const plan = { ...PLANS[1] }; // demo runs with Storyteller features unlocked
createRoot(document.getElementById("root")!).render(
  <Editor
    plan={plan}
    shelfHref="#"
    pricingHref="#"
    services={{
      generateImage: async () => ({
        error: "AI painting switches on once the live site has an image API key — in the real app this creates a brand-new illustration.",
      }),
    }}
  />,
);
