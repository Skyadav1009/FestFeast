import { EventMode, EventStatus } from "./types";

export const APP_NAME = "DelhiPulse";

export const DEFAULT_TAGS = [
  "Music Fest", "College Fest", "Food & Drink", "Star Night", "Cultural", 
  "Tech Fest", "Comedy", "EDM", "Workshop", "Theatre", "North Campus", "South Campus"
];

export const MOCK_ADMIN_CREDENTIALS = {
  username: "admin",
  password: "password123"
};

export const INITIAL_EVENTS_SEED = [
  {
    _id: "seed_1",
    title: "The Grub Fest 2025",
    slug: "the-grub-fest-2025",
    organizer: "Grub Asia",
    description: "Delhi's premier food festival is back! Experience the best cuisines, live music, and carnival vibes.\n\n### Highlights\n* 100+ Food Stalls\n* Live performance by Divine\n* Cocktail Bar",
    mode: EventMode.OFFLINE,
    location: "Jawaharlal Nehru Stadium, Delhi",
    startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    bookingDeadline: new Date(Date.now() + 86400000 * 4).toISOString(),
    entryFee: "₹499 onwards",
    tags: ["Food & Drink", "Music Fest", "Star Night"],
    ticketLink: "https://example.com/tickets",
    sourceUrl: "https://example.com/grub-fest",
    sourceType: "manual",
    status: EventStatus.PUBLISHED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "seed_2",
    title: "Crossroads 2025 - Star Night",
    slug: "crossroads-2025",
    organizer: "SRCC Student Union",
    description: "The biggest cultural fest of North Campus. Join us for 3 days of euphoria.",
    mode: EventMode.OFFLINE,
    location: "SRCC Sports Complex, North Campus",
    startDate: new Date(Date.now() + 86400000 * 15).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 18).toISOString(),
    bookingDeadline: new Date(Date.now() + 86400000 * 14).toISOString(),
    entryFee: "Free (Student ID required)",
    tags: ["College Fest", "Cultural", "North Campus", "Star Night"],
    ticketLink: "https://example.com/register-srcc",
    sourceUrl: "https://example.com/crossroads",
    sourceType: "manual",
    status: EventStatus.PUBLISHED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "seed_3",
    title: "Comic Con Delhi",
    slug: "comic-con-delhi",
    organizer: "Comic Con India",
    description: "The best weekend of the year for pop-culture geeks!",
    mode: EventMode.OFFLINE,
    location: "NSIC Grounds, Okhla",
    startDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    endDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    bookingDeadline: new Date(Date.now() - 86400000 * 6).toISOString(),
    entryFee: "₹799",
    tags: ["Cultural", "Workshop"],
    ticketLink: "https://example.com/comiccon",
    sourceUrl: "https://example.com/comic-con",
    sourceType: "manual",
    status: EventStatus.EXPIRED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];
