// Where finished books can go. "api" = we can automate it; "upload" = we hand the
// author perfectly-formatted files plus a checklist and deep link.

export interface Publisher {
  id: string;
  name: string;
  url: string;
  kind: "print" | "ebook" | "both";
  integration: "api" | "upload";
  bestFor: string;
  notes: string;
}

export const PUBLISHERS: Publisher[] = [
  {
    id: "kdp",
    name: "Amazon KDP",
    url: "https://kdp.amazon.com",
    kind: "both",
    integration: "upload",
    bestFor: "Selling on Amazon (largest reach)",
    notes:
      "No public API. Export the print-ready interior + cover PDFs and upload. You must tick the AI-generated content box if any AI art is used.",
  },
  {
    id: "lulu",
    name: "Lulu (Print API)",
    url: "https://developers.lulu.com",
    kind: "print",
    integration: "api",
    bestFor: "One-off personalized copies shipped to a customer",
    notes: "Free REST API; you pay print + shipping per order. Powers our 'Order a printed copy' button.",
  },
  {
    id: "ingramspark",
    name: "IngramSpark",
    url: "https://www.ingramspark.com",
    kind: "both",
    integration: "upload",
    bestFor: "Bookstores and libraries",
    notes: "Wide wholesale distribution. Use alongside KDP; disable Ingram's Amazon channel if you do.",
  },
  {
    id: "bnpress",
    name: "Barnes & Noble Press",
    url: "https://press.barnesandnoble.com",
    kind: "both",
    integration: "upload",
    bestFor: "Barnes & Noble online + stores",
    notes: "Has a title limit and minimum list price rules — check before uploading.",
  },
  {
    id: "d2d",
    name: "Draft2Digital",
    url: "https://draft2digital.com",
    kind: "both",
    integration: "upload",
    bestFor: "Ebooks everywhere from one upload (Apple, Kobo, libraries)",
    notes: "Print runs through Ingram's network.",
  },
  {
    id: "blurb",
    name: "Blurb",
    url: "https://www.blurb.com",
    kind: "print",
    integration: "upload",
    bestFor: "Premium photo-quality hardcovers",
    notes: "Great for keepsakes; higher unit cost.",
  },
  {
    id: "bookbaby",
    name: "BookBaby",
    url: "https://www.bookbaby.com",
    kind: "both",
    integration: "upload",
    bestFor: "Short print runs + full-service packages",
    notes: "Good for authors who want a box of books for events/schools.",
  },
  {
    id: "apple",
    name: "Apple Books",
    url: "https://authors.apple.com",
    kind: "ebook",
    integration: "upload",
    bestFor: "Fixed-layout picture-book ebooks on iPad",
    notes: "Requires AI disclosure like KDP.",
  },
  {
    id: "kobo",
    name: "Kobo Writing Life",
    url: "https://www.kobo.com/writinglife",
    kind: "ebook",
    integration: "upload",
    bestFor: "International ebook readers",
    notes: "",
  },
  {
    id: "gplay",
    name: "Google Play Books",
    url: "https://play.google.com/books/publish",
    kind: "ebook",
    integration: "upload",
    bestFor: "Android readers",
    notes: "",
  },
];
