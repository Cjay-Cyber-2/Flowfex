export const pricingTiers = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'For trying out Flowfex',
    features: [
      '100 orchestration steps/month',
      '1 connected agent',
      'Map & Flow modes',
      'Community support'
    ],
    cta: 'Start Free',
    ctaStyle: 'ghost'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    description: 'For professional developers',
    features: [
      'Unlimited orchestration steps',
      'Unlimited agents',
      'All modes (Map, Flow, Live)',
      'Priority support',
      'Advanced analytics',
      'Team collaboration'
    ],
    cta: 'Start Pro Trial',
    ctaStyle: 'primary',
    featured: true
  },
  {
    id: 'team',
    name: 'Team',
    price: 199,
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'SSO & SAML',
      'Audit logs',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee'
    ],
    cta: 'Contact Sales',
    ctaStyle: 'secondary'
  }
];

export const comparisonFeatures = [
  { name: 'Orchestration steps', free: '100/month', pro: 'Unlimited', team: 'Unlimited' },
  { name: 'Connected agents', free: '1', pro: 'Unlimited', team: 'Unlimited' },
  { name: 'Map mode', free: true, pro: true, team: true },
  { name: 'Flow mode', free: true, pro: true, team: true },
  { name: 'Live mode', free: false, pro: true, team: true },
  { name: 'Advanced analytics', free: false, pro: true, team: true },
  { name: 'Team collaboration', free: false, pro: true, team: true },
  { name: 'Priority support', free: false, pro: true, team: true },
  { name: 'SSO & SAML', free: false, pro: false, team: true },
  { name: 'Audit logs', free: false, pro: false, team: true },
  { name: 'Custom integrations', free: false, pro: false, team: true },
  { name: 'SLA guarantee', free: false, pro: false, team: true }
];
