import type { Game } from '../types/game';

export interface PledgeTier {
  name: 'Supporter' | 'Collector' | 'Founder';
  price: number;
  availability: string;
  benefits: string[];
}

export interface CampaignUpdate {
  date: string;
  title: string;
  body: string;
}

export interface DeveloperProfile {
  name: string;
  history: string;
  location: string;
  website: string;
  social: string;
}

export interface Campaign {
  goal: number;
  raised: number;
  backers: number;
  delivery: string;
  stretchGoals: string[];
  tiers: PledgeTier[];
  recentSupporters: string[];
  updates: CampaignUpdate[];
  developer: DeveloperProfile;
  risks: string;
  faqs: Array<{ question: string; answer: string }>;
  discussion: Array<{ author: string; message: string }>;
}

const campaignDefaults: Campaign = {
  goal: 25000,
  raised: 18750,
  backers: 247,
  delivery: 'October 2026',
  stretchGoals: ['$30,000 — deluxe scenario booklet', '$40,000 — cooperative mode expansion'],
  tiers: [
    {
      name: 'Supporter',
      price: 15,
      availability: 'Unlimited',
      benefits: ['Digital rulebook', 'Name in the credits'],
    },
    {
      name: 'Collector',
      price: 45,
      availability: '312 remaining',
      benefits: ['Everything in Supporter', 'Physical game box', 'Collector art cards'],
    },
    {
      name: 'Founder',
      price: 90,
      availability: '48 remaining',
      benefits: ['Everything in Collector', 'Signed founder edition', 'Private playtest invitation'],
    },
  ],
  recentSupporters: ['Maya R.', 'Jordan K.', 'Samir P.', 'Alex T.'],
  updates: [
    { date: 'September 8, 2026', title: 'Prototype playtest complete', body: 'Our latest table test confirmed the new solo scenario is ready for layout.' },
    { date: 'August 26, 2026', title: 'Meet the illustrators', body: 'The art team shared three environment studies from the world of this campaign.' },
  ],
  developer: {
    name: 'CodeForge Studios',
    history: 'A small, independent team making thoughtful strategy games since 2019.',
    location: 'Portland, Oregon',
    website: 'https://example.com',
    social: '@codeforgestudios',
  },
  risks: 'This is a static demo campaign. Delivery estimates may change while manufacturing and fulfillment are scheduled. Funds are simulated and no payment is collected.',
  faqs: [
    { question: 'When will my reward arrive?', answer: 'Rewards are estimated to ship in October 2026, with digital rewards delivered first.' },
    { question: 'Can I change my pledge?', answer: 'In this demo, you can submit another simulated pledge at any time. A real campaign would provide a pledge manager.' },
    { question: 'Are payments real?', answer: 'No. This experience validates the form locally and never sends payment information anywhere.' },
  ],
  discussion: [
    { author: 'Rina', message: 'The solo scenario sounds fantastic. Will it work for new players?' },
    { author: 'Developer', message: 'Absolutely — the tutorial scenario is designed as a gentle first game.' },
  ],
};

/** Returns deterministic campaign content for a game detail page. */
export function getCampaign(_game: Game): Campaign {
  return campaignDefaults;
}
