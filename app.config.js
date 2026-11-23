const advertisingIdPermission = 'com.google.android.gms.permission.AD_ID';

module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_ADS_ENABLED !== 'false') return config;

  return {
    ...config,
    android: {
      ...config.android,
      blockedPermissions: [
        ...(config.android?.blockedPermissions ?? []),
        advertisingIdPermission,
      ],
    },
    plugins: config.plugins.map(plugin => {
      if (!Array.isArray(plugin)) return plugin;

      const [name, options] = plugin;
      if (name === 'react-native-google-mobile-ads') {
        const pausedOptions = { ...options, delayAppMeasurementInit: true };
        delete pausedOptions.userTrackingUsageDescription;
        return [name, pausedOptions];
      }
      if (name === 'expo-tracking-transparency') {
        return [name, { ...options, userTrackingPermission: false }];
      }
      return plugin;
    }),
  };
};
