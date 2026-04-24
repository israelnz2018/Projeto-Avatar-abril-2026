import { getUserProfile } from '../components/UserProfile';

export function useUserTheme() {
  const profile = getUserProfile();
  return {
    headerColor: profile.headerColor || '#1e3a5f',
    headerTextColor: profile.headerTextColor || '#ffffff',
    companyLogoUrl: profile.companyLogoUrl || '',
    companyName: profile.company || '',
  };
}
