/** Post-auth destination: dashboard with pricing wall for free tier / quota upgrade path. */
export function postAuthDashboardLocation(reason = 'account_upgrade') {
  return {
    pathname: '/dashboard',
    search: '?upgrade=1',
    state: { showPricingWall: true, reason },
  };
}

export function postAuthSocialCallbackPath() {
  return '/dashboard?upgrade=1';
}
